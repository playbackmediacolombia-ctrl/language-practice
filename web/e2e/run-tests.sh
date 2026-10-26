#!/bin/bash
# Runs the WebKit (Safari engine) test suites against a fresh build, muted, and leaves nothing
# running afterwards — even if a suite fails or the run is interrupted.
#   npm run test:e2e               all suites (from web/)
#   npm run test:e2e -- ui lesson  just these
# Screenshots and logs go to e2e/out/ (git-ignored). First time only: npx playwright install webkit
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$HERE/out"
cd "$HERE/out" # suites save screenshots here (git-ignored), never loose in the repo
WEB="$(cd "$HERE/.." && pwd)"
PORT=4173
SERVER=""

SUITE=""

finish() {
  rm -rf "$HERE/out/.run.lock"
  # Stop the running suite first (its harness closes its browsers on SIGTERM), then the server,
  # then anything still left over.
  if [ -n "$SUITE" ] && kill -0 "$SUITE" 2>/dev/null; then
    kill -TERM "$SUITE" 2>/dev/null
    for _ in $(seq 30); do kill -0 "$SUITE" 2>/dev/null || break; sleep 0.2; done
  fi
  [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null
  "$HERE/kill-strays.sh" >/dev/null
}
trap finish EXIT
trap 'echo "Interrupted."; exit 130' INT TERM HUP

# One run at a time: each run's cleanup would stop another run's server and browsers.
LOCK="$HERE/out/.run.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  other=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$other" ] && kill -0 "$other" 2>/dev/null; then
    echo "Another test run (pid $other) is still going. Wait for it, or stop it first."
    trap - EXIT
    exit 2
  fi
  rm -rf "$LOCK" && mkdir "$LOCK" # left by a run that was killed
fi
echo $$ > "$LOCK/pid"

"$HERE/kill-strays.sh" # in case an earlier run was killed before it could clean up

(cd "$WEB" && npm run build >/dev/null 2>&1) || { echo "Build failed"; exit 1; }
(cd "$WEB" && exec node node_modules/.bin/vite preview --port "$PORT" --strictPort >/dev/null 2>&1) &
SERVER=$!
for _ in $(seq 50); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.2; done

status=0
for suite in "${@:-mute brand ui lesson feedback listen logo roleplay reading reminder dating update move level content speakfirst}"; do
  for s in $suite; do
    echo "== $s"
    # In the background + wait, so Ctrl-C reaches the trap at once instead of after the suite.
    node "$HERE/$s.mjs" > "$HERE/out/$s.log" 2>&1 &
    SUITE=$!
    wait "$SUITE" || status=1
    SUITE=""
    grep -qE "FAILED|TIMEOUT" "$HERE/out/$s.log" && status=1 # suites report failures in their output
    grep -E "FAIL|ALL PASS|FAILED|TIMEOUT|Error|Stopped" "$HERE/out/$s.log" | grep -v "^PASS" || true
  done
done
exit $status
