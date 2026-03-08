-- Migration: 00001_create_users_profile.sql
-- Creates the profiles table that extends Supabase auth.users

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT DEFAULT '🌱',
  location TEXT DEFAULT '',
  krux_balance INTEGER DEFAULT 50 CHECK (krux_balance >= 0),
  green_score INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_scan_date DATE,
  total_scans INTEGER DEFAULT 0,
  co2_saved NUMERIC(10,2) DEFAULT 0,
  water_saved NUMERIC(10,2) DEFAULT 0,
  plastic_recycled NUMERIC(10,2) DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_freezes INTEGER DEFAULT 0,
  last_spin_date DATE,
  referral_code TEXT UNIQUE,
  referral_count INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  challenge_progress JSONB DEFAULT '{}',
  last_challenge_reset DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referral TEXT;
BEGIN
  -- Generate a referral code from the user's ID
  referral := upper(substring(encode(digest(NEW.id::text, 'sha256'), 'hex'), 1, 6));

  INSERT INTO public.profiles (id, name, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    referral
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
