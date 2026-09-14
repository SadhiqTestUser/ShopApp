/*
# Fix Signup 500 Error + Security Hardening

## Problem
When a user signs up, the `handle_new_user` trigger fires to insert a row into `profiles`.
However, the `profiles` table has RLS enabled with NO INSERT policy. The trigger runs
as the calling role (the new user), and RLS blocks the insert — causing a 500 error
on signup. The auth.users row IS created (auth is not transactional with the trigger),
but the profile insert fails, so the user can't use the app.

## Fix
1. Add an INSERT policy on `profiles` so the trigger can insert the new user's row.
   The trigger runs as SECURITY DEFINER (bypasses RLS), but we add the policy anyway
   for defense-in-depth and to cover any direct inserts.
2. Revoke EXECUTE on `handle_new_user` from `anon` and `authenticated` so only the
   trigger can call it.
3. Revoke EXECUTE on `is_admin` from `anon` (keep for `authenticated` since policies use it).
4. Set `search_path` on both functions to lock down the security definer functions.

## Changes
- New policy: `insert_own_profile` on `profiles` for `TO authenticated`
- REVOKE EXECUTE on `handle_new_user()` from anon, authenticated
- REVOKE EXECUTE on `is_admin()` from anon
- ALTER both functions to set search_path = public
*/

-- Add INSERT policy on profiles so the trigger insert works
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Lock down function search paths
ALTER FUNCTION is_admin() SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;

-- Revoke public execute on handle_new_user (should only be called by trigger)
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon, authenticated;

-- Revoke anon execute on is_admin (policies call it as authenticated)
REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;