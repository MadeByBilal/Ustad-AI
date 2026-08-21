#!/usr/bin/env bash
# Dev server supervisor for Ustad Ai.
#
# Keeps the dev server alive across terminal close / pane kill / transient
# crashes, and logs the exact reason it died (exit status or signal number)
# so we can diagnose why it was stopping.
#
# Start detached (survives terminal close):
#   setsid bash scripts/dev-monitor.sh >/dev/null 2>&1 & disown
#
# Stop:
#   pkill -f dev-monitor      # stops the supervisor (and its child)
#   PORT=3001 pkill -f "tsx server.ts"   # stop the server directly

set -u

PORT="${PORT:-3001}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$PROJECT_DIR/.dev-monitor.pid"
LOG="$PROJECT_DIR/dev-monitor.log"

if [ -f "$PIDFILE" ]; then
  OLD="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    echo "[dev-monitor] already running (pid $OLD). Aborting." >&2
    exit 1
  fi
  rm -f "$PIDFILE"
fi
echo "$$" > "$PIDFILE"

log() { echo "[$(date -Is)] $*" >> "$LOG"; }

cleanup() {
  log "monitor received stop signal; terminating child."
  [ -n "${CHILD:-}" ] && kill -TERM "$CHILD" 2>/dev/null
  rm -f "$PIDFILE"
  exit 0
}
trap cleanup SIGINT SIGTERM

log "monitor starting (PORT=$PORT, pid=$$)"

while true; do
  log "starting dev server..."
  ( cd "$PROJECT_DIR" && PORT="$PORT" npm run dev ) >> "$LOG" 2>&1 &
  CHILD="$!"
  START="$(date +%s)"
  wait "$CHILD"
  CODE="$?"
  END="$(date +%s)"
  ELAPSED="$((END - START))"

  if [ "$CODE" -ge 128 ]; then
    SIG="$((CODE - 128))"
    log "dev server killed by signal $SIG (exit=$CODE) after ${ELAPSED}s"
  else
    log "dev server exited with status $CODE after ${ELAPSED}s"
  fi

  # Clean exit or intentional shutdown -> do not auto-restart.
  if [ "$CODE" -eq 0 ] || [ "$CODE" -eq 143 ] || [ "$CODE" -eq 130 ]; then
    log "intentional shutdown detected; monitor exiting."
    rm -f "$PIDFILE"
    exit 0
  fi

  if [ "$ELAPSED" -lt 5 ]; then
    SLEEP=30
    log "restarting in ${SLEEP}s (crash-loop backoff)..."
  else
    SLEEP=2
    log "restarting in ${SLEEP}s..."
  fi
  sleep "$SLEEP"
done
