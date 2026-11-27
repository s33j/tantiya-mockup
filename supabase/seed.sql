-- LOCAL SAMPLE DATA for the betting demo. Approved by Dev 2 on 16 Nov 2026 for
-- display only.
--
-- Supabase loads this file on `pnpm supabase db reset` (local). It is not a
-- migration: `supabase db push` never runs it, so staging and production get
-- no sample markets. Questions, opening lines and dates are sample values
-- adapted from the Core Screen Mockups; every market is marked [SAMPLE].
-- Opening lines are American odds with a sample house margin built in
-- (updated 27 Nov 2026 for automatic lines; margin is still an open decision).
-- Filipino columns repeat the English text until Filipino copy is written
-- (Gantt Task 27).

-- Two sample staff accounts: markets need a builder and a different approver
-- (two-person rule). They cannot sign in (no password) and hold no roles.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-4000-8000-00000000b001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sample-builder@example.test', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-4000-8000-00000000b002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sample-approver@example.test', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

-- The proposal's five market templates (Scope > Markets).
insert into public.market_templates (code, name, type, resolution_source, cadence)
values
  ('fuel_weekly', 'Fuel', 'yes_no', 'DOE oil price advisories', 'weekly'),
  ('psa_inflation', 'Inflation', 'over_under', 'PSA headline inflation, first release', 'monthly'),
  ('bsp_policy_rate', 'BSP rates', 'yes_no', 'BSP Monetary Board decision', 'per meeting'),
  ('php_usd_reference', 'FX', 'yes_no', 'BSP reference rate', 'daily'),
  ('pagasa_wind_signal', 'Weather', 'yes_no', 'PAGASA tropical cyclone bulletins', 'per storm');

-- Markets open now; closing dates are relative to the reset so the demo never
-- shows a past date. Every market has two outcomes: Yes/No, or Over/Under a line.
create temporary table sample_markets (
  slug text, template text, type public.market_type, question text, rules text,
  source text, line numeric, closes timestamptz, outcomes jsonb
);

insert into sample_markets
select
  'sample-gasoline-hike', 'fuel_weekly', 'yes_no'::public.market_type,
  '[SAMPLE] Next week''s gasoline adjustment: a hike of more than ₱1.00 per litre?',
  'Yes if the most common gasoline adjustment among the three largest oil firms'' advisories is above ₱1.00/L. Resolved by 8:00 PM PHT, two-person check, 24-hour dispute window.',
  'DOE oil price advisories', null::numeric, ((d + 1) + time '17:00') at time zone 'Asia/Manila',
  '[{"label":"Yes","odds":150},{"label":"No","odds":-175}]'::jsonb
from (select (now() at time zone 'Asia/Manila')::date as d) t
union all
select
  'sample-diesel-rollback', 'fuel_weekly', 'yes_no',
  '[SAMPLE] Next week''s diesel adjustment: a rollback?',
  'Yes if the most common diesel adjustment among the three largest oil firms'' advisories is a price cut. Resolved by 8:00 PM PHT, two-person check, 24-hour dispute window.',
  'DOE oil price advisories', null, ((d + 1) + time '17:00') at time zone 'Asia/Manila',
  '[{"label":"Yes","odds":-140},{"label":"No","odds":120}]'
from (select (now() at time zone 'Asia/Manila')::date as d) t
union all
select
  'sample-bsp-rate-cut', 'bsp_policy_rate', 'yes_no',
  '[SAMPLE] Will the BSP cut its policy rate at its next Monetary Board meeting?',
  'Yes if the BSP announces a lower target reverse repurchase rate after the meeting. Resolved from the BSP press release, two-person check, 24-hour dispute window.',
  'BSP Monetary Board decision', null, ((d + 9) + time '17:00') at time zone 'Asia/Manila',
  '[{"label":"Yes","odds":-150},{"label":"No","odds":130}]'
from (select (now() at time zone 'Asia/Manila')::date as d) t
union all
select
  'sample-php-usd-58', 'php_usd_reference', 'yes_no',
  '[SAMPLE] BSP reference rate above ₱58.00 per US$ on ' || to_char(fri, 'Dy DD Mon') || '?',
  'Yes if the BSP reference rate published for that day is above ₱58.00 per US$. Resolved by 8:00 PM PHT, two-person check, 24-hour dispute window.',
  'BSP reference rate', null, ((fri - 1) + time '17:00') at time zone 'Asia/Manila',
  '[{"label":"Yes","odds":110},{"label":"No","odds":-130}]'
from (
  select d + (case when extract(isodow from d) >= 4 then 12 else 5 end - extract(isodow from d)::int) as fri
  from (select (now() at time zone 'Asia/Manila')::date as d) t0
) t
union all
select
  'sample-inflation-over-under', 'psa_inflation', 'over_under',
  '[SAMPLE] ' || to_char(d - 30, 'FMMonth YYYY') || ' headline inflation (year on year), as first published by PSA: over or under 2.5%?',
  'Over if the headline rate in PSA''s first release, rounded to one decimal, is above 2.5%; Under if it is below. Exactly 2.5% is a push (stakes returned; half-point lines vs pushes is an open decision). Later revisions do not change the result.',
  'PSA headline inflation, first release', 2.5, ((d + 12) + time '09:00') at time zone 'Asia/Manila',
  '[{"label":"Over 2.5%","odds":-110},{"label":"Under 2.5%","odds":-110}]'
from (select (now() at time zone 'Asia/Manila')::date as d) t
union all
select
  'sample-wind-signal', 'pagasa_wind_signal', 'yes_no',
  '[SAMPLE] Wind Signal No. 2 or higher raised for Metro Manila before ' || to_char(d + 7, 'Dy DD Mon') || '?',
  'Yes if PAGASA raises Tropical Cyclone Wind Signal No. 2 or higher for any part of Metro Manila before the close date.',
  'PAGASA tropical cyclone bulletins', null, ((d + 6) + time '17:00') at time zone 'Asia/Manila',
  '[{"label":"Yes","odds":160},{"label":"No","odds":-190}]'
from (select (now() at time zone 'Asia/Manila')::date as d) t;

with m as (
  insert into public.markets (
    template_code, slug, type, status, question_en, question_fil, rules_en, rules_fil,
    resolution_source, line, opens_at, closes_at, created_by, approved_by, approved_at
  )
  select template, slug, type, 'open', question, question, rules, rules, source, line,
         now() - interval '1 day', closes,
         '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000b002', now()
  from sample_markets
  returning id, slug
)
insert into public.market_outcomes (market_id, position, label_en, label_fil, opening_odds, odds)
select m.id, (o.ord - 1)::smallint, o.value ->> 'label', o.value ->> 'label', (o.value ->> 'odds')::integer, (o.value ->> 'odds')::integer
from m
join sample_markets s on s.slug = m.slug
cross join lateral jsonb_array_elements(s.outcomes) with ordinality as o(value, ord);

drop table sample_markets;
