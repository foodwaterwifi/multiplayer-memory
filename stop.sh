#!/bin/bash

export MIX_ENV=prod
export PORT=4792

echo "Stopping old copy of app, if any..."

_build/prod/rel/memory/bin/memory stop || true
