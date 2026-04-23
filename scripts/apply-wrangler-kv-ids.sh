#!/usr/bin/env bash
# Replace placeholder KV namespace IDs in worker/wrangler.toml with IDs from
# the Cloudflare account used for deploy (GitHub Actions or local).
#
# Required env: CLOUDFLARE_RATE_LIMIT_KV_ID (32-char hex from `wrangler kv namespace create`)
# Optional:     CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID (defaults to same as production id)
set -euo pipefail

WRANGLER="${WRANGLER_TOML:-worker/wrangler.toml}"
OLD_PROD="9dc0bcc958de473199e5ded5701b932a"
OLD_PREVIEW="d6d688f5cfd04d73a42c7c979c1f1791"

KV_ID="${CLOUDFLARE_RATE_LIMIT_KV_ID:-}"
KV_PREVIEW="${CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID:-}"

if [[ -z "$KV_ID" ]]; then
  echo "::error::CLOUDFLARE_RATE_LIMIT_KV_ID is not set."
  echo "Create a KV namespace in the same Cloudflare account as CLOUDFLARE_ACCOUNT_ID:"
  echo "  cd worker && npx wrangler kv namespace create RATE_LIMIT_KV"
  echo "Copy the id from the output and add it as GitHub Actions secret CLOUDFLARE_RATE_LIMIT_KV_ID."
  echo "Optional secret: CLOUDFLARE_RATE_LIMIT_KV_PREVIEW_ID (for wrangler dev preview; defaults to production id)."
  exit 1
fi

if [[ -z "$KV_PREVIEW" ]]; then
  KV_PREVIEW="$KV_ID"
fi

if ! [[ "$KV_ID" =~ ^[0-9a-fA-F]{32}$ ]] || ! [[ "$KV_PREVIEW" =~ ^[0-9a-fA-F]{32}$ ]]; then
  echo "::error::KV namespace ids must be 32-character hex strings (Cloudflare KV id format)."
  exit 1
fi

if [[ ! -f "$WRANGLER" ]]; then
  echo "::error::File not found: $WRANGLER"
  exit 1
fi

sed -i.bak \
  -e "s/${OLD_PROD}/${KV_ID}/g" \
  -e "s/${OLD_PREVIEW}/${KV_PREVIEW}/g" \
  "$WRANGLER"
rm -f "${WRANGLER}.bak"

echo "Applied KV bindings in $WRANGLER (production + preview ids)."
