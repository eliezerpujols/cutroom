#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="$HOME/.local/bin:$PATH"
if [[ ! -d node_modules ]]; then
  npm install
fi
if [[ ! -f dist/index.html ]]; then
  npm run build
fi
node --env-file-if-exists=.env --import tsx -e "import('./server/ensure-server.ts').then(m=>m.ensureServer()).catch(e=>{console.error(e.message);process.exit(1)})"
open http://127.0.0.1:4317
