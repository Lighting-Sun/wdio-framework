import Header from '../components/header.component.js';
import * as actions from '../utils/elementActions.utils.js';
import * as expectations from '../utils/elementExpectations.utils.js';
import Page from './page.js';

class CompletePage extends Page {
    header = new Header();

    locators = {
        completePurchaseHeader: {
            selector: "h2[data-test='complete-header']",
            description: 'complete purchase h2',
        },
    };

    async getCompletePurchaseText(): Promise<string> {
        return actions.getText(this.locators.completePurchaseHeader);
    }

    async expectCompletePurchaseText(expectedText: string): Promise<void> {
        await expectations.expectText(this.locators.completePurchaseHeader, expectedText);
    }
}

export default new CompletePage();
