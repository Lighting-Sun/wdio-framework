import BaseComponent from "./base.component.js";
import type { Locator } from "../utils/wdioFactory.utils.js";

class SideMenu extends BaseComponent {

    locators = {
        sideMenuOption: {
            selector: "//a[@class='bm-item menu-item'][text()='${value}']",
            description: "side menu option '${value}'"
        }
    };

    async getSideMenuOptionByValue(strValue: string): Promise<Locator> {
        return await this.wdioFactoryUtils.getSelectorByValue(this.locators.sideMenuOption, strValue);
    }

    async clickOnSideMenuOptionByValue(strValue: string): Promise<void> {
        await this.wdioFactoryUtils.click(await this.getSideMenuOptionByValue(strValue));
    }
}

export default SideMenu;
