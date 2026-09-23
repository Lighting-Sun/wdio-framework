import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import UtilsMethods from '../utils/utilsMethods.utils.js';
import { resetBrowserState } from '../support/session.support.js';
import { loginAsStandardUser } from '../support/flows.support.js';

/**
 * One case per option in SauceDemo's sort dropdown.
 *
 * Each case reads the list the page is currently showing, sorts that same list
 * locally, then asserts the page reaches the same order after the dropdown is
 * used. The expected order therefore comes from the data actually on the page
 * rather than a hardcoded list, so adding or renaming a product does not break
 * these tests — but a broken sort on the site still fails them.
 */
interface SortScenario {
    /** The dropdown's `value` attribute. */
    option: string;
    /** Reads the column this option sorts on. */
    readValues: () => Promise<string[]>;
    /** The order the page should arrive at. */
    sort: (values: string[]) => string[];
    /** Retrying assertion for the same column. */
    expectOrder: (expected: string[]) => Promise<void>;
}

const sortScenarios: Record<string, SortScenario> = {
    'price, low to high': {
        option: 'lohi',
        readValues: () => inventoryPage.getTextFromPrices(),
        sort: (values) => UtilsMethods.sortLowToHighValues(values),
        expectOrder: (expected) => inventoryPage.expectTextFromPrices(expected),
    },
    'price, high to low': {
        option: 'hilo',
        readValues: () => inventoryPage.getTextFromPrices(),
        sort: (values) => UtilsMethods.sortHighToLowValues(values),
        expectOrder: (expected) => inventoryPage.expectTextFromPrices(expected),
    },
    'name, A to Z': {
        option: 'az',
        readValues: () => inventoryPage.getTextFromNames(),
        sort: (values) => UtilsMethods.sortTextAToZ(values),
        expectOrder: (expected) => inventoryPage.expectTextFromNames(expected),
    },
    'name, Z to A': {
        option: 'za',
        readValues: () => inventoryPage.getTextFromNames(),
        sort: (values) => UtilsMethods.sortTextZToA(values),
        expectOrder: (expected) => inventoryPage.expectTextFromNames(expected),
    },
};

describe('product sorting scenarios', () => {
    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    Object.entries(sortScenarios).forEach(([label, { option, readValues, sort, expectOrder }]) => {
        it(`Should sort products by ${label}`, async () => {
            await loginAsStandardUser();
            const expectedOrder = sort(await readValues());
            await inventoryPage.header.clickOnSortFilterDropdownOption(option);
            await expectOrder(expectedOrder);
        });
    });
});
