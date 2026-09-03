#!/usr/bin/env bash
set -euo pipefail

data_dir="${ARCILA_DATA_DIR:-/var/data/wrangler}"
mkdir -p "${data_dir}"

npx wrangler d1 migrations apply arcila-training --local --persist-to "${data_dir}" --config wrangler.render.toml
exec npx wrangler dev --local --ip 0.0.0.0 --port "${PORT:-10000}" --persist-to "${data_dir}" --config wrangler.render.toml
