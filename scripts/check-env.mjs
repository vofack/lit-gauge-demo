// Refuses to run on macOS unless ./setup-env.sh was sourced (internal disk is full:
// caches and temporary files must go to /Volumes/DevSSD). No check on CI or Linux.
if (process.platform === 'darwin' && !process.env.CI && process.env.LIT_GAUGE_ENV !== '1') {
  console.error('Run `source ./setup-env.sh` first (caches and temp files must stay on /Volumes/DevSSD).');
  process.exit(1);
}
