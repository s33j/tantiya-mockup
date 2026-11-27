-- Staff role for the Community moderation queue (decided Nov 27, 2026). Admins
-- can moderate too, as with every staff role (private.has_staff_role).
--
-- In its own migration because Postgres can't use a new enum value in the
-- transaction that adds it.

alter type public.staff_role add value 'moderator';
