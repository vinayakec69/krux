-- Migration: 00006_create_challenges_badges.sql
-- Challenge definitions and badge catalog tables

CREATE TABLE IF NOT EXISTS public.challenge_definitions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  target INTEGER NOT NULL,
  reward INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO public.challenge_definitions (id, label, target, reward, type) VALUES
  ('scan_3',       'Scan 3 items today',        3,  20,  'daily'),
  ('earn_30',      'Earn 30 KRUX today',         30, 15,  'daily'),
  ('no_fraud',     'Clean scan streak',          2,  10,  'daily'),
  ('scan_20_week', 'Scan 20 items this week',    20, 100, 'weekly')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL
);

INSERT INTO public.badge_definitions (id, label, emoji, description) VALUES
  ('first_scan',    'First Scan',     '🔬', 'Complete your first scan'),
  ('scans_10',      '10 Scans',       '📦', 'Complete 10 scans'),
  ('scans_50',      '50 Scans',       '🎯', 'Complete 50 scans'),
  ('scans_100',     '100 Scans',      '💯', 'Complete 100 scans'),
  ('streak_7',      '7-Day Streak',   '🔥', 'Maintain a 7-day streak'),
  ('streak_30',     '30-Day Streak',  '🌟', 'Maintain a 30-day streak'),
  ('krux_100',      '100 KRUX',       '💰', 'Earn 100 KRUX total'),
  ('krux_500',      '500 KRUX',       '🏆', 'Earn 500 KRUX total'),
  ('eco_warrior',   'Eco Warrior',    '🦸', 'Reach level 5'),
  ('planet_savior', 'Planet Savior',  '🌍', 'Reach level 10')
ON CONFLICT (id) DO NOTHING;
