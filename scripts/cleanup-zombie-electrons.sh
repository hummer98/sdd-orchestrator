#!/bin/bash
# Cleanup zombie Electron processes from E2E tests
# Safe: Only kills processes whose user-data-dir no longer exists
# (meaning their WDIO session has already terminated)

KILLED=0
SKIPPED=0

# Find all e2e-test Electron processes
while IFS= read -r line; do
  [ -z "$line" ] && continue

  pid=$(echo "$line" | awk '{print $2}')

  # Extract user-data-dir from command line
  dir=$(echo "$line" | sed -n 's/.*user-data-dir=\([^ ]*\).*/\1/p')

  if [ -z "$dir" ]; then
    # No user-data-dir found, skip
    continue
  fi

  if [ -d "$dir" ]; then
    # Directory exists = active session, skip
    ((SKIPPED++))
    [ "$1" = "-v" ] && echo "SKIP: PID=$pid (session active: $dir)"
  else
    # Directory missing = zombie process
    echo "KILL: PID=$pid (session ended: $dir)"
    kill "$pid" 2>/dev/null && ((KILLED++))
  fi
done < <(ps aux | grep -E '\-\-e2e-test' | grep -v grep)

echo "Cleaned up $KILLED zombie process(es), skipped $SKIPPED active session(s)"
