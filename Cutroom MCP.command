#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="$HOME/.local/bin:$PATH"
exec node --env-file-if-exists=.env --import tsx server/mcp.ts
