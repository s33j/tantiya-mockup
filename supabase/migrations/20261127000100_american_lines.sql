-- Automatic American lines and real bets (decided Nov 27, 2026).
--
-- Replaces LMSR pricing and the 10% stake fee. Each outcome of a two-outcome
-- market (Yes/No or over/under) carries an American line with the house margin
-- built in, for example Yes −150 / No +130. Lines open from data and move
-- automatically as bets come in; staff don't set them by hand.
--
-- A bet fixes its odds, stake and "to win" when it is placed. Placing one moves
-- the stake from Available to In play through the coin ledger, then moves the
-- line. If the line changed since the bettor last saw it, nothing is placed and
-- the new line comes back so the bet slip can show "Line moved".
--
-- PLACEHOLDERS until the team decides (Decisions board, mockup sprint Nov 2026):
--   margin            = whatever each market's opening line carries
--   line-move rule    = private.line_move_coins_per_point(): coins staked on a
--                       side that raise its implied chance by 1 point
--   "Line moved"      = shown on any change of the line
--   max stake         = none beyond the user's own stake limits
-- Settlement (paying out, voids, pushes) is not part of this migration.

-- Betting so far was a browser-only demo, so no bet rows should exist. Stop
-- rather than drop bet columns that hold data.
do $$
begin
  if exists (select 1 from public.bets) then
    raise exception 'american_lines expects no bets: betting was browser-only until now';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Odds maths
-- ---------------------------------------------------------------------------

