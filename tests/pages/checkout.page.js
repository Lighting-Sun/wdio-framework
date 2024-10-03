import Page from './page.js';

class CheckoutPage extends Page {

    header = new Header();

    locators = {
        firstNameInput: {
            selector: "#first-name",
            description: "first name input",
        },
        lastNameInput: {
            selector: "#last-name",
            description: "last name input",
        },
        postalCodeInput: {
            selector: "#postal-code",
            description: "postal code input",
        },
        continueButton: {
            selector: "#continue",
            description: "continue button",
        },
    };

    async fillFirstName(firstName) {
        await this.wdioFactory.setValue(this.locators.firstNameInput, firstName);
    }

    async fillLastName(lastName) {
        await this.wdioFactory.setValue(this.locators.lastNameInput, lastName);
    }

    async fillPostalCode(postalCode) {
        await this.wdioFactory.setValue(this.locators.postalCodeInput, postalCode);
    }

    async clickContinueButton() {
        await this.wdioFactory.click(this.locators.continueButton);
    }

    async fillPersonalIformationForm(firstName, lastName, postalCode) {
        await this.fillFirstName(firstName);
        await this.fillLastName(lastName);
        await this.fillPostalCode(postalCode);
    }
}
export default new CheckoutPage();
