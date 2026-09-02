import { browser } from '@wdio/globals';
import WdioFactoryUtils from '../utils/wdioFactory.utils.js';

export default class Page {
    wdioFactory = new WdioFactoryUtils();

    async open(path: string): Promise<void> {
        await browser.url(path);
    }
}
