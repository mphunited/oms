-- This migration was applied directly via Supabase MCP.
-- The Transaction Pooler (port 6543) lacks auth-schema DDL permission,
-- so db:migrate cannot execute it. The trigger and function are already
-- live in the database. This file is kept for version-control reference only.
--
-- Original SQL:
--
-- CREATE OR REPLACE FUNCTION public.handle_new_auth_user() ...
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users ...
--
-- See the full original in git history.

SELECT 1;
