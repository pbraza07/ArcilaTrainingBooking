#!/usr/bin/env bash
set -euo pipefail

data_dir="${ARCILA_DATA_DIR:-/var/data/wrangler}"
render_env_file="${ARCILA_RENDER_ENV_FILE:-/tmp/arcila-render.env}"
wrangler="./node_modules/.bin/wrangler"
mkdir -p "${data_dir}"

"${wrangler}" d1 migrations apply arcila-training --local --persist-to "${data_dir}" --config wrangler.render.toml
node scripts/write-render-env.mjs "${render_env_file}"
exec "${wrangler}" dev --local --ip 0.0.0.0 --port "${PORT:-10000}" --persist-to "${data_dir}" --env-file "${render_env_file}" --config wrangler.render.toml
