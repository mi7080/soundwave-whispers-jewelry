-- ============================================================
-- Email queue scheduler setup (run ONCE in the Supabase SQL Editor)
-- ------------------------------------------------------------
-- Recreates the 5-second pg_cron job that the original `setup_email_infra`
-- scaffolding tool used to create. Needed because that tool never ran on this
-- project, so emails enqueue but never dispatch.
--
-- Project ref: xypwhiidgcjlooorohli
-- Before running: replace <SERVICE_ROLE_KEY> with the project's
-- service_role key (Dashboard → Project Settings → API → service_role).
-- ============================================================

-- 1. Extensions (no-op if already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Store (or update) the service_role key in Vault for the cron job to use.
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'email_queue_service_role_key';
  if v_id is null then
    perform vault.create_secret('<SERVICE_ROLE_KEY>', 'email_queue_service_role_key');
  else
    perform vault.update_secret(v_id, '<SERVICE_ROLE_KEY>');
  end if;
end $$;

-- 3. (Re)schedule the dispatcher every 5 seconds. Only POSTs when not in a
--    rate-limit cooldown AND at least one queue has messages.
select cron.unschedule('process-email-queue')
  where exists (select 1 from cron.job where jobname = 'process-email-queue');

select cron.schedule(
  'process-email-queue',
  '5 seconds',
  $job$
  select net.http_post(
    url := 'https://xypwhiidgcjlooorohli.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  )
  where not exists (
    select 1 from public.email_send_state where retry_after_until > now()
  )
  and (
    (select count(*) from pgmq.q_transactional_emails) > 0
    or (select count(*) from pgmq.q_auth_emails) > 0
  );
  $job$
);

-- Verify:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
