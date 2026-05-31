# Deploy the iCount -> ShineOn fulfillment changes to Supabase prod.
# Project ref: gcqmkltyifgtuizencka
#
# Prereq (one of):
#   - run `npx supabase login` first (opens browser), OR
#   - set $env:SUPABASE_ACCESS_TOKEN before running this script.
#
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/deploy-icount-shineon.ps1

$ErrorActionPreference = "Stop"
$ref = "gcqmkltyifgtuizencka"

Write-Host "==> Linking project $ref" -ForegroundColor Cyan
npx supabase link --project-ref $ref
if (-not $?) { throw "link failed - run 'npx supabase login' or set SUPABASE_ACCESS_TOKEN first" }

Write-Host "==> Pushing migrations (adds animus_orders.shineon_sku)" -ForegroundColor Cyan
npx supabase db push
if (-not $?) { throw "db push failed" }

Write-Host "==> Deploying edge functions" -ForegroundColor Cyan
npx supabase functions deploy icount-create-payment
if (-not $?) { throw "deploy icount-create-payment failed" }
npx supabase functions deploy icount-payment-webhook
if (-not $?) { throw "deploy icount-payment-webhook failed" }

Write-Host ""
Write-Host "Done. Now confirm the secret is set (one-time):" -ForegroundColor Green
Write-Host "  npx supabase secrets set ICOUNT_WEBHOOK_SECRET=<value>" -ForegroundColor Yellow
Write-Host "Then place a 1.00 test order end-to-end and watch the webhook logs:" -ForegroundColor Green
Write-Host "  npx supabase functions logs icount-payment-webhook" -ForegroundColor Yellow
