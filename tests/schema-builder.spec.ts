import { createSchema, mergeSchemas, ValueType, extendSchema, createCompoundSchema } from '../src';
import { pp } from './test-utils';

describe('SchemaBuilder', () => {
    describe('generation', () => {
        describe('simple types', () => {
            it('should build schema for integer', () => {
                const schema = createSchema(1);
                expect(schema).toEqual({ type: 'integer' });
            });

            it('should build schema for number', () => {
                const schema = createSchema(1.1);
                expect(schema).toEqual({ type: 'number' });
            });

            it('should build schema for string', () => {
                const schema = createSchema('some string');
                expect(schema).toEqual({ type: 'string' });
            });

            it('should build schema for null', () => {
                const schema = createSchema(null);
                expect(schema).toEqual({ type: 'null' });
            });

            it('should build schema for boolean', () => {
                const schema = createSchema(false);
                expect(schema).toEqual({ type: 'boolean' });
            });

            it('should build schema for array', () => {
                const schema = createSchema([]);
                expect(schema).toEqual({ type: 'array' });
            });

            it('should build schema for object', () => {
                const schema = createSchema({});
                expect(schema).toEqual({ type: 'object' });
            });

            it('should build schema for undefined', () => {
                const schema = createSchema(undefined);
                expect(schema).toEqual({ type: 'null' });
            });
        });

        describe('arrays', () => {
            it('it should generate schema for arrays of the same type', () => {
                const schema = createSchema([1, 2, 3]);
                expect(schema).toEqual({ type: 'array', items: { type: 'integer' } });
            });

            it('it should generate schema for arrays of the same type with floats', () => {
                const schema = createSchema([1, 2.1, 3]);
                expect(schema).toEqual({ type: 'array', items: { type: 'number' } });
            });

            it('it should generate schema for arrays of different primitive types', () => {
                const schema = createSchema([1, 1.1, 'string', null, false, true]);
                expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'number', 'string'] } });
            });

            it('it should generate schema for arrays of different primitive types and ints only', () => {
                const schema = createSchema([1, 'string', null, false, true]);
                expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'integer', 'string'] } });
            });
        });

        describe('objects', () => {
            it('it should generate schema for object with props of the same type', () => {
                const schema = createSchema({ one: 1, two: 2 });
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'integer' } },
                    required: ['one', 'two'],
                });
            });

            it('it should generate schema for object with props of different types', () => {
                const schema = createSchema({ one: 1, two: 'second' });
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'string' } },
                    required: ['one', 'two'],
                });
            });

            it('it should generate schema for object with props of different types w/o required', () => {
                const schema = createSchema({ one: 1, two: 'second' }, { noRequired: true });
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'string' } },
                });
            });
        });

        describe('nested array', () => {
            it('should generate schema for nested arrays', () => {
                const schema = createSchema([1, [2.1], [[3]]]);
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

            it('should generate schema for nested arrays and simplify anyOf', () => {
                const schema = createSchema([1, 'some string', null, [2, 'some other string', {}], [[3.1]]]);
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
            it('should combine object schemas and respect required property', () => {
                const schema = createSchema({
                    one: 1,
                    two: 'second',
                    three: { four: 5, five: [5], six: null, seven: [{}, { eight: 1.1 }, { nine: 'nine' }] },
                });
                expect(schema).toMatchSnapshot();
            });

            it('should generate schema for nested object with props of different types w/o required', () => {
                const schema = createSchema({ one: 1, two: { a: 'value' } }, { noRequired: true });
                expect(schema).toEqual({
                    type: 'object',
                    properties: {
                        one: { type: 'integer' },
                        two: { type: 'object', properties: { a: { type: 'string' } } },
                    },
                });
            });
        });

        describe('all cases combined', () => {
            it('should generate valid schemas for complex objects', () => {
                const schema = createSchema([
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

                expect(schema).toMatchSnapshot();
            });

            it('should consider value as required if it is present in all objects', async () => {
                const val = [
                    {
                        arr: [
                            {
                                prop1: 'test string',
                            },
                            {
                                prop2: 'test string',
                            },
                        ],
                    },
                    {
                        arr: [
                            {
                                prop1: 'test',
                            },
                        ],
                    },
                ];
                const schema = createSchema(val);
                expect(schema).toEqual({
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            arr: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        prop1: {
                                            type: 'string',
                                        },
                                        prop2: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                        required: ['arr'],
                    },
                });
            });
        });

        describe('prototype methods', () => {
            function createObjectWithProtoMethods(): Record<string, any> {
                return {
                    constructor: 'constructor value',
                    hasOwnProperty: 'hasOwnProperty value',
                    isPrototypeOf: 'isPrototypeOf value',
                    propertyIsEnumerable: 'propertyIsEnumerable value',
                    toLocaleString: 'toLocaleString value',
                    toString: 'toString value',
                    valueOf: 'valueOf value',
                    __defineGetter__: '__defineGetter__ value',
                    __defineSetter__: '__defineSetter__ value',
                    __lookupGetter__: '__lookupGetter__ value',
                    __lookupSetter__: '__lookupSetter__ value',
                    __proto__: '__proto__ value',
                };
            }

            it('should work for props with the same names as Object.prototype methods', async () => {
                // it's improtant to keep them in array, as this is more complex case
                const value: any = [createObjectWithProtoMethods(), createObjectWithProtoMethods()];
                const schema = createSchema(value);
                expect(schema).toEqual({
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            constructor: { type: 'string' },
                            hasOwnProperty: { type: 'string' },
                            isPrototypeOf: { type: 'string' },
                            propertyIsEnumerable: { type: 'string' },
                            toLocaleString: { type: 'string' },
                            toString: { type: 'string' },
                            valueOf: { type: 'string' },
                            __defineGetter__: { type: 'string' },
                            __defineSetter__: { type: 'string' },
                            __lookupGetter__: { type: 'string' },
                            __lookupSetter__: { type: 'string' },
                        },
                    },
                });
            });
        });

        describe('circular refs', () => {
            it('should throw an error w/ explanation', async () => {
                const a: any = {};
                const b: any = {};
                a.b = b;
                b.a = a;

                expect(() => {
                    createSchema(a);
                }).toThrowErrorMatchingSnapshot();
            });
        });

        describe('non-json values', () => {
            it('should ignore functions', async () => {
                const value: any = {
                    func() {},
                    someProp: 'string',
                };
                const schema = createSchema(value);
                expect(schema).toEqual({
                    type: 'object',
                    properties: {
                        someProp: {
                            type: 'string',
                        },
                    },
                    required: ['someProp'],
                });
            });
        });
    });

    describe('createCompoundSchema', () => {
        it('should create compound schema from multiple inputs', () => {
            const schema = createCompoundSchema([{ age: 35 }, { age: 19, name: 'John' }, { age: 23, admin: true }]);
            expect(schema).toEqual({
                type: 'object',
                properties: { admin: { type: 'boolean' }, age: { type: 'integer' }, name: { type: 'string' } },
                required: ['age'],
            });
        });
    });

    describe('merging', () => {
        it('should merge simple schemas', () => {
            const merged = mergeSchemas([{ type: ValueType.Number }, { type: ValueType.String }]);
            expect(merged).toEqual({ type: ['number', 'string'] });
        });

        it('should merge array schemas', () => {
            const merged = mergeSchemas([
                {
                    type: ValueType.Array,
                    items: {
                        anyOf: [
                            {
                                type: [ValueType.Number, ValueType.String],
                            },
                            {
                                type: ValueType.Array,
                            },
                        ],
                    },
                },
                { type: ValueType.String },
            ]);
            expect(merged).toEqual({
                anyOf: [
                    { type: ValueType.String },
                    {
                        type: ValueType.Array,
                        items: { type: [ValueType.Number, ValueType.String, ValueType.Array] },
                    },
                ],
            });
        });

        it('should merge object schemas', async () => {
            const merged = mergeSchemas([
                { type: ValueType.Object },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String } } },
            ]);
            expect(merged).toEqual({
                type: ValueType.Object,
                properties: { prop1: { type: ValueType.String } },
            });
        });

        it('should merge more than 2 schemas', async () => {
            const merged = mergeSchemas([
                { type: ValueType.Number },
                { type: ValueType.String },
                { type: ValueType.Boolean },
            ]);
            expect(merged).toEqual({ type: ['boolean', 'number', 'string'] });
        });
    });

    describe('extending', () => {
        it('should extend simple schemas', () => {
            const merged = extendSchema({ type: ValueType.Number }, 'some string');
            expect(merged).toEqual({ type: ['number', 'string'] });
        });

        it('should extend array schemas', () => {
            const merged = extendSchema(
                {
                    type: ValueType.Array,
                    items: {
                        anyOf: [
                            {
                                type: [ValueType.Number, ValueType.String],
                            },
                            {
                                type: ValueType.Array,
                            },
                        ],
                    },
                },
                'some string'
            );
            expect(merged).toEqual({
                anyOf: [
                    { type: ValueType.String },
                    {
                        type: ValueType.Array,
                        items: { type: [ValueType.Number, ValueType.String, ValueType.Array] },
                    },
                ],
            });
        });
    });
});
