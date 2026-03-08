-- Migration: 00005_create_leaderboard_view.sql
-- Materialized view for efficient leaderboard queries

CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT
  p.id,
  p.name,
  p.avatar,
  p.green_score,
  p.location,
  p.streak,
  RANK() OVER (ORDER BY p.green_score DESC) AS rank
FROM public.profiles p
ORDER BY p.green_score DESC
LIMIT 100;
