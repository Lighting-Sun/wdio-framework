export interface Locator {
    selector: string;
    description: string;
}

/** Token that dynamic locators substitute a runtime value into. */
const VALUE_PLACEHOLDER = '${value}';

/**
 * Quote characters would terminate the quoted section of a selector early and
 * produce an invalid one. Escaping them properly needs XPath `concat()`, which
 * a plain string substitution cannot express, so such values are rejected.
 */
const UNSAFE_VALUE_CHARS = /['"]/;

/**
 * Substitutes a runtime value into a dynamic locator.
 *
 * Both failure modes below used to pass silently and surface later as a
 * confusing "element not found", pointing at the page object rather than
 * at the bad input.
 */
export function getSelectorByValue(element: Locator, value: string | number): Locator {
    const valueStr = String(value);

    if (!element.selector.includes(VALUE_PLACEHOLDER)) {
        throw new Error(
            `❌ Cannot substitute "${valueStr}": the locator for ${element.description} has no ${VALUE_PLACEHOLDER} placeholder. Selector: ${element.selector}`,
        );
    }

    if (UNSAFE_VALUE_CHARS.test(valueStr)) {
        throw new Error(
            `❌ Cannot substitute "${valueStr}" into the locator for ${element.description}: quote characters would produce an invalid selector.`,
        );
    }

    return {
        selector: element.selector.replaceAll(VALUE_PLACEHOLDER, valueStr),
        description: element.description.replaceAll(VALUE_PLACEHOLDER, valueStr),
    };
}
