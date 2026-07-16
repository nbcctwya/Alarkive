#!/bin/sh
set -eu

image="alarkive:v0.1-verify"
suffix="$$"
container="alarkive-verify-${suffix}"
volume="alarkive-verify-data-${suffix}"

cleanup() {
	docker rm -f "$container" >/dev/null 2>&1 || true
	docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker build --tag "$image" .
docker volume create "$volume" >/dev/null
docker run --detach \
	--name "$container" \
	--mount "type=volume,source=${volume},target=/app/data" \
	--publish 127.0.0.1::3000 \
	--env ALARKIVE_ADMIN_USERNAME=verify \
	--env ALARKIVE_ADMIN_PASSWORD=verify-only-password \
	"$image" >/dev/null

wait_for_health() {
	attempt=0
	while [ "$attempt" -lt 90 ]; do
		status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")"
		if [ "$status" = "healthy" ]; then
			return 0
		fi
		if [ "$status" = "unhealthy" ]; then
			docker logs "$container"
			return 1
		fi
		attempt=$((attempt + 1))
		sleep 1
	done
	docker logs "$container"
	return 1
}

wait_for_health
docker exec "$container" node -e \
	'if (process.getuid() === 0) throw new Error("container runs as root")'
docker exec "$container" test -f /app/data/alarkive.db

published="$(docker port "$container" 3000/tcp)"
port="${published##*:}"
health_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${port}/api/health")"
unauthorized_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${port}/library")"
authorized_status="$(curl --silent --user verify:verify-only-password --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${port}/library")"
[ "$health_status" = "200" ]
[ "$unauthorized_status" = "401" ]
[ "$authorized_status" = "200" ]

docker restart "$container" >/dev/null
wait_for_health
docker exec "$container" test -f /app/data/alarkive.db

echo "Docker verification passed: build, non-root runtime, migration, auth, health, route and restart."
