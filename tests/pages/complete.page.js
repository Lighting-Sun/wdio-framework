import Header from '../components/header.component.js';
import Page from './page.js';

class CompletePage extends Page {

    header = new Header();

    locators = {
        completePurchaseHeader: {
            selector: "//h2[@class='complete-header']",
            description: "complete purchase h2",
        },
    };

    async getCompletePurchaseText() {
        return this.wdioFactory.getText(completePurchaseHeader);
    }
}
export default new CompletePage;
