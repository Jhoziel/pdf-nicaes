#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir="$project_root/dist"
vendor_manifest="$project_root/assets/vendor/manifest.sha256"
max_asset_bytes=26214400

(
  cd "$project_root"
  sha256sum -c "$vendor_manifest"
)

find "$project_root/assets/vendor" -type f -print | while IFS= read -r asset_path; do
  asset_bytes=$(wc -c < "$asset_path")
  if [ "$asset_bytes" -gt "$max_asset_bytes" ]; then
    printf 'Static asset exceeds Cloudflare 25 MiB limit: %s (%s bytes)\n' "$asset_path" "$asset_bytes" >&2
    exit 1
  fi
done

rm -rf -- "$output_dir"
mkdir -p -- "$output_dir"

cp -- \
  "$project_root/index.html" \
  "$project_root/styles.css" \
  "$project_root/app.js" \
  "$project_root/diagnostics.js" \
  "$project_root/pcl-domain.js" \
  "$project_root/review-domain.js" \
  "$project_root/zip-writer.js" \
  "$project_root/archive-import.js" \
  "$project_root/ocr-loader.js" \
  "$project_root/deploy/pages/_headers" \
  "$output_dir/"

cp -R -- "$project_root/assets" "$output_dir/"

deploy_provider=local
deploy_branch=
commit_sha=local-dev

if [ "${WORKERS_CI:-}" = "1" ]; then
  deploy_provider=workers
  deploy_branch=${WORKERS_CI_BRANCH:-}
  commit_sha=${WORKERS_CI_COMMIT_SHA:-local-dev}
elif [ "${CF_PAGES:-}" = "1" ]; then
  deploy_provider=pages
  deploy_branch=${CF_PAGES_BRANCH:-}
  commit_sha=${CF_PAGES_COMMIT_SHA:-local-dev}
  cp -- "$project_root/deploy/pages/_routes.json" "$output_dir/"
fi

if ! printf '%s' "$commit_sha" | grep -Eq '^[0-9a-fA-F]{40}$'; then
  commit_sha=local-dev
fi

channel=local-dev
if [ "$commit_sha" != "local-dev" ] && [ "$deploy_provider" != "local" ]; then
  if [ "$deploy_branch" = "main" ]; then
    channel=production
  else
    channel=preview
  fi
fi

printf 'window.PDF_NICAES_BUILD = Object.freeze({"commitSha":"%s","channel":"%s"});\n' \
  "$commit_sha" "$channel" > "$output_dir/build-info.js"

printf 'Cloudflare %s bundle created in %s\n' "$deploy_provider" "$output_dir"
