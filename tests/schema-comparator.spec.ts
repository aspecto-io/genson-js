import { areSchemasEqual, ValueType, isSubset } from '../src';
import { complexSchema1, complexSchema2 } from './fixtures';

describe('Schema Comparison', () => {
    describe('simple schemas', () => {
        it('should compare by type', () => {
            const equal = areSchemasEqual({ type: ValueType.Number }, { type: ValueType.Number });
            expect(equal).toBe(true);
        });

        it('should compare by props', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } }
            );
            expect(equal).toBe(true);
        });

        it('should compare by props not eq', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } },
                { type: ValueType.Object, properties: { test: { type: ValueType.Number } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by props not eq (properties=undefined)', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object },
                { type: ValueType.Object, properties: { test: { type: ValueType.Number } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by props not eq (properties={})', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: {} },
                { type: ValueType.Object, properties: { test: { type: ValueType.Number } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by required', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] }
            );
            expect(equal).toBe(true);
        });

        it('should compare by required not equal', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: [] }
            );
            expect(equal).toBe(false);
        });

        it('should compare by required not equal w/ ignore required', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: [] },
                { ignoreRequired: true }
            );
            expect(equal).toBe(true);
        });

        it('should compare by required not equal (required=undefined)', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Object, properties: { test: { type: ValueType.String } }, required: ['test'] },
                { type: ValueType.Object, properties: { test: { type: ValueType.String } } }
            );
            expect(equal).toBe(false);
        });

        it('should compare by items', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Array, items: { type: ValueType.String } },
                { type: ValueType.Array, items: { type: ValueType.String } }
            );
            expect(equal).toBe(true);
        });

        it('should compare by items not eq', () => {
            const equal = areSchemasEqual(
                { type: ValueType.Array, items: { type: ValueType.String } },
                { type: ValueType.Array, items: { type: ValueType.Number } }
            );
            expect(equal).toBe(false);
        });
    });

    describe('simple wrapped schemas', () => {
        it('should compare wrapped and unwrapped', () => {
            const equal = areSchemasEqual({ type: ValueType.Number }, { type: [ValueType.Number] });
            expect(equal).toBe(true);
        });

        it('should compare wrapped and unwrapped not equal', () => {
            const equal = areSchemasEqual({ type: ValueType.Number }, { type: [ValueType.String] });
            expect(equal).toBe(false);
        });

        it('should compare multiple wrapped types', () => {
            const equal = areSchemasEqual(
                { type: [ValueType.Number, ValueType.String] },
                { type: [ValueType.String, ValueType.Number] }
            );
            expect(equal).toBe(true);
        });

        it('should compare multiple wrapped types not equal by length', () => {
            const equal = areSchemasEqual(
                { type: [ValueType.Number, ValueType.String] },
                { type: [ValueType.String, ValueType.Number, ValueType.Number] }
            );
            expect(equal).toBe(false);
        });

        it('should compare multiple wrapped types not equal by type', () => {
            const equal = areSchemasEqual(
                { type: [ValueType.Number, ValueType.String] },
                { type: [ValueType.String, ValueType.Boolean] }
            );
            expect(equal).toBe(false);
        });
    });

    describe('simple anyOf schemas', () => {
        it('should compare wrapped and unwrapped', () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }] },
                { anyOf: [{ type: [ValueType.Number] }] }
            );
            expect(equal).toBe(true);
        });

        it('should compare wrapped and unwrapped not equal', () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }] },
                { anyOf: [{ type: [ValueType.String] }] }
            );
            expect(equal).toBe(false);
        });

        it('should compare multiple wrapped types', () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.String }] },
                { anyOf: [{ type: [ValueType.String, ValueType.Number] }] }
            );
            expect(equal).toBe(true);
        });

        it('should compare multiple unwrapped types', () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.String }] },
                { anyOf: [{ type: ValueType.String }, { type: ValueType.Number }] }
            );
            expect(equal).toBe(true);
        });

        it('should compare multiple unwrapped types not equal by length', () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.String }, { type: ValueType.Number }] },
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.String }, { type: ValueType.String }] }
            );
            expect(equal).toBe(false);
        });

        it('should compare multiple unwrapped types not equal by type', () => {
            const equal = areSchemasEqual(
                { anyOf: [{ type: ValueType.String }, { type: ValueType.Number }] },
                { anyOf: [{ type: ValueType.Number }, { type: ValueType.Boolean }] }
            );
            expect(equal).toBe(false);
        });
    });

    describe('complex schemas', () => {
        it('should compare complex schemas', () => {
            const schema1 = JSON.parse(JSON.stringify(complexSchema1));
            const schema2 = JSON.parse(JSON.stringify(complexSchema2));

            expect(areSchemasEqual(schema1, schema2)).toBe(true);

            schema2.items.properties.lvl1PropObj2.properties.lvl2PropArr2.items.anyOf[2].type = [
                ValueType.Boolean,
                ValueType.String,
            ];
            expect(areSchemasEqual(schema1, schema2)).toBe(false);
        });
    });

    describe('isSubset', () => {
        it('should return true is shemas are equal', async () => {
            const result = isSubset({ anyOf: [{ type: ValueType.Number }] }, { anyOf: [{ type: [ValueType.Number] }] });
            expect(result).toBe(true);
        });

        it('should return false if second schema is not a subset', async () => {
            const result = isSubset({ anyOf: [{ type: ValueType.Number }] }, { anyOf: [{ type: [ValueType.String] }] });
            expect(result).toBe(false);
        });

        it('should return false if second schema is a superset instead of subset', async () => {
            const result = isSubset(
                { anyOf: [{ type: ValueType.Number }] },
                { anyOf: [{ type: [ValueType.String, ValueType.Number] }] }
            );
            expect(result).toBe(false);
        });

        it('should return true if second schema is a subset', async () => {
            const result = isSubset(
                { anyOf: [{ type: [ValueType.String, ValueType.Number] }] },
                { anyOf: [{ type: ValueType.Number }] }
            );
            expect(result).toBe(true);
        });

        it('should return true if second schema is a subset (anyOf, simple)', async () => {
            const result = isSubset(
                { anyOf: [{ type: [ValueType.String, ValueType.Number] }] },
                { type: ValueType.Number }
            );
            expect(result).toBe(true);
        });

        it('should return true if second schema is a subset (array items, simple schema)', async () => {
            const result = isSubset(
                { type: ValueType.Array, items: { type: [ValueType.Boolean, ValueType.Integer] } },
                { type: ValueType.Array, items: { type: [ValueType.Boolean] } }
            );
            expect(result).toBe(true);
        });

        it('should return true if second schema is a subset (object props, simple schema)', async () => {
            const result = isSubset(
                { type: ValueType.Object, properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } } },
                { type: ValueType.Object }
            );
            expect(result).toBe(true);
        });

        it('should return true if second schema is a subset (object props, simple schema)', async () => {
            const result = isSubset(
                { type: ValueType.Object, properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } } },
                { type: ValueType.Object, properties: { propOne: { type: [ValueType.Integer] } } }
            );
            expect(result).toBe(true);
        });
        it('should return true if second schema is a subset (object props, simple schema, required)', async () => {
            const result = isSubset(
                {
                    type: ValueType.Object,
                    properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } },
                    required: ['propOne'],
                },
                { type: ValueType.Object, properties: { propOne: { type: [ValueType.Integer] } } }
            );
            expect(result).toBe(true);
        });

        it('should return false if second schema is not a subset (object props, simple schema, required)', async () => {
            const result = isSubset(
                {
                    type: ValueType.Object,
                    properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } },
                },
                {
                    type: ValueType.Object,
                    properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } },
                    required: ['propOne'],
                }
            );
            expect(result).toBe(false);
        });

        it('should return true if second schema is a subset (object props, simple schema, required ignored)', async () => {
            const result = isSubset(
                {
                    type: ValueType.Object,
                    properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } },
                },
                {
                    type: ValueType.Object,
                    properties: { propOne: { type: [ValueType.Boolean, ValueType.Integer] } },
                    required: ['propOne'],
                },
                { ignoreRequired: true }
            );
            expect(result).toBe(true);
        });
    });
});
