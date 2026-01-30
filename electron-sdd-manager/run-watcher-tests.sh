#!/bin/bash
cd "$(dirname "$0")"
npm run test:run -- "bugsWatcherService|specsWatcherService"
