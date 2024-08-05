class AlgorithmLibrary {
    // 算法库，包含多种处理数据的算法

    sum(data: number[]): number {
        return data.reduce((acc, value) => acc + value, 0);
    }

    average(data: number[]): number {
        if (data.length === 0) return 0;
        return this.sum(data) / data.length;
    }

    execute(algorithmName: string, data: number[]): number | null {
        switch (algorithmName) {
            case 'sum':
                return this.sum(data);
            case 'average':
                return this.average(data);
            default:
                console.log(`Algorithm ${algorithmName} is not defined.`);
                return null;
        }
    }
}

export default AlgorithmLibrary;