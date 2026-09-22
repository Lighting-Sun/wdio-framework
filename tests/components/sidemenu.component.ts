import BaseComponent from "./base.component.js";
import type { Locator } from "../utils/wdioFactory.utils.js";

class SideMenu extends BaseComponent {

    locators = {
        sideMenuOption: {
            selector: "a[data-test='${value}-sidebar-link']",
            description: "side menu option '${value}'"
        }
    };

    async getSideMenuOptionByValue(value: string): Promise<Locator> {
        return await this.wdioFactoryUtils.getSelectorByValue(this.locators.sideMenuOption, value);
    }

    async clickOnSideMenuOptionByValue(value: string): Promise<void> {
        await this.wdioFactoryUtils.click(await this.getSideMenuOptionByValue(value));
    }
}

export default SideMenu;
