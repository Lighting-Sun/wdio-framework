import * as actions from '../utils/elementActions.utils.js';
import { getSelectorByValue, type Locator } from '../utils/locator.utils.js';

class SideMenu {
    locators = {
        sideMenuOption: {
            selector: "a[data-test='${value}-sidebar-link']",
            description: "side menu option '${value}'",
        },
    };

    getSideMenuOptionByValue(value: string): Locator {
        return getSelectorByValue(this.locators.sideMenuOption, value);
    }

    async clickOnSideMenuOptionByValue(value: string): Promise<void> {
        await actions.click(this.getSideMenuOptionByValue(value));
    }
}

export default SideMenu;
