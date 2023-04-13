import { createCompoundSchema, createSchema, extendSchema, mergeSchemas, ValueType } from '../src';
import { beforeEach, describe, expect, it } from '@jest/globals';
import Ajv from 'ajv';

let ajv;
describe('SchemaBuilder', () => {
    beforeEach(() => {
        ajv = new Ajv({ allowUnionTypes: true, verbose: true, strict: true });
    });
    describe('generation', () => {
        describe('simple types', () => {
            it('should build schema for integer', () => {
                const data = 1
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'integer' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for number', () => {
                const data = 1.1
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'number' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for string', () => {
                const data = 'some string'
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'string' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for null', () => {
                const data = null;
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'null' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for boolean', () => {
                const data = false;
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'boolean' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for array', () => {
                const data = [];
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'array' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for object', () => {
                const data = {};
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'object' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should build schema for undefined', () => {
                const data = undefined;
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'null' });
                // Ajv does not validate undefined as nulls!
            });
        });

        describe('arrays', () => {
            it('it should generate schema for arrays of the same type', () => {
                const data = [1, 2, 3];
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'array', items: { type: 'integer' } });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should generate schema for arrays of the same type with floats', () => {
                const data = [1, 2.1, 3];
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'array', items: { type: 'number' } });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should generate schema for arrays of different primitive types', () => {
                const data = [1, 1.1, 'string', null, false, true];
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'number', 'string'] } });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should generate schema for arrays of different primitive types and ints only', () => {
                const data = [1, 'string', null, false, true];
                const schema = createSchema(data);
                expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'integer', 'string'] } });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should add minItems if restrictiveArrays', () => {
                const data = [1, 'string', null, false, true];
                const schema = createSchema(data, {restrictiveArrays: true});
                expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'integer', 'string'] }, minItems: 5 });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should add minItems if restrictiveArrays and minItemsOverride', () => {
                const data = [1, 'string', null, false, true];
                const schema = createSchema(data, {restrictiveArrays: true, minItemsOverride: 1});
                expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'integer', 'string'] }, minItems: 1 });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should not add minItems if restrictiveArrays and/or minItemsOverride if the given array is empty', () => {
                const data = [];
                const schema = createSchema(data, {restrictiveArrays: true, minItemsOverride: 1});
                expect(schema).toEqual({ type: 'array' });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });
        });

        describe('objects', () => {
            it('it should generate schema for object with props of the same type', () => {
                const data = { one: 1, two: 2 };
                const schema = createSchema(data);
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'integer' } },
                    required: ['one', 'two'],
                });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should generate schema for object with props of different types', () => {
                const data = { one: 1, two: 'second' };
                const schema = createSchema(data);
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'string' } },
                    required: ['one', 'two'],
                });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should generate schema for object with props of different types w/o required', () => {
                const data = { one: 1, two: 'second' };
                const schema = createSchema(data, { noRequired: true });
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'string' } },
                });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('it should generate schema for object with allowing additional props', () => {
                const data = { one: 1, two: 2 };
                const schema = createSchema(data, {additionalProperties: true});
                expect(schema).toEqual({
                    type: 'object',
                    properties: { one: { type: 'integer' }, two: { type: 'integer' } },
                    required: ['one', 'two'],
                    additionalProperties: true,
                });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });
        });

        describe('restrictive nulls', () => {
            it.each([[[], [1], {}, {a: 1}, "a", 1, 1.2, true]])('should build schema with nullable false without restrictiveNulls', (s) => {
                const schema = createSchema(s, {restrictiveNulls: true});
                expect(schema.nullable).toBeFalsy();
                const validate = ajv.compile(schema);
                expect(validate(s)).toBeTruthy();
            });
            it.each([null, undefined])('should build schema with nullable true with restrictiveNulls', (s) => {
                const schema = createSchema(s, {restrictiveNulls: true});
                expect(schema.nullable).toBeTruthy();
                // Ajv does not validate undefined as nulls!
                if(s !== undefined) {
                    const validate = ajv.compile(schema);
                    expect(validate(s)).toBeTruthy();
                }
            });
        });

        describe('nested array', () => {
            it('should generate schema for nested arrays', () => {
                const data = [1, [2.1], [[3]]];
                const schema = createSchema(data);
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
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should generate schema for nested arrays and simplify anyOf', () => {
                const data = [1, 'some string', null, [2, 'some other string', {}], [[3.1]]];
                const schema = createSchema(data);
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
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });
        });

        describe('nested objects/arrays', () => {
            it('should combine object schemas and respect required property', () => {
                const data = {
                    one: 1,
                    two: 'second',
                    three: { four: 5, five: [5], six: null, seven: [{}, { eight: 1.1 }, { nine: 'nine' }] },
                };
                const schema = createSchema(data);
                expect(schema).toMatchSnapshot();
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should generate schema for nested object with props of different types w/o required', () => {
                const data = { one: 1, two: { a: 'value' } }
                const schema = createSchema(data, { noRequired: true });
                expect(schema).toEqual({
                    type: 'object',
                    properties: {
                        one: { type: 'integer' },
                        two: { type: 'object', properties: { a: { type: 'string' } } },
                    },
                });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });
        });

        describe('all cases combined', () => {
            it('should generate valid schemas for complex objects', () => {
                const data = [
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
                ];
                const schema = createSchema(data);
                expect(schema).toMatchSnapshot();
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should consider value as required if it is present in all objects', async () => {
                const data = [
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
                const schema = createSchema(data);
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
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
            });

            it('should generate schema for array of objects w/o required', () => {
                const data = [
                        { one: 'a', two: 'b' },
                        { one: 'aa', two: 'bb' },
                    ]
                const schema = createSchema(
                    data,
                    { noRequired: true }
                );
                expect(schema).toEqual({
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            one: { type: 'string' },
                            two: { type: 'string' },
                        },
                    },
                });
                const validate = ajv.compile(schema);
                expect(validate(data)).toBeTruthy();
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
            const dataArr = [{ age: 35 }, { age: 19, name: 'John' }, { age: 23, admin: true }]
            const schema = createCompoundSchema(dataArr);
            expect(schema).toEqual({
                type: 'object',
                properties: { admin: { type: 'boolean' }, age: { type: 'integer' }, name: { type: 'string' } },
                required: ['age'],
            });
            const validate = ajv.compile(schema);
            dataArr.forEach(data => {
                expect(validate(data)).toBeTruthy();
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

        it('should merge arrays', () => {
            const merged = mergeSchemas([{ type: ValueType.Array, items: {type: ValueType.String} }, { type: ValueType.Array, items: {type: ValueType.Number} }]);
            expect(merged).toEqual({ type: ValueType.Array, items: {type: [ValueType.Number, ValueType.String]} });
        });

        it('should merge arrays with minItems', () => {
            const merged = mergeSchemas([{ type: ValueType.Array, items: {type: ValueType.String}, minItems: 4 }, { type: ValueType.Array, items: {type: ValueType.Number}, minItems: 2 }]);
            expect(merged).toEqual({ type: ValueType.Array, items: {type: [ValueType.Number, ValueType.String]}, minItems: 2 });
        });

        it('should merge arrays with minItems', () => {
            const merged = mergeSchemas([{ type: ValueType.Array, items: {type: ValueType.String}, minItems: 4 }, { type: ValueType.Array, items: {type: ValueType.Number}, minItems: 2 }], {minItemsOverride: 1});
            expect(merged).toEqual({ type: ValueType.Array, items: {type: [ValueType.Number, ValueType.String]}, minItems: 1 });
        });

        it('should merge nullable false schemas if both not nullable', () => {
            const merged = mergeSchemas([{ type: ValueType.Number, nullable: false }, { type: ValueType.String, nullable: false }]);
            expect(merged).toEqual({ type: ['number', 'string'], nullable: false });
        });

        it('should merge nullable false schemas if any of them is nullable', () => {
            const merged = mergeSchemas([{ type: ValueType.Number, nullable: false }, { type: ValueType.String }]);
            expect(merged).toEqual({ type: ['number', 'string'] });
        });

        it('should merge nullable false schemas if any of them is nullable and restrictiveNulls', () => {
            const merged = mergeSchemas([{ type: ValueType.Number, nullable: false }, { type: ValueType.String }], {restrictiveNulls: true});
            expect(merged).toEqual({
                anyOf: [
                    { type: ValueType.Number, nullable: false },
                    { type: ValueType.String },
                ],
            });
        });

        it('should merge nullable false arrays', () => {
            const merged = mergeSchemas([{ type: ValueType.Array, items: {type: ValueType.String}, nullable: false }, { type: ValueType.Array, items: {type: ValueType.Number}, nullable: false }], {minItemsOverride: 1});
            expect(merged).toEqual({ type: ValueType.Array, items: {type: [ValueType.Number, ValueType.String]}, nullable: false });
        });

        it('should not merge nullable difference arrays in restrictiveNulls mode', () => {
            const merged = mergeSchemas([{ type: ValueType.Array, items: {type: ValueType.String}, nullable: false }, { type: ValueType.Array, items: {type: ValueType.Number}, nullable: true }], {restrictiveNulls: true});
            expect(merged).toEqual({
                anyOf: [
                    { type: ValueType.Array, items: {type: ValueType.String}, nullable: false },
                    { type: ValueType.Array, items: {type: ValueType.Number} },
                ],
            });
        });

        it('should still merge nullable difference arrays in restrictiveNulls mode if they are same type', () => {
            const merged = mergeSchemas([
                { type: ValueType.Array, items: {type: ValueType.String}, nullable: false },
                { type: ValueType.Array, items: {type: ValueType.String}, nullable: true }
            ], {restrictiveNulls: true});
            expect(merged).toEqual({
                type: ValueType.Array,
                items: {type: ValueType.String},
                nullable: false
            });
        });

        it('should merge nullable false objects', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: {prop1: {type: ValueType.String}}, nullable: false },
                { type: ValueType.Object, properties: {prop1: {type: ValueType.Number}}, nullable: false }
            ], {restrictiveNulls: true});
            expect(merged).toEqual({
                type: ValueType.Object,
                properties: {prop1: {type: [ValueType.Number, ValueType.String]}},
                nullable: false
            });
        });

        it('should not merge nullable difference objects in restrictiveNulls mode', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: {prop1: {type: ValueType.String}}, nullable: false },
                { type: ValueType.Object, properties: {prop1: {type: ValueType.Number}}, nullable: true }
            ], {restrictiveNulls: true});
            expect(merged).toEqual({
                anyOf: [
                    { type: ValueType.Object, properties: {prop1: {type: ValueType.String}}, nullable: false },
                    { type: ValueType.Object, properties: {prop1: {type: ValueType.Number}} }
                ],
            });
        });

        it('should still merge nullable difference objects in restrictiveNulls mode 1', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String, nullable: false } } },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String, nullable: true } } },
            ], { restrictiveNulls: true });
            expect(merged).toEqual({
                    type: ValueType.Object,
                    properties: {prop1: {type: ValueType.String, nullable: false}},
                });
        });
        it('should still merge nullable difference objects in non restrictiveNulls mode', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String, nullable: false } } },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String, nullable: true } } },
            ], { restrictiveNulls: false });
            expect(merged).toEqual({
                type: ValueType.Object,
                properties: {prop1: {type: ValueType.String}},
            });
        });
        it('should still merge nullable difference objects in restrictiveNulls mode 2', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String } }, nullable: false },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.Integer } }, nullable: true },
            ], { restrictiveNulls: true });
            expect(merged).toEqual({
                anyOf: [
                    { type: ValueType.Object, properties: { prop1: { type: ValueType.String } }, nullable: false },
                    { type: ValueType.Object, properties: { prop1: { type: ValueType.Integer } } },
                ],
            });
        });

        it('should keep additional properties', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String } }, additionalProperties: true },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.Integer } }, additionalProperties: true },
            ]);
            expect(merged).toEqual(
                {
                    type: ValueType.Object,
                    properties: { prop1: { type: [ValueType.Integer, ValueType.String] } },
                },
            );
        });
        it('should keep additional properties v2', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String } }, additionalProperties: false },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.Integer } }, additionalProperties: false },
            ]);
            expect(merged).toEqual(
                {
                    type: ValueType.Object,
                    properties: { prop1: { type: [ValueType.Integer, ValueType.String] } },
                    additionalProperties: false
                },
            );
        });
        it('should prioritize additional properties', () => {
            const merged = mergeSchemas([
                { type: ValueType.Object, properties: { prop1: { type: ValueType.String } }, additionalProperties: true },
                { type: ValueType.Object, properties: { prop1: { type: ValueType.Integer } }, additionalProperties: false},
            ]);
            expect(merged).toEqual(
                {
                    type: ValueType.Object,
                    properties: { prop1: { type: [ValueType.Integer, ValueType.String] } },
                },
            );
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
