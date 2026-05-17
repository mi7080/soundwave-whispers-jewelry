-- Ensure pgcrypto is available for gen_random_bytes() used in referral code generation.
-- This extension must also be enabled in the Supabase dashboard
-- (Database → Extensions → pgcrypto) on first deploy.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
