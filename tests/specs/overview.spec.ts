import loginPage from '../pages/login.page.js';
import overviewPage from '../pages/overview.page.js';
import { resetBrowserState } from '../support/session.support.js';
import { loginAsStandardUser, reachOverview } from '../support/flows.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

describe('checkout overview scenarios', () => {
    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    /**
     * Rows are compared as exact text with what the inventory showed, so a
     * price shown in another format fails too. The totals are literal values
     * worked out once from the rule (8% tax on the item total, rounded up to
     * the cent), not recomputed here.
     */
    it('Should summarise the purchase with descriptions, prices, tax and total @KAN-6', async () => {
        await loginAsStandardUser();
        const products = await reachOverview(data.cartProducts);
        await overviewPage.expectItemOverviewNames(products.map(({ name }) => name));
        await overviewPage.expectItemOverviewDescriptions(products.map(({ description }) => description));
        await overviewPage.expectItemOverviewPrices(products.map(({ price }) => price));
        await overviewPage.expectSubTotalText(data.expectedOverview.itemTotal);
        await overviewPage.expectTaxText(data.expectedOverview.tax);
        await overviewPage.expectTotalText(data.expectedOverview.total);
    });
});
