#!/bin/bash
set -e

# cp dist files
# cp -r /app/plugins/builtin/@tego/web/dist/* /app/public/

# handle sentry
original_file="/app/plugins/builtin/@tego/web/dist/index.html"
sentry_part="/app/public/index.sentry.html"
output_file="/app/public/index.html"

# The implementation depends on index.html.
# If you modify index.html, please pay attention to whether this logic is affected.
{
    if [[ -f "$sentry_part" ]]; then
      sentry_script=$(<"$sentry_part")
      cat "$original_file" | sed "/<link rel=\"stylesheet\" href=\"\/global.css\">/a $sentry_script"
    else
      cat "$original_file"
    fi
} > "$output_file"

pnpm tego start --quickstart
