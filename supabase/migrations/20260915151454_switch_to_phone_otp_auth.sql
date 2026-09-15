/*
# Switch Authentication to Phone Number + OTP

## Problem
The app currently uses email/password auth. We need to switch to phone number + OTP login.
Supabase Auth supports phone OTP natively via `signInWithOtp({ phone })`.

## Changes
1. Make `profiles.email` nullable (phone auth users may not have an email)
2. Update `handle_new_user` trigger to handle phone-based signups (phone comes from raw_user_meta_data or phone column)
3. Add `phone` column population in the trigger from auth.users.phone
4. Keep existing RLS policies intact

## Notes
- Supabase phone OTP requires the SMS provider to be configured in the dashboard.
  If not configured, OTPs won't actually be sent. The flow still works for testing
  if the provider is set up.
- The `profiles.email` column stays for backward compatibility but is now nullable.
*/

-- Make email nullable since phone auth users may not have email
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Update the handle_new_user trigger to handle phone-based signups
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;