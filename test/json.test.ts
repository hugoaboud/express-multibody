import { Test } from './test_lib';

describe('JSON', () => {
    Test.beforeAll();

    it('Should parse flat object', async () => {
        const raw = {
            'prop1': 'mock1',
            'prop2': 'mock2',
            'prop3': 'mock3',
            'prop4': 'mock4',
            'prop5': 'mock5',
            'prop6': 'mock6'
        };
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    }, 10000)

    it('Should parse nested fields', async () => {
        const raw = {
            'prop1': {
                'nested1': 'mock1',
                'nested2': 'mock2'
            },
            'prop2': {
                'nested1': 'mock3',
                'nested2': 'mock4'
            }
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })
    it('Should parse deeply nested fields', async () => {
        const raw = {
            'prop1': {
                'nested1': 'mock1',
                'nested2': {
                    'deep1': 'mock2',
                    'deep2': {
                        'mega1': 'mock3',
                        'mega2': 'mock4'
                    }
                }
            },
            'prop2': {
                'nested1': 'mock5',
                'nested2': {
                    'deep1': 'mock6',
                    'deep2': {
                        'mega1': 'mock7',
                        'mega2': 'mock8'
                    }
                }
            }
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })
    it('Should parse arrays', async () => {
        const raw = {
            'prop1': [
                'mock1',
                'mock2'
            ],
            'prop2': [
                'mock3',
                'mock4'
            ]
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })
    it('Should parse nested arrays', async () => {
        const raw = {
            'prop1': [
                'mock1',
                'mock2',
                [
                    'mock3',
                    'mock4',
                    [
                        'mock5',
                        'mock6'
                    ]
                ]
            ]
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })
    it('Should parse nested arrays with multiple levels', async () => {
        const raw = {
            'prop1': [
                'mock1',
                [
                    'mock2'
                ],
                'mock3',
                [
                    'mock4',
                    'mock5'
                ],
                'mock6'
            ]
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })
    it('Should parse array of objects', async () => {
        const raw = {
            'prop1': [
                {
                    'a': 'mock1',
                    'b': 'mock2'
                },
                {
                    'a': 'mock3',
                    'b': 'mock4'
                }
            ]
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })
    it('Should parse complex objects', async () => {
        const raw = {
            'prop1': {
                'a': 'mock1',
                'b': {
                    'c': 'mock2',
                    'd': 'mock3',
                    'e': [
                        'mock4',
                        'mock5',
                        [
                            'mock6',
                            'mock7',
                            {
                                'f': 'mock8',
                                'g': 'mock9'
                            },
                            {
                                'f': 'mock10'
                            }
                        ]
                    ]
                }
            },
            'prop2': [
                {
                    'a': 'mock11',
                    'b': {
                        'c': 'mock12',
                        'd': 'mock13',
                        'e': [
                            'mock14',
                            'mock15',
                            [
                                'mock16',
                                'mock17',
                                {
                                    'f': 'mock18',
                                    'g': 'mock19'
                                },
                                {
                                    'f': 'mock20'
                                }
                            ]
                        ]
                    }
                },
                {
                    'a': 'mock21',
                    'b': {
                        'c': 'mock22',
                        'd': 'mock23',
                        'e': [
                            'mock24',
                            'mock25',
                            [
                                'mock26',
                                'mock27',
                                {
                                    'f': 'mock28',
                                    'g': 'mock29'
                                },
                                {
                                    'f': 'mock30'
                                }
                            ]
                        ]
                    }
                }
            ]
        }
        const body = await Test.requestJson(raw);
        expect(body).toEqual(raw);
    })

    Test.afterAll();
})
