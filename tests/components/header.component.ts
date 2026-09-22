import BaseComponent from './base.component.js';
import SideMenu from './sidemenu.component.js';

class Header extends BaseComponent {
    sideMenu = new SideMenu();

    locators = {
        burgerMenuBtn: {
            selector: '.bm-burger-button',
            description: 'burger menu button that opens a sidebar menu',
        },
        shoppingCartBtn: {
            selector: '#shopping_cart_container',
            description: 'shopping cart button in the header',
        },
        pageTitle: {
            selector: 'span.title',
            description: 'title located in the header, indicating in which page we are on',
        },
        sortFilterDropdown: {
            selector: 'select.product_sort_container',
            description: 'sort filter dropdown',
        },
    };

    async getPageTitleText(): Promise<string> {
        return await this.wdioFactoryUtils.getText(this.locators.pageTitle);
    }

    async expectPageTitle(expectedTitle: string): Promise<void> {
        await this.wdioFactoryUtils.expectText(this.locators.pageTitle, expectedTitle);
    }

    async clickOnBurgerMenuBtn(): Promise<void> {
        await this.wdioFactoryUtils.click(this.locators.burgerMenuBtn);
    }

    async clickOnSortFilterDropdownOption(value: string): Promise<void> {
        await this.wdioFactoryUtils.click(this.locators.sortFilterDropdown);
        await this.wdioFactoryUtils.selectOptionFromSelect(this.locators.sortFilterDropdown, 'value', value);
    }

    async clickOnShoppingCartBtn(): Promise<void> {
        await this.wdioFactoryUtils.click(this.locators.shoppingCartBtn);
    }
}

export default Header;
