-- Clean up old disease_checks rows that are stuck in 'processing' status
-- This marks them as error instead of deleting (better for debugging)
-- Run this in Supabase SQL Editor if you have old stuck rows

UPDATE public.disease_checks
SET result = jsonb_build_object(
  'status', 'error',
  'error', 'Timed out / function failed',
  'updatedAt', now()::text,
  'model', 'none'
)
WHERE (result->>'status') = 'processing'
  AND created_at < now() - interval '2 minutes';

-- Optional: If you want to see what will be updated before running, use this query:
-- SELECT id, created_at, result
-- FROM public.disease_checks
-- WHERE (result->>'status') = 'processing'
--   AND created_at < now() - interval '2 minutes';
