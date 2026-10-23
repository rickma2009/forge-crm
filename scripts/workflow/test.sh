#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
network="forge-workflow-test-$$"
postgres="forge-workflow-pg-test-$$"
export WORKFLOW_TEST_PASSWORD="$(openssl rand -hex 24)"
cleanup(){ docker rm -f "$postgres" >/dev/null 2>&1 || true; docker network rm "$network" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker network create "$network" >/dev/null
docker run -d --name "$postgres" --network "$network" --tmpfs /var/lib/postgresql/data -e POSTGRES_USER=workflow -e POSTGRES_DB=workflow -e POSTGRES_PASSWORD="$WORKFLOW_TEST_PASSWORD" postgres:16-alpine >/dev/null
ready=false
for attempt in {1..40}; do if docker exec "$postgres" pg_isready -U workflow -d workflow >/dev/null 2>&1; then ready=true; break; fi; sleep .5; done
[[ "$ready" == true ]] || { echo 'Isolated PostgreSQL did not become ready' >&2; exit 1; }
docker run --rm --network "$network" -e WORKFLOW_TEST_PASSWORD -e WORKFLOW_TEST_DATABASE_URL="jdbc:postgresql://$postgres:5432/workflow" -v "$root/services/workflow-engine:/workspace" -v forge_workflow_maven:/root/.m2 -w /workspace maven:3.9.9-eclipse-temurin-21 mvn -B verify
