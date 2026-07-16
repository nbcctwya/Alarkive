#!/bin/sh
set -eu

node /app/scripts/docker-migrate.mjs
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
exec node /app/server.js
