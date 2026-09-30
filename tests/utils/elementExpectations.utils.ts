import allureReporter from '@wdio/allure-reporter';
import { getTextFromElements } from './elementActions.utils.js';
import type { Locator } from './locator.utils.js';

/** How long a group-of-elements assertion keeps re-reading the DOM before failing. */
const TEXTS_RETRY_TIMEOUT = 10_000;

/**
 * Asserts on the ELEMENT, not on an already-resolved string, so
 * expect-webdriverio re-queries the DOM until the text matches or
 * `waitforTimeout` elapses. Use this instead of
 * `expect(await getText()).toEqual(...)`, which only checks once.
 */
export async function expectText(element: Locator, expectedText: string): Promise<void> {
    await expect($(element.selector)).toHaveText(expectedText);
    await allureReporter.addStep(`✅ ${element.description} has text "${expectedText}"`);
}

/**
 * Retrying assertion that no element matches the locator. The negated
 * matcher keeps re-querying until the element is gone, so it waits out a
 * re-render instead of passing on a DOM that hasn't caught up yet.
 */
export async function expectNotExisting(element: Locator): Promise<void> {
    await expect($(element.selector)).not.toBeExisting();
    await allureReporter.addStep(`✅ ${element.description} is not present`);
}

/**
 * Re-reads `readValues` until it matches `expected`, then asserts once
 * more so a failure reports a readable diff rather than a bare `waitUntil`
 * timeout.
 *
 * Use this whenever the expected side is itself collected from the page
 * (a sorted list, a cart compared against what was added). A plain
 * `expect(a).toEqual(b)` on two collected arrays reads the DOM once and
 * races whatever re-render the last action triggered.
 */
export async function expectEventuallyEquals<T>(
    label: string,
    readValues: () => Promise<T[]>,
    expected: T[],
): Promise<void> {
    let actualValues: T[] = [];

    await browser
        .waitUntil(
            async () => {
                actualValues = await readValues();
                return (
                    actualValues.length === expected.length &&
                    actualValues.every((value, index) => value === expected[index])
                );
            },
            {
                timeout: TEXTS_RETRY_TIMEOUT,
                timeoutMsg: `❌ ${label} never matched the expected values.`,
            },
        )
        .catch(() => undefined);

    expect(actualValues).toEqual(expected);
    await allureReporter.addStep(`✅ ${label} matches ${expected.length} expected value(s)`);
}

/** Retrying equivalent of reading a group of elements and comparing their text. */
export async function expectTextsFromElements(elements: Locator, expectedTexts: string[]): Promise<void> {
    await expectEventuallyEquals(elements.description, () => getTextFromElements(elements), expectedTexts);
}

/**
 * Retrying assertion that every element's text matches `pattern`. It fails
 * on an empty match too: with no elements, "every text matches" would pass
 * having checked nothing. On failure, the diff lists the texts that don't
 * match.
 */
export async function expectEveryTextToMatch(elements: Locator, pattern: RegExp): Promise<void> {
    const mismatches = (texts: string[]): string[] => texts.filter((text) => !pattern.test(text));
    let actualTexts: string[] = [];

    await browser
        .waitUntil(
            async () => {
                actualTexts = await getTextFromElements(elements);
                return actualTexts.length > 0 && mismatches(actualTexts).length === 0;
            },
            {
                timeout: TEXTS_RETRY_TIMEOUT,
                timeoutMsg: `❌ ${elements.description} never all matched ${String(pattern)}.`,
            },
        )
        .catch(() => undefined);

    expect(actualTexts).not.toHaveLength(0);
    expect(mismatches(actualTexts)).toEqual([]);
    await allureReporter.addStep(`✅ all ${actualTexts.length} ${elements.description} match ${String(pattern)}`);
}
