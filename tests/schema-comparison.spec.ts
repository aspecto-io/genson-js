import { areSchemasEqual, ValueType, generateSchema } from '../src';

describe('Schema Comparison', () => {
    describe('simple schemas', () => {
        it('should compare by type', async () => {
            const equal = areSchemasEqual({ type: ValueType.Number }, { type: ValueType.Number });
            expect(equal).toBe(true);
        });

        it('should compare by props', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } }
            );
            expect(equal).toBe(true);
        });

        it('should compare by props not eq', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } },
                { type: ValueType.Object, properties: { test: { type: ValueType.Number } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by props not eq (properties=undefined)', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object },
                { type: ValueType.Object, properties: { test: { type: ValueType.Number } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by props not eq (properties={})', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: {} },
                { type: ValueType.Object, properties: { test: { type: ValueType.Number } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by required', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] }
            );
            expect(equal).toBe(true);
        });

        it('should compare by required not equal', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: [] }
            );
            expect(equal).toBe(false);
        });

        it('should compare by required not equal (required=undefined)', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by items', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Array, items: { type: ValueType.String } },
                { type: ValueType.Array, items: { type: ValueType.String } }
            );
            expect(equal).toBe(true);
        });

        it('should compare by items not eq', async () => {
            const equal = areSchemasEqual(
                { type: ValueType.Array, items: { type: ValueType.String } },
                { type: ValueType.Array, items: { type: ValueType.Number } }
            );
            expect(equal).toBe(false);
        });
    });

    describe('simple wrapped schemas', () => {
        it('should compare wrapped and unwrapped', async () => {
            const equal = areSchemasEqual({ type: ValueType.Number }, { type: [ValueType.Number] });
            expect(equal).toBe(true);
        });

        it('should compare wrapped and unwrapped not equal', async () => {
            const equal = areSchemasEqual({ type: ValueType.Number }, { type: [ValueType.String] });
            expect(equal).toBe(false);
        });

        it('should compare multiple wrapped types', async () => {
            const equal = areSchemasEqual(
                { type: [ValueType.Number, ValueType.String] },
                { type: [ValueType.String, ValueType.Number] }
            );
            expect(equal).toBe(true);
        });

        it('should compare multiple wrapped types not equal by length', async () => {
            const equal = areSchemasEqual(
                { type: [ValueType.Number, ValueType.String] },
                { type: [ValueType.String, ValueType.Number, ValueType.Number] }
            );
            expect(equal).toBe(false);
        });

        it('should compare multiple wrapped types not equal by type', async () => {
            const equal = areSchemasEqual(
                { type: [ValueType.Number, ValueType.String] },
                { type: [ValueType.String, ValueType.Boolean] }
            );
            expect(equal).toBe(false);
        });
    });

    describe('simple anyOf schemas', () => {
        it('should compare wrapped and unwrapped', async () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }] },
                { anyOf: [{ type: [ValueType.Number] }] }
            );
            expect(equal).toBe(true);
        });

        it('should compare wrapped and unwrapped not equal', async () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }] },
                { anyOf: [{ type: [ValueType.String] }] }
            );
            expect(equal).toBe(false);
        });

        it('should compare multiple wrapped types', async () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.String }] },
                { anyOf: [{ type: [ValueType.String, ValueType.Number] }] }
            );
            expect(equal).toBe(true);
        });

        it('should compare multiple unwrapped types', async () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.String }] },
                { anyOf: [{ type: ValueType.String }, { type: ValueType.Number }] }
            );
            expect(equal).toBe(true);
        });

        it('should compare multiple unwrapped types not equal by length', async () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.String }, { type: ValueType.Number }] },
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.String }, { type: ValueType.String }] }
            );
            expect(equal).toBe(false);
        });

        it('should compare multiple unwrapped types not equal by type', async () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.String }, { type: ValueType.Number }] },
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.Boolean }] }
            );
            expect(equal).toBe(false);
        });
    });

    describe('complex schemas', () => {
        it('should compare complex schemas', async () => {
            const schema1 = {
                type: ValueType.Array,
                items: {
                    type: ValueType.Object,
                    properties: {
                        lvl1PropNum: {
                            type: ValueType.Number,
                        },
                        lvl1PropStr: {
                            type: ValueType.String,
                        },
                        lvl1PropObj1: {
                            type: ValueType.Object,
                            properties: {
                                lvl2PropArr: {
                                    type: ValueType.Array,
                                    items: {
                                        type: [ValueType.Null, ValueType.Boolean, ValueType.Number, ValueType.String],
                                    },
                                },
                            },
                            required: ['lvl2PropArr'],
                        },
                        lvl1PropObj2: {
                            type: ValueType.Object,
                            properties: {
                                lvl2PropNum1: {
                                    type: ValueType.Integer,
                                },
                                lvl2PropArr1: {
                                    type: ValueType.Array,
                                    items: {
                                        type: ValueType.Integer,
                                    },
                                },
                                six: {
                                    type: ValueType.Null,
                                },
                                lvl2PropArr2: {
                                    type: ValueType.Array,
                                    items: {
                                        anyOf: [
                                            {
                                                type: [ValueType.Integer, ValueType.String],
                                            },
                                            {
                                                type: ValueType.Array,
                                                items: {
                                                    type: [ValueType.Boolean, ValueType.Integer],
                                                },
                                            },
                                            {
                                                type: ValueType.Object,
                                                properties: {
                                                    lvl3PropNum1: {
                                                        type: ValueType.Number,
                                                    },
                                                    lvl3PropStr1: {
                                                        type: ValueType.String,
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
            };

            const schema2 = {
                type: ValueType.Array,
                items: {
                    type: ValueType.Object,
                    properties: {
                        lvl1PropNum: {
                            type: [ValueType.Number],
                        },
                        lvl1PropStr: {
                            type: [ValueType.String],
                        },
                        lvl1PropObj1: {
                            type: ValueType.Object,
                            properties: {
                                lvl2PropArr: {
                                    type: ValueType.Array,
                                    items: {
                                        type: [ValueType.Boolean, ValueType.Null, ValueType.Number, ValueType.String],
                                    },
                                },
                            },
                            required: ['lvl2PropArr'],
                        },
                        lvl1PropObj2: {
                            type: ValueType.Object,
                            properties: {
                                lvl2PropNum1: {
                                    type: ValueType.Integer,
                                },
                                lvl2PropArr1: {
                                    type: ValueType.Array,
                                    items: {
                                        type: ValueType.Integer,
                                    },
                                },
                                lvl2PropArr2: {
                                    type: ValueType.Array,
                                    items: {
                                        anyOf: [
                                            {
                                                type: [ValueType.String, ValueType.Integer],
                                            },
                                            {
                                                type: ValueType.Object,
                                                properties: {
                                                    lvl3PropStr1: {
                                                        type: ValueType.String,
                                                    },
                                                    lvl3PropNum1: {
                                                        type: ValueType.Number,
                                                    },
                                                },
                                            },
                                            {
                                                type: ValueType.Array,
                                                items: {
                                                    type: [ValueType.Boolean, ValueType.Integer],
                                                },
                                            },
                                        ],
                                    },
                                },
                                six: {
                                    type: ValueType.Null,
                                },
                            },
                            required: ['lvl2PropArr1', 'lvl2PropNum1', 'six', 'lvl2PropArr2'],
                        },
                    },
                    required: ['lvl1PropStr'],
                },
            };

            expect(areSchemasEqual(schema1, schema2)).toBe(true);
        });
    });
});
