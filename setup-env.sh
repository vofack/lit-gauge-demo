# shellcheck shell=bash
# lit-gauge-demo — local development environment (macOS with a full internal disk).
# Source it in every terminal:   source ./setup-env.sh
# Every cache, temporary file and browser profile goes to /Volumes/DevSSD.
# Not needed on CI (GitHub Actions): the npm scripts only check it on macOS.

if [ ! -d /Volumes/DevSSD ] || [ ! -w /Volumes/DevSSD ]; then
  echo "ERROR: /Volumes/DevSSD is not mounted or not writable. Nothing configured." >&2
  return 1 2>/dev/null || exit 1
fi

export DEV_CACHE=/Volumes/DevSSD/.dev-cache
mkdir -p "$DEV_CACHE"/{node-gyp,npm,npm-logs,tmp,xdg-cache,xdg-config,xdg-data,xdg-state,ms-playwright,puppeteer,home,chrome-home}

# npm: cache and logs on DevSSD, never a global install
export npm_config_cache="$DEV_CACHE/npm"
export npm_config_logs_dir="$DEV_CACHE/npm-logs"
export npm_config_update_notifier=false
export npm_config_fund=false
export npm_config_devdir="$DEV_CACHE/node-gyp"   # node-gyp headers (otherwise ~/Library/Caches/node-gyp)

# Temporary files
export TMPDIR="$DEV_CACHE/tmp/"
export TMP="$DEV_CACHE/tmp"
export TEMP="$DEV_CACHE/tmp"

# XDG folders (tools that store config or caches under ~/.config, ~/.cache)
export XDG_CACHE_HOME="$DEV_CACHE/xdg-cache"
export XDG_CONFIG_HOME="$DEV_CACHE/xdg-config"
export XDG_DATA_HOME="$DEV_CACHE/xdg-data"
export XDG_STATE_HOME="$DEV_CACHE/xdg-state"

# Browsers: never download one (Playwright has none for macOS 13); use the installed Chrome,
# with its home folder (crash reports, profile) redirected to DevSSD.
export PLAYWRIGHT_BROWSERS_PATH="$DEV_CACHE/ms-playwright"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_CACHE_DIR="$DEV_CACHE/puppeteer"
export PUPPETEER_SKIP_DOWNLOAD=1
export CHROME_HOME="$DEV_CACHE/chrome-home"
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Home folder replacement for tools that write under os.homedir() (used by the npm scripts only)
export DEV_HOME="$DEV_CACHE/home"

# Storybook: no telemetry, cache on DevSSD
export STORYBOOK_DISABLE_TELEMETRY=1
export NODE_REPL_HISTORY="$DEV_CACHE/node_repl_history"

# Portable Node 22 already on DevSSD
NODE_DIR="$(find "$DEV_CACHE/toolchains" -maxdepth 1 -type d -name 'node-v22*' 2>/dev/null | sort | tail -1)"
if [ -n "$NODE_DIR" ] && [ -x "$NODE_DIR/bin/node" ]; then
  export PATH="$NODE_DIR/bin:$PATH"
fi
unset NODE_DIR

export LIT_GAUGE_ENV=1
