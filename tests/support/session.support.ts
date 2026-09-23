import { browser } from '@wdio/globals';

/**
 * WebdriverIO creates one browser session per spec FILE, not per `it` block.
 * Navigating with `browser.url()` therefore does not reset application state:
 * SauceDemo keeps the cart in sessionStorage and the login token in a cookie,
 * so both survive from one test into the next.
 *
 * Call this in `beforeEach`, after navigating to the application origin
 * (storage is origin-scoped, so there must be a page loaded first).
 */
export async function resetBrowserState(): Promise<void> {
    await browser.deleteCookies();
    await browser.execute(() => {
        window.sessionStorage.clear();
        window.localStorage.clear();
    });
    await browser.refresh();
}