-- Implied chance of an American line, margin included: −150 → 0.6, +130 → 0.4348.
create function private.chance_from_american(p_odds integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_odds < 0 then (-p_odds)::numeric / (-p_odds + 100)
    else 100::numeric / (p_odds + 100)
  end;
$$;

-- The American line for an implied chance, rounded to the nearest 5 (0.6 → −150).
-- Lines are never between −100 and +100.
create function private.american_from_chance(p_chance numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_chance >= 0.5 then -(round(100 * p_chance / (1 - p_chance) / 5) * 5)::integer
    else (round(100 * (1 - p_chance) / p_chance / 5) * 5)::integer
  end;
$$;

-- What a stake wins on top of being returned, in whole coins rounded down
-- (mockup choice, needs confirmation). Amounts in minor units.
create function private.to_win_minor(p_stake_minor bigint, p_odds integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select (
    case
      when p_odds > 0 then p_stake_minor * p_odds / 100
      else p_stake_minor * 100 / (-p_odds)
    end / 100
  ) * 100;
$$;

-- PLACEHOLDER line-move rule: every 1,000 coins staked on a side raises its
-- implied chance by 1 point.
create function private.line_move_coins_per_point()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 1000;
$$;

revoke all on function private.chance_from_american, private.american_from_chance,
  private.to_win_minor, private.line_move_coins_per_point from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Markets and outcomes
-- ---------------------------------------------------------------------------

alter table public.markets
  drop column liquidity_b,
  add column line numeric(12, 4),
  -- Over/under markets need a line; other types must not have one.
  add constraint markets_line_only_for_over_under check ((type::text = 'over_under') = (line is not null));

comment on column public.markets.line is 'Over/under line, e.g. 3.5 for "over or under 3.5%".';

alter table public.market_outcomes
  add column opening_odds integer,
  add column odds integer;

-- Any outcomes already in the table open at their old chance, with no margin.
update public.market_outcomes
set opening_odds = private.american_from_chance(opening_probability),
    odds = private.american_from_chance(opening_probability);

alter table public.market_outcomes
  alter column opening_odds set not null,
  alter column odds set not null,
  add constraint market_outcomes_opening_odds_american check (opening_odds <= -100 or opening_odds >= 100),
  add constraint market_outcomes_odds_american check (odds <= -100 or odds >= 100),
  drop column opening_probability,
  drop column shares_outstanding_minor;

comment on column public.market_outcomes.odds is 'Current American line, house margin included. Moves automatically as bets come in.';
comment on column public.market_outcomes.opening_odds is 'American line the market opened at, set from data.';

-- ---------------------------------------------------------------------------
-- Bets
-- ---------------------------------------------------------------------------

alter table public.bets
  drop column fee_minor,
  drop column shares_minor,
  drop column price_before,
  drop column price_after,
  add column odds integer not null,
  add column to_win_minor bigint not null,
  add constraint bets_odds_american check (odds <= -100 or odds >= 100),
  add constraint bets_to_win_positive check (to_win_minor > 0);

comment on column public.bets.odds is 'American line at bet time; fixed.';
comment on column public.bets.to_win_minor is 'Winnings on top of the returned stake, fixed at bet time.';

-- ---------------------------------------------------------------------------
-- Moving the line
-- ---------------------------------------------------------------------------

-- After a bet on one side, raise that side's chance by the placeholder rule and
-- re-price both sides with the margin the line already carried. Chances stay
-- between 2% and 97% so a line can't run off the end. The caller holds the lock
-- on both outcome rows.
create function private.move_line(p_bet_outcome_id bigint, p_other_outcome_id bigint, p_stake_minor bigint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_bet numeric;
  v_other numeric;
  v_overround numeric;
  v_fair numeric;
  v_new numeric;
begin
  select private.chance_from_american(odds) into v_bet from public.market_outcomes where id = p_bet_outcome_id;
  select private.chance_from_american(odds) into v_other from public.market_outcomes where id = p_other_outcome_id;

  v_overround := v_bet + v_other;
  v_fair := v_bet / v_overround
    + (p_stake_minor::numeric / 100) / private.line_move_coins_per_point() / 100;
  v_new := least(greatest(v_fair * v_overround, 0.02), 0.97);

  update public.market_outcomes set odds = private.american_from_chance(v_new) where id = p_bet_outcome_id;
  update public.market_outcomes
  set odds = private.american_from_chance(least(greatest(v_overround - v_new, 0.02), 0.97))
  where id = p_other_outcome_id;
end;
$$;

revoke all on function private.move_line from public, anon, authenticated;

-- Coins staked since the start of the PHT day, week (Monday) or month.
create function private.staked_since_minor(p_user_id uuid, p_since timestamptz)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(stake_minor), 0)::bigint
  from public.bets
  where user_id = p_user_id and placed_at >= p_since;
$$;

revoke all on function private.staked_since_minor from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Placing a bet
-- ---------------------------------------------------------------------------

-- Errors are short codes the web app translates:
--   not_signed_in, not_approved, excluded, invalid_stake, outcome_not_found,
--   market_closed, not_two_outcomes, stake_limit, stake_too_small, insufficient_coins
-- Returns {status: 'placed', bet_id, odds, stake_minor, to_win_minor}
--      or {status: 'line_moved', odds, other_odds} when p_expected_odds is stale.
create function public.place_bet(p_outcome_id bigint, p_stake_coins integer, p_expected_odds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_stake bigint;
  v_market_id bigint;
  v_market public.markets%rowtype;
  v_outcome public.market_outcomes%rowtype;
  v_other public.market_outcomes%rowtype;
  v_count integer;
  v_local timestamp := now() at time zone 'Asia/Manila';
  v_limit record;
  v_since timestamptz;
  v_to_win bigint;
  v_bet_id bigint;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if p_stake_coins is null or p_stake_coins < 1 then
    raise exception 'invalid_stake' using errcode = 'P0001';
  end if;
  v_stake := p_stake_coins::bigint * 100;

  if not exists (select 1 from public.profiles where id = v_user and status = 'approved') then
    raise exception 'not_approved' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.exclusions
    where user_id = v_user and starts_at <= now() and (ends_at is null or ends_at > now())
  ) then
    raise exception 'excluded' using errcode = 'P0001';
  end if;

  select market_id into v_market_id from public.market_outcomes where id = p_outcome_id;
  if v_market_id is null then
    raise exception 'outcome_not_found' using errcode = 'P0001';
  end if;

  -- One bet at a time per market: lock its outcomes (in id order) before
  -- reading the line, so the line a bet gets is the line it moves.
  perform 1 from public.market_outcomes where market_id = v_market_id order by id for update;

  select * into v_market from public.markets where id = v_market_id;
  if v_market.status <> 'open'
    or v_market.closes_at <= now()
    or (v_market.opens_at is not null and v_market.opens_at > now()) then
    raise exception 'market_closed' using errcode = 'P0001';
  end if;

  select count(*) into v_count from public.market_outcomes where market_id = v_market_id;
  if v_market.type::text not in ('yes_no', 'over_under') or v_count <> 2 then
    raise exception 'not_two_outcomes' using errcode = 'P0001';
  end if;

  select * into v_outcome from public.market_outcomes where id = p_outcome_id;
  select * into v_other from public.market_outcomes where market_id = v_market_id and id <> p_outcome_id;

  if v_outcome.odds is distinct from p_expected_odds then
    return jsonb_build_object('status', 'line_moved', 'odds', v_outcome.odds, 'other_odds', v_other.odds);
  end if;

  -- The user's own stake limits. A raised limit waits in the pending columns
  -- until it takes effect (base schema, user_limits).
  for v_limit in
    select kind,
      case when pending_effective_at is not null and pending_effective_at <= now()
        then pending_amount_minor else amount_minor end as amount_minor
    from public.user_limits
    where user_id = v_user and kind::text like 'stake_%'
  loop
    v_since := case v_limit.kind::text
      when 'stake_daily' then date_trunc('day', v_local)
      when 'stake_weekly' then date_trunc('week', v_local)
      else date_trunc('month', v_local)
    end at time zone 'Asia/Manila';
    if private.staked_since_minor(v_user, v_since) + v_stake > v_limit.amount_minor then
      raise exception 'stake_limit' using errcode = 'P0001';
    end if;
  end loop;

  v_to_win := private.to_win_minor(v_stake, v_outcome.odds);
  if v_to_win < 100 then
    raise exception 'stake_too_small' using errcode = 'P0001';
  end if;

  if coalesce((
    select balance_minor from public.wallet_accounts where user_id = v_user and kind = 'available'
  ), 0) < v_stake then
    raise exception 'insufficient_coins' using errcode = 'P0001';
  end if;

  insert into public.bets (user_id, market_id, outcome_id, stake_minor, odds, to_win_minor)
  values (v_user, v_market_id, p_outcome_id, v_stake, v_outcome.odds, v_to_win)
  returning id into v_bet_id;

  perform private.post_ledger_transaction(
    'bet',
    array[
      ((select id from public.wallet_accounts where user_id = v_user and kind = 'available'), -v_stake)::private.ledger_posting,
      ((select id from public.wallet_accounts where user_id = v_user and kind = 'in_play'), v_stake)::private.ledger_posting
    ],
    p_user_id => v_user,
    p_bet_id => v_bet_id,
    p_market_id => v_market_id
  );

  perform private.move_line(v_outcome.id, v_other.id, v_stake);

  return jsonb_build_object(
    'status', 'placed',
    'bet_id', v_bet_id,
    'odds', v_outcome.odds,
    'stake_minor', v_stake,
    'to_win_minor', v_to_win
  );
end;
$$;

revoke all on function public.place_bet from public, anon;
grant execute on function public.place_bet to authenticated;
