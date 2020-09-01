import { createSchemaFor } from '../src';
import { time } from 'console';

describe('SchemaBuilder', () => {
    describe('simple types', () => {
        it('should build schema for number', async () => {
            const schema = createSchemaFor(1);
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
            expect(schema).toEqual({ type: 'array', items: { type: 'number' } });
        });

        it('it should generate schema for arrays of different primitive types', async () => {
            const schema = createSchemaFor([1, 'string', null, false, true]);
            expect(schema).toEqual({ type: 'array', items: { type: ['null', 'boolean', 'number', 'string'] } });
        });
    });

    describe('objects', () => {
        it('it should generate schema for object with props of the same type', async () => {
            const schema = createSchemaFor({ one: 1, two: 2 });
            expect(schema).toEqual({
                type: 'object',
                properties: { one: { type: 'number' }, two: { type: 'number' } },
                required: ['one', 'two'],
            });
        });

        it('it should generate schema for object with props of different types', async () => {
            const schema = createSchemaFor({ one: 1, two: 'second' });
            expect(schema).toEqual({
                type: 'object',
                properties: { one: { type: 'number' }, two: { type: 'string' } },
                required: ['one', 'two'],
            });
        });
    });
});
