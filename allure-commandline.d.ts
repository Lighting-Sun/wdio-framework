declare module 'allure-commandline' {
    interface AllureProcess {
        on(event: 'exit', handler: (exitCode: number) => void): this;
    }
    function allure(args: string[]): AllureProcess;
    export = allure;
}
