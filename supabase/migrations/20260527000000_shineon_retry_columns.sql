-- ShineOn auto-retry tracking.
-- Transient submission failures (5xx/429/408/network) are retried automatically
-- on a backoff by the shineon-retry-sweep function; permanent failures are left
-- for manual handling in the admin "Needs Attention" view.

ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS shineon_retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shineon_last_error text,
  ADD COLUMN IF NOT EXISTS shineon_last_error_status int,
  ADD COLUMN IF NOT EXISTS shineon_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS shineon_next_retry_at timestamptz;

-- Fast lookup for the retry sweep: only rows still in error with a due retry.
CREATE INDEX IF NOT EXISTS idx_animus_orders_shineon_retry
  ON public.animus_orders (shineon_next_retry_at)
  WHERE status = 'shineon_error' AND shineon_next_retry_at IS NOT NULL;
