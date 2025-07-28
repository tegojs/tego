import { logger } from '@rsbuild/core';
import chalk from 'chalk';
import open, { apps } from 'open';

import { STATIC_PATH } from './constants';

/**
 * browsers on darwin that are supported by `openChrome.applescript`
 */
const supportedChromiumBrowsers = [
  'Google Chrome Canary',
  'Google Chrome Dev',
  'Google Chrome Beta',
  'Google Chrome',
  'Microsoft Edge',
  'Brave Browser',
  'Vivaldi',
  'Chromium',
];

/**
 * Map the browser name to the name used in `openChrome.applescript`
 */
const mapChromiumBrowserName = (browser: string) => {
  if (browser === 'chrome' || browser === 'google chrome') {
    return 'Google Chrome';
  }
  return browser;
};

/**
 * Determine if we should try to open the browser with `openChrome.applescript`
 */
const shouldTryAppleScript = (browser?: string, browserArgs?: string) => {
  if (process.platform !== 'darwin') {
    return false;
  }
  // AppleScript does not support passing arguments
  // fallback to `open` library
  if (browser && browserArgs) {
    return false;
  }
  if (!browser) {
    return true;
  }
  return supportedChromiumBrowsers.includes(mapChromiumBrowserName(browser));
};

/**
 * This method is modified based on source found in
 * https://github.com/facebook/create-react-app
 *
 * MIT Licensed
 * Copyright (c) 2015-present, Facebook, Inc.
 * https://github.com/facebook/create-react-app/blob/master/LICENSE
 */
export async function openBrowser(url: string): Promise<boolean> {
  const browser = process.env.BROWSER;
  const browserArgs = process.env.BROWSER_ARGS;

  // If we're on OS X, the user hasn't specifically
  // requested a different browser, we can try opening
  // a Chromium browser with AppleScript. This lets us reuse an
  // existing tab when possible instead of creating a new one.
  if (shouldTryAppleScript(browser, browserArgs)) {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    /**
     * Find the browser that is currently running
     */
    const getDefaultBrowserForAppleScript = async () => {
      const { stdout: ps } = await execAsync('ps cax');
      return supportedChromiumBrowsers.find((b) => ps.includes(b));
    };

    try {
      const chromiumBrowser = browser ? mapChromiumBrowserName(browser) : await getDefaultBrowserForAppleScript();

      if (chromiumBrowser) {
        // Try to reuse existing tab with AppleScript
        await execAsync(`osascript openChrome.applescript "${encodeURI(url)}" "${chromiumBrowser}"`, {
          cwd: STATIC_PATH,
        });
        return true;
      }
      logger.debug('failed to find the target browser.');
    } catch (err) {
      logger.debug('failed to open start URL with apple script.');
      logger.debug(err);
    }
  }

  // Fallback to open
  // It will always open new tab
  try {
    const options = browser
      ? {
          app: {
            name: apps[browser as keyof typeof apps] ?? browser,
            arguments: browserArgs?.split(' '),
          },
        }
      : {};
    await open(url, options);
    return true;
  } catch (err) {
    logger.error('Failed to open start URL.');
    logger.error(err);
    return false;
  }
}

let openedURLs: string[] = [];

const clearOpenedURLs = () => {
  openedURLs = [];
};

export const replacePortPlaceholder = (url: string, port: number): string => url.replace(/<port>/g, String(port));

export function resolveUrl(str: string, base: string): string {
  if (URL.canParse(str)) {
    return str;
  }

  try {
    const url = new URL(str, base);
    return url.href;
  } catch {
    throw new Error(
      `${chalk.dim('[rsbuild:open]')} Invalid input: ${chalk.yellow(str)} is not a valid URL or pathname`,
    );
  }
}
