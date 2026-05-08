#!/bin/sh
set -e

echo "Pushing database schema..."
pnpm db:push

echo "Starting server..."
exec pnpm start