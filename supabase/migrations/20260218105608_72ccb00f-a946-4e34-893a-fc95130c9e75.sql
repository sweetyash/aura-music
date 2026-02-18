-- Drop the spotify_tokens table entirely since tokens are managed client-side via localStorage
-- The SELECT policy exposes sensitive OAuth credentials; removing the table eliminates the risk
DROP TABLE IF EXISTS public.spotify_tokens CASCADE;