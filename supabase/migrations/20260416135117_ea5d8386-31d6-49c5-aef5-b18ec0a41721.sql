-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule cleanup every 15 minutes
SELECT cron.schedule(
  'cleanup-expired-availability',
  '*/15 * * * *',
  $$SELECT public.cleanup_expired_availability();$$
);