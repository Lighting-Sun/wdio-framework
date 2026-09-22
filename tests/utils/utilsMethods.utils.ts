class UtilsMethods {

    static sortLowToHighValues(arrValues: string[]): string[] {
        return arrValues.sort((a, b) => Number(a) - Number(b));
    }

    static async sumArrAndFixPresicion(arrNum: number[], numPresicion: number): Promise<number> {
        const reducedArr = arrNum.reduce((acum, actual) => acum + actual);
        return Number(reducedArr.toFixed(numPresicion));
    }

    static async fixNumberPresicion(number: number, numPresicion: number): Promise<number> {
        return Number(number.toFixed(numPresicion));
    }
}

export default UtilsMethods;
