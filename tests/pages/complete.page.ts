import Header from '../components/header.component.js';
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
        return this.wdioFactory.getText(this.locators.completePurchaseHeader);
    }

    async expectCompletePurchaseText(expectedText: string): Promise<void> {
        await this.wdioFactory.expectText(this.locators.completePurchaseHeader, expectedText);
    }
}

export default new CompletePage();
