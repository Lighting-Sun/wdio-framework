import Header from '../components/header.component.js';
import * as actions from '../utils/elementActions.utils.js';
import * as expectations from '../utils/elementExpectations.utils.js';
import { step } from '../utils/report.utils.js';
import Page from './page.js';

class CheckoutPage extends Page {
    header = new Header();

    locators = {
        firstNameInput: {
            selector: '#first-name',
            description: 'first name input',
        },
        lastNameInput: {
            selector: '#last-name',
            description: 'last name input',
        },
        postalCodeInput: {
            selector: '#postal-code',
            description: 'postal code input',
        },
        continueButton: {
            selector: '#continue',
            description: 'continue button',
        },
        errorMessage: {
            selector: "h3[data-test='error']",
            description: 'checkout information error message',
        },
    };

    async expectErrorMessage(expectedMessage: string): Promise<void> {
        await expectations.expectText(this.locators.errorMessage, expectedMessage);
    }

    /**
     * Retrying check of the three inputs' placeholders, in form order (first
     * name, last name, postal code), compared as one list so a failure shows
     * every mismatch at once. A missing input reads as a failed comparison.
     */
    async expectPlaceholders(expectedPlaceholders: string[]): Promise<void> {
        const inputs = [this.locators.firstNameInput, this.locators.lastNameInput, this.locators.postalCodeInput];
        await expectations.expectEventuallyEquals(
            'checkout information input placeholders',
            () => Promise.all(inputs.map((input) => actions.getAttribute(input, 'placeholder'))),
            expectedPlaceholders,
        );
    }

    async fillFirstName(firstName: string): Promise<void> {
        await actions.setValue(this.locators.firstNameInput, firstName);
    }

    async fillLastName(lastName: string): Promise<void> {
        await actions.setValue(this.locators.lastNameInput, lastName);
    }

    async fillPostalCode(postalCode: string): Promise<void> {
        await actions.setValue(this.locators.postalCodeInput, postalCode);
    }

    async clickContinueButton(): Promise<void> {
        await actions.click(this.locators.continueButton);
    }

    async fillPersonalInformationForm(firstName: string, lastName: string, postalCode: string): Promise<void> {
        await step('📝 Fill the checkout information form', async () => {
            await this.fillFirstName(firstName);
            await this.fillLastName(lastName);
            await this.fillPostalCode(postalCode);
        });
    }
}

export default new CheckoutPage();
