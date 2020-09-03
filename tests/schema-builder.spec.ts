import { createSchemaFor } from '../src';
function pp(any) {
    console.log(JSON.stringify(any, null, 2));
}
describe('SchemaBuilder', () => {
    describe('simple types', () => {
        it('should build schema for integer', async () => {
            const schema = createSchemaFor(1);
            expect(schema).toEqual({ type: 'integer' });
        });

        it('should build schema for number', async () => {
            const schema = createSchemaFor(1.1);
            expect(schema).toEqual({ type: 'number' });
        });

        it('should build schema for string', async () => {
            const schema = createSchemaFor('some string');
            expect(schema).toEqual({ type: 'string' });
        });

        it('should build schema for null', async () => {
            const schema = createSchemaFor(null);
            expect(schema).toEqual({ type: 'null' });
        });

        it('should build schema for boolean', async () => {
            const schema = createSchemaFor(false);
            expect(schema).toEqual({ type: 'boolean' });
        });

        it('should build schema for array', async () => {
            const schema = createSchemaFor([]);
            expect(schema).toEqual({ type: 'array' });
        });

        it('should build schema for object', async () => {
            const schema = createSchemaFor({});
            expect(schema).toEqual({ type: 'object' });
        });
    });

    describe('arrays', () => {
        it('it should generate schema for arrays of the same type', async () => {
            const schema = createSchemaFor([1, 2, 3]);
            expect(schema).toEqual({ type: 'array', items: { type: 'integer' } });
        });

        it('it should generate schema for arrays of the same type with floats', async () => {
            const schema = createSchemaFor([1, 2.1, 3]);
            expect(schema).toEqual({ type: 'array', items: { type: 'number' } });
        });

        it('it should generate schema for arrays of different primitive types', async () => {
            const schema = createSchemaFor([1, 1.1, 'string', null, false, true]);
            expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'number', 'string'] } });
        });

        it('it should generate schema for arrays of different primitive types and ints only', async () => {
            const schema = createSchemaFor([1, 'string', null, false, true]);
            expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'integer', 'string'] } });
        });
    });

    describe('objects', () => {
        it('it should generate schema for object with props of the same type', async () => {
            const schema = createSchemaFor({ one: 1, two: 2 });
            expect(schema).toEqual({
                type: 'object',
                properties: { one: { type: 'integer' }, two: { type: 'integer' } },
                required: ['one', 'two'],
            });
        });

        it('it should generate schema for object with props of different types', async () => {
            const schema = createSchemaFor({ one: 1, two: 'second' });
            expect(schema).toEqual({
                type: 'object',
                properties: { one: { type: 'integer' }, two: { type: 'string' } },
                required: ['one', 'two'],
            });
        });
    });

    describe('nested array', () => {
        it('should generate schema for nested arrays', async () => {
            const schema = createSchemaFor([1, [2.1], [[3]]]);
            expect(schema).toEqual({
                type: 'array',
                items: {
                    anyOf: [
                        {
                            type: 'integer',
                        },
                        {
                            type: 'array',
                            items: {
                                anyOf: [
                                    {
                                        type: 'number',
                                    },
                                    {
                                        type: 'array',
                                        items: {
                                            type: 'integer',
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            });
        });

        it('should generate schema for nested arrays and simplify anyOf', async () => {
            const schema = createSchemaFor([1, 'some string', null, [2, 'some other string', {}], [[3.1]]]);
            expect(schema).toEqual({
                type: 'array',
                items: {
                    anyOf: [
                        {
                            type: ['null', 'integer', 'string'],
                        },
                        {
                            type: 'array',
                            items: {
                                anyOf: [
                                    {
                                        type: ['integer', 'string', 'object'],
                                    },
                                    {
                                        type: 'array',
                                        items: {
                                            type: 'number',
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            });
        });
    });

    describe('nested objects/arrays', () => {
        it('should combine object schemas and respect required property', async () => {
            const schema = createSchemaFor({
                one: 1,
                two: 'second',
                three: { four: 5, five: [5], six: null, seven: [{}, { eight: 1.1 }, { nine: 'nine' }] },
            });
            expect(schema).toEqual({
                type: 'object',
                properties: {
                    one: {
                        type: 'integer',
                    },
                    two: {
                        type: 'string',
                    },
                    three: {
                        type: 'object',
                        properties: {
                            four: {
                                type: 'integer',
                            },
                            five: {
                                type: 'array',
                                items: {
                                    type: 'integer',
                                },
                            },
                            six: {
                                type: 'null',
                            },
                            seven: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        eight: {
                                            type: 'number',
                                        },
                                        nine: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                        required: ['four', 'five', 'six', 'seven'],
                    },
                },
                required: ['one', 'two', 'three'],
            });
        });
    });

    describe('all cases combined', () => {
        it('should generate valid schemas for complex objects', async () => {
            const schema = createSchemaFor([
                {
                    lvl1PropNum: 1,
                    lvl1PropStr: 'second',
                    lvl1PropObj1: { lvl2PropArr: [1, 2] },
                    lvl1PropObj2: {
                        lvl2PropNum1: 5,
                        lvl2PropArr1: [5],
                        six: null,
                        lvl2PropArr2: [
                            {},
                            { lvl3PropNum1: 1.2 },
                            { lvl3PropStr1: 'nine' },
                            [1, false],
                            1,
                            'some string',
                        ],
                    },
                },
                { lvl1PropStr: 'one' },
                { lvl1PropNum: 1.2, lvl1PropStr: 'one' },
                { lvl1PropStr: 'one', lvl1PropObj1: { lvl2PropArr: [2.3, null, 'some string', false] } },
            ]);

            expect(schema).toEqual({
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        lvl1PropNum: {
                            type: 'number',
                        },
                        lvl1PropStr: {
                            type: 'string',
                        },
                        lvl1PropObj1: {
                            type: 'object',
                            properties: {
                                lvl2PropArr: {
                                    type: 'array',
                                    items: {
                                        type: ['null', 'boolean', 'number', 'string'],
                                    },
                                },
                            },
                            required: ['lvl2PropArr'],
                        },
                        lvl1PropObj2: {
                            type: 'object',
                            properties: {
                                lvl2PropNum1: {
                                    type: 'integer',
                                },
                                lvl2PropArr1: {
                                    type: 'array',
                                    items: {
                                        type: 'integer',
                                    },
                                },
                                six: {
                                    type: 'null',
                                },
                                lvl2PropArr2: {
                                    type: 'array',
                                    items: {
                                        anyOf: [
                                            {
                                                type: ['integer', 'string'],
                                            },
                                            {
                                                type: 'array',
                                                items: {
                                                    type: ['boolean', 'integer'],
                                                },
                                            },
                                            {
                                                type: 'object',
                                                properties: {
                                                    lvl3PropNum1: {
                                                        type: 'number',
                                                    },
                                                    lvl3PropStr1: {
                                                        type: 'string',
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                            required: ['lvl2PropNum1', 'lvl2PropArr1', 'six', 'lvl2PropArr2'],
                        },
                    },
                    required: ['lvl1PropStr'],
                },
            });
        });
    });
});
