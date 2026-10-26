#!/bin/bash
# Stops test leftovers: Playwright's own browsers, test suites and test servers. Matching is on
# the executable path (Playwright's browsers live in ~/Library/Caches/ms-playwright) or the exact
# suite/server command, so Safari, Chrome and other apps are never touched.
#   kill-strays.sh          kill them
#   kill-strays.sh --list   only show them
E2E="$(cd "$(dirname "$0")" && pwd)"
PW="$HOME/Library/Caches/ms-playwright/"
found=()
while read -r pid comm; do
  [ "$pid" = "$$" ] && continue
  args=$(ps -o args= -p "$pid" 2>/dev/null) || continue
  case "$comm" in
    "$PW"*) found+=("$pid") ;;                                          # a Playwright browser process
    */bash|bash) [[ "$args" == "bash $PW"* ]] && found+=("$pid") ;;      # its pw_run.sh launcher
    */node|node)
      [[ "$args" == "node $E2E/"*.mjs* ]] && found+=("$pid")            # a test suite
      [[ "$args" == *"vite preview --port 4173 --strictPort"* ]] && found+=("$pid") ;;  # the test server
  esac
done < <(ps -axo pid=,comm=)
[ ${#found[@]} -eq 0 ] && { echo "nothing left running"; exit 0; }
for pid in "${found[@]}"; do echo "$pid $(ps -o args= -p "$pid" 2>/dev/null | cut -c1-110)"; done
[ "${1:-}" = "--list" ] && exit 0
kill -TERM "${found[@]}" 2>/dev/null; sleep 2; kill -9 "${found[@]}" 2>/dev/null
echo "stopped ${#found[@]} process(es)"
