-- Over/under markets (decided Nov 27, 2026): a numeric question is asked as two
-- outcomes against a line, for example "PSA inflation over or under 3.5%".
--
-- In its own migration because Postgres can't use a new enum value in the
-- transaction that adds it. The band type stays in the enum, unused.

alter type public.market_type add value 'over_under';
