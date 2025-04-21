import { Test } from './test_lib';

describe('multipart/form-data', () => {
    Test.beforeAll();

    it('Should parse flat object', async () => {
        const formdata = Test.makeFormdata([
            ['prop1', 'value1'],
            ['prop2', 'value2'],
            ['prop3', 'value3'],
            ['[prop4]', 'value4'],
            ['[prop5]', 'value5'],
            ['[prop6]', 'value6'],
        ]) as any;

        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            prop4: 'value4',
            prop5: 'value5',
            prop6: 'value6',
        })
    }, 10000)

    it('Should parse nested fields', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[nested1]', 'value1'],
            ['prop1[nested2]', 'value2'],
            ['[prop2][nested1]', 'value3'],
            ['[prop2][nested2]', 'value4'],
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: {
                nested1: 'value1',
                nested2: 'value2'
            },
            prop2: {
                nested1: 'value3',
                nested2: 'value4'
            }
        })
    }, 10000)

    it('Should parse deeply nested fields', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[nested1]', 'value1'],
            ['prop1[nested2][deep1]', 'value2'],
            ['prop1[nested2][deep2][mega1]', 'value3'],
            ['prop1[nested2][deep2][mega2]', 'value4'],
            ['[prop2][nested1]', 'value5'],
            ['[prop2][nested2][deep1]', 'value6'],
            ['[prop2][nested2][deep2][mega1]', 'value7'],
            ['[prop2][nested2][deep2][mega2]', 'value8'],
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: {
                nested1: 'value1',
                nested2: {
                    deep1: 'value2',
                    deep2: {
                        mega1: 'value3',
                        mega2: 'value4'
                    }
                }
            },
            prop2: {
                nested1: 'value5',
                nested2: {
                    deep1: 'value6',
                    deep2: {
                        mega1: 'value7',
                        mega2: 'value8'
                    }
                }
            },
        })
    }, 10000)

    it('Should parse arrays', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[]', 'value1'],
            ['prop1[]', 'value2'],
            ['[prop2][]', 'value3'],
            ['[prop2][]', 'value4'],
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: ['value1', 'value2'],
            prop2: ['value3', 'value4']
        })
    }, 10000)

    it('Should parse nested arrays', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[]', 'value1'],           // prop1[]=0
            ['prop1[]', 'value2'],           // prop1[]=1
            ['prop1[][]', 'value3'],         // prop1[]=2, prop1[][]=0
            ['prop1[][]', 'value4'],         // prop1[]=2, prop1[][]=1
            ['prop1[][][]', 'value5'],       // prop1[]=3, prop1[][]=2, prop1[][][]=0
            ['prop1[][][]', 'value6'],       // prop1[]=3, prop1[][]=2, prop1[][][]=1
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: ['value1', 'value2', ['value3', 'value4', ['value5', 'value6']]],
        })
    }, 10000)

    it('Should parse nested arrays with multiple levels', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[]', 'value1'],       // 0
            ['prop1[][]', 'value2'],     // 1 0
            ['prop1[]', 'value3'],       // 2
            ['prop1[][]', 'value4'],     // 3 0
            ['prop1[][]', 'value5'],     // 3 1
            ['prop1[]', 'value6'],       // 4
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: ['value1', ['value2'], 'value3', ['value4', 'value5'], 'value6'],
        })
    }, 10000)

    it('Should parse array of objects', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[][a]', 'value1'],
            ['prop1[][b]', 'value2'],
            ['prop1[][a]', 'value3'],
            ['prop1[][b]', 'value4'],
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: [
                {
                    a: 'value1',
                    b: 'value2'
                },
                {
                    a: 'value3',
                    b: 'value4'
                }
            ]
        })
    }, 10000)

    it('Should parse complex objects', async () => {
        const formdata = Test.makeFormdata([
            ['prop1[a]', 'value1'],
            ['prop1[b][c]', 'value2'],
            ['prop1[b][d]', 'value3'],
            ['prop1[b][e][]', 'value4'],
            ['prop1[b][e][]', 'value5'],
            ['prop1[b][e][][]', 'value6'],
            ['prop1[b][e][][]', 'value7'],
            ['prop1[b][e][][][f]', 'value8'],
            ['prop1[b][e][][][g]', 'value9'],
            ['prop1[b][e][][][f]', 'value10'],
            ['prop2[][a]', 'value11'],
            ['prop2[][b][c]', 'value12'],
            ['prop2[][b][d]', 'value13'],
            ['prop2[][b][e][]', 'value14'],
            ['prop2[][b][e][]', 'value15'],
            ['prop2[][b][e][][]', 'value16'],
            ['prop2[][b][e][][]', 'value17'],
            ['prop2[][b][e][][][f]', 'value18'],
            ['prop2[][b][e][][][g]', 'value19'],
            ['prop2[][b][e][][][f]', 'value20'],
            ['prop2[][a]', 'value21'],
            ['prop2[][b][c]', 'value22'],
            ['prop2[][b][d]', 'value23'],
            ['prop2[][b][e][]', 'value24'],
            ['prop2[][b][e][]', 'value25'],
            ['prop2[][b][e][][]', 'value26'],
            ['prop2[][b][e][][]', 'value27'],
            ['prop2[][b][e][][][f]', 'value28'],
            ['prop2[][b][e][][][g]', 'value29'],
            ['prop2[][b][e][][][f]', 'value30'],
        ]) as any;
        const body = await Test.requestFormData(formdata);
        expect(body).toEqual({
            prop1: {
                a: 'value1',
                b: {
                    c: 'value2',
                    d: 'value3',
                    e: [
                        'value4',
                        'value5',
                        [
                            'value6',
                            'value7',
                            {
                                f: 'value8',
                                g: 'value9'
                            },
                            {
                                f: 'value10'
                            }
                        ]
                    ]
                }
            },
            prop2: [
                {
                    a: 'value11',
                    b: {
                        c: 'value12',
                        d: 'value13',
                        e: [
                            'value14',
                            'value15',
                            [
                                'value16',
                                'value17',
                                {
                                    f: 'value18',
                                    g: 'value19'
                                },
                                {
                                    f: 'value20'
                                }
                            ]
                        ]
                    }
                },
                {
                    a: 'value21',
                    b: {
                        c: 'value22',
                        d: 'value23',
                        e: [
                            'value24',
                            'value25',
                            [
                                'value26',
                                'value27',
                                {
                                    f: 'value28',
                                    g: 'value29'
                                },
                                {
                                    f: 'value30'
                                }
                            ]
                        ]
                    }
                }
            ]
        })
    }, 10000)

    Test.afterAll();
})
