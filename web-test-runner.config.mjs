import { esbuildPlugin } from '@web/dev-server-esbuild';
import { chromeLauncher } from '@web/test-runner-chrome';

// Locally (macOS 13), Playwright ships no browser: we drive the installed Chrome, with its
// home folder redirected to DevSSD (setup-env.sh). On CI, chrome-launcher finds the runner's Chrome.
const home = process.env.CHROME_HOME;

export default {
  files: 'test/**/*.test.ts',
  nodeResolve: true,
  plugins: [esbuildPlugin({ ts: true, target: 'es2022', tsconfig: './tsconfig.json' })],
  browsers: [
    chromeLauncher({
      launchOptions: {
        executablePath: process.env.CHROME_PATH || undefined,
        // CI: Ubuntu 24.04 restricts the namespaces Chrome's sandbox needs (throwaway machine).
        args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check', ...(process.env.CI ? ['--no-sandbox'] : [])],
        env: home ? { ...process.env, HOME: home, CFFIXED_USER_HOME: home } : process.env,
      },
    }),
  ],
  testFramework: { config: { timeout: 5000 } },
};
