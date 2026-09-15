/*
# Create OTP codes table for custom phone OTP authentication

## Purpose
Stores OTP codes for phone-based authentication. This replaces Supabase's
built-in phone OTP (which requires a paid SMS provider) with a custom
server-side OTP flow through Edge Functions, matching the Razorpay pattern.

## New Tables
- `otp_codes`
  - `id` (uuid, primary key)
  - `phone` (text, the phone number requesting OTP, with country code)
  - `code` (text, the 6-digit OTP code)
  - `full_name` (text, nullable, stored during signup to create profile later)
  - `purpose` (text, either 'login' or 'signup')
  - `expires_at` (timestamptz, 5 minutes from creation)
  - `used_at` (timestamptz, nullable, set when OTP is consumed)
  - `created_at` (timestamptz, default now)

## Security
- RLS enabled. Only the service role (edge functions) can read/write.
- No policies for anon or authenticated — the table is backend-only.
- Rate limiting is enforced in the edge function, not via policies.
*/

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  full_name text,
  purpose text NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'signup')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies: only the service role (edge functions) accesses this table.
-- anon and authenticated roles get nothing.

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes (phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);
