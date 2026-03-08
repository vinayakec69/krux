-- 005_leaderboard_and_challenges.sql
-- Additional indexes and helper views for leaderboard / challenge queries.

-- Ranked leaderboard view
create or replace view public.ranked_leaderboard as
  select
    id,
    name,
    avatar,
    location,
    green_score,
    streak,
    level,
    total_scans,
    rank() over (order by green_score desc) as rank
  from public.profiles
  order by green_score desc;

-- City-filtered leaderboard helper function
create or replace function public.leaderboard_by_city(city_query text)
returns table (
  id          uuid,
  name        text,
  avatar      text,
  location    text,
  green_score integer,
  streak      integer,
  level       smallint,
  total_scans integer,
  rank        bigint
) language sql security definer as $$
  select
    id, name, avatar, location, green_score, streak, level, total_scans,
    rank() over (order by green_score desc) as rank
  from public.profiles
  where lower(location) like lower('%' || city_query || '%')
  order by green_score desc
  limit 100;
$$;
