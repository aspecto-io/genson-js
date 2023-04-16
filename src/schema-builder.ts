import { Schema, SchemaGenOptions, ValueType } from './types';


const partition = <T>(arr: T[], criteria: (a: T) => boolean) => arr.reduce((acc, i) => {acc[criteria(i) ? 0 : 1].push(i); return acc}, [[], []]);

function createSchemaFor(value: any, options?: SchemaGenOptions): Schema {
    const nullable = options?.restrictiveNulls ? {nullable: false} : {};
    switch (typeof value) {
        case 'number':
            if (Number.isInteger(value)) {
                return { type: ValueType.Integer, ...nullable };
            }
            return { type: ValueType.Number, ...nullable };
        case 'boolean':
            return { type: ValueType.Boolean, ...nullable };
        case 'string':
            return { type: ValueType.String, ...nullable };
        case 'object':
            if (value === null) {
                return { type: ValueType.Null, ...(options?.restrictiveNulls ? { nullable: true } : {}) };
            }
            if (Array.isArray(value)) {
                return createSchemaForArray(value, options);
            }
            return createSchemaForObject(value, options);
    }
}

function createSchemaForArray(arr: Array<any>, options?: SchemaGenOptions): Schema {
    const nullable = options?.restrictiveNulls ? {nullable: false} : {};
    if (arr.length === 0) {
        return { type: ValueType.Array, ...nullable};
    }
    const elementSchemas = arr.map((value) => createSchemaFor(value, options));
    const items = combineSchemas(elementSchemas);
    let minItems;
    if(options?.restrictiveArrays) {
        minItems = options.minItemsOverride ?? arr.length;
    }
    return { type: ValueType.Array, items, ...(minItems && { minItems }), ...nullable };
}

function createSchemaForObject(obj: Object, options?: SchemaGenOptions): Schema {
    const nullable = options?.restrictiveNulls ? {nullable: false} : {};
    const additionalProps = options?.additionalProperties ? {additionalProperties: true} : {};
    const keys = Object.keys(obj);
    if (keys.length === 0) {
        return {
            type: ValueType.Object,
            ...nullable,
            ...additionalProps,
        };
    }
    const properties = Object.entries(obj).reduce((props, [key, val]) => {
        props[key] = createSchemaFor(val, options);
        return props;
    }, {});

    const schema: Schema = { type: ValueType.Object, properties, ...nullable, ...additionalProps };
    if (!options?.noRequired) {
        schema.required = keys;
    }
    return schema;
}

function combineSchemas(schemas: Schema[], options?: SchemaGenOptions): Schema {
    const schemasByType: Record<ValueType, Schema[]> = {
        [ValueType.Null]: [],
        [ValueType.Boolean]: [],
        [ValueType.Integer]: [],
        [ValueType.Number]: [],
        [ValueType.String]: [],
        [ValueType.Array]: [],
        [ValueType.Object]: [],
    };

    const unwrappedSchemas = unwrapSchemas(schemas);
    for (const unwrappedSchema of unwrappedSchemas) {
        const type = unwrappedSchema.type as ValueType;
        if (schemasByType[type].length === 0 || isContainerSchema(unwrappedSchema)) {
            schemasByType[type].push(unwrappedSchema);
        }
    }

    const resultSchemasByType: Record<ValueType, Schema> = {
        [ValueType.Null]: schemasByType[ValueType.Null][0],
        [ValueType.Boolean]: schemasByType[ValueType.Boolean][0],
        [ValueType.Number]: schemasByType[ValueType.Number][0],
        [ValueType.Integer]: schemasByType[ValueType.Integer][0],
        [ValueType.String]: schemasByType[ValueType.String][0],
        [ValueType.Array]: combineArraySchemas(schemasByType[ValueType.Array], options),
        [ValueType.Object]: combineObjectSchemas(schemasByType[ValueType.Object], options),
    };

    if (resultSchemasByType[ValueType.Number]) {
        // if at least one value is float, others can be floats too
        delete resultSchemasByType[ValueType.Integer];
    }

    const schemasFound = Object.values(resultSchemasByType).filter(Boolean);
    const multiType = schemasFound.length > 1;
    if (multiType) {
        return wrapAnyOfSchema({ anyOf: schemasFound }, options);
    }
    return schemasFound[0] as Schema;
}

function combineArraySchemas(schemas: Schema[], options?: SchemaGenOptions): Schema {
    if (!schemas || schemas.length === 0) {
        return undefined;
    }
    const nullableArr: boolean[] = [];
    const itemSchemas: Schema[] = [];
    for (const schema of schemas) {
        nullableArr.push(schema.nullable ?? true);
        if (!schema.items) continue;
        const unwrappedSchemas = unwrapSchema(schema.items);
        itemSchemas.push(...unwrappedSchemas);
    }

    if(options?.restrictiveNulls && !options?.mergeToLessRestrictive) {
        const firstSchema = schemas[0].items;
        const allSame = schemas.reduce((acc, schema) => acc && isSameSchema(firstSchema, schema.items), true);

        if(allSame && nullableArr.indexOf(false) > -1) {
            return {...schemas[0], nullable: false};
        }

        const [nullable, nonNullable] = partition(schemas, s => s.nullable);
        if(nonNullable.length > 0 && nullable.length > 0) {
            return {
                anyOf: [
                    combineArraySchemas(nonNullable, options),
                    combineArraySchemas(nullable, options),
                ]
            }
        }
    }

    if (options?.mergeToLessRestrictive && schemas.length !== schemas.filter(schema => !!schema.items).length) {
        return {
            type: ValueType.Array,
        };
    }

    let minItems = options?.minItemsOverride;
    for (const schema of schemas) {
        if (!schema.minItems) {
            minItems = undefined;
            break;
        }
        if(minItems === undefined) {
            minItems = schema.minItems;
        } else {
            minItems = Math.min(minItems, schema.minItems);
        }
    }

    if (itemSchemas.length === 0) {
        return {
            type: ValueType.Array,
        };
    }

    const items = combineSchemas(itemSchemas);
    return {
        type: ValueType.Array,
        items,
        ...(minItems && (minItems !== 0 ? { minItems } : {})),
        ...(nullableArr.indexOf(false) > -1 ? {nullable: (!!options?.mergeToLessRestrictive && nullableArr.indexOf(true) > -1)} : {}),
    };
}

const isSameSchema = (schema1: Schema, schema2: Schema) => {
    if(schema1 === undefined || schema2 === undefined) {
        return schema1 === schema2;

    }
    if(schema1.type !== schema2.type) {
        return false;
    }
    if(schema1.type === ValueType.Array) {
        return isSameSchema(schema1.items, schema2.items);
    }
    if(schema1.type === ValueType.Object) {
        const keys1 = Object.keys(schema1.properties);
        const keys2 = Object.keys(schema2.properties);
        if(keys1.length !== keys2.length) {
            return false;
        }
        for(const key of keys1) {
            if(!isSameSchema(schema1.properties[key], schema2.properties[key])) {
                return false;
            }
        }
        return true;
    }
    return true;
}

function combineObjectSchemas(schemas: Schema[], options?: SchemaGenOptions): Schema {
    if (!schemas || schemas.length === 0) {
        return undefined;
    }
    const nullableArr: boolean[] = [];
    schemas.forEach((schema) => {
        nullableArr.push(schema.nullable ?? true);
    })
    const additionalProps: boolean[] = [];
    schemas.forEach((schema) => {
        additionalProps.push(schema.additionalProperties ?? true);
    })
    if(options?.restrictiveNulls && !options?.mergeToLessRestrictive) {
        const [nullable, nonNullable] = partition(schemas, s => s.nullable ?? true);
        if(nonNullable.length > 0 && nullable.length > 0) {
            return {
                anyOf: [
                    combineObjectSchemas(nonNullable, options),
                    combineObjectSchemas(nullable, options),
                ]
            }
        }
    }
    const allPropSchemas = schemas.map((s) => s.properties).filter(Boolean);
    if(options?.mergeToLessRestrictive && allPropSchemas.length !== schemas.length) {
        return {
            type: ValueType.Object,
            ...(nullableArr.indexOf(false) > -1 ? {nullable: (!!options?.mergeToLessRestrictive && nullableArr.indexOf(true) > -1)} : {}),
            ...(additionalProps.indexOf(true) > -1 ?  {} : {additionalProperties: false}),
        }
    }
    const schemasByProp: Record<string, Schema[][]> = Object.create(null);
    for (const propSchemas of allPropSchemas) {
        for (const [prop, schema] of Object.entries(propSchemas)) {
            if (!schemasByProp[prop]) {
                schemasByProp[prop] = [];
            }
            const unwrappedSchemas = unwrapSchema(schema);
            schemasByProp[prop].push(unwrappedSchemas);
        }
    }

    if(options?.mergeToLessRestrictive) {
        for (const [prop, subschemas] of Object.entries(schemasByProp)) {
            if(subschemas.length !== schemas.length) {
                delete schemasByProp[prop];
            }
        }
    }

    const properties: Record<string, Schema> = Object.entries(schemasByProp).reduce((props, [prop, schemaArr]) => {
        const schemas = schemaArr.reduce((acc, s) => [...acc, ...s], []);
        if (schemas.length === 1) {
            props[prop] = schemas[0];
        } else {
            const combined = combineSchemas(schemas, options);
            if(!(options?.restrictiveNulls ?? false)) {
                const [nullable, nonNullable] = partition(schemas, s => s.nullable);
                if(nonNullable.length > 0 && nullable.length > 0) {
                    delete combined.nullable;
                }
            }
            props[prop] = combined;
        }
        return props;
    }, {});

    const combinedSchema: Schema = { type: ValueType.Object };

    if (Object.keys(properties).length > 0) {
        combinedSchema.properties = properties;
    }
    if (!options?.noRequired) {
        const required = intersection(schemas.map((s) => s.required || []));
        if (required.length > 0) {
            combinedSchema.required = required;
        }
    }
    if(nullableArr.indexOf(false) > -1) {
        if (!(options?.mergeToLessRestrictive && nullableArr.indexOf(true) > -1)) {
            combinedSchema.nullable = false;
        }
    }

    if(additionalProps.indexOf(true) === -1) {
        combinedSchema.additionalProperties = false;
    }

    return combinedSchema;
}

export function unwrapSchema(schema: Schema): Schema[] {
    if (!schema) return [];
    if (schema.anyOf) {
        return unwrapSchemas(schema.anyOf);
    }
    if (Array.isArray(schema.type)) {
        return schema.type.map((x) => ({ type: x }));
    }
    return [schema];
}

export function unwrapSchemas(schemas: Schema[]): Schema[] {
    if (!schemas || schemas.length === 0) return [];
    return schemas.flatMap((schema) => unwrapSchema(schema));
}

export function wrapAnyOfSchema(schema: Schema, options?: SchemaGenOptions): Schema {
    const simpleSchemas = [];
    const complexSchemas = [];
    let nullable: boolean = undefined;
    for (const subSchema of schema.anyOf) {
        if (isSimpleSchema(subSchema) && !options?.restrictiveNulls) {
            if(Array.isArray(subSchema.type)) {
                simpleSchemas.push(...subSchema.type);
            } else {
                simpleSchemas.push((subSchema as Schema).type);
            }
            nullable = true;
        } else if (isSimpleSchema(subSchema) && options?.restrictiveNulls) {
            if (nullable === undefined || nullable === true) {
                if(Array.isArray(subSchema.type)) {
                    simpleSchemas.push(...subSchema.type);
                } else {
                    simpleSchemas.push((subSchema as Schema).type);
                }
                nullable = true;
            } else {
                complexSchemas.push(subSchema);
            }
        } else if (isSimpleSchemaWithNullable(subSchema) && !options?.restrictiveNulls) {
            if(Array.isArray(subSchema.type)) {
                simpleSchemas.push(...subSchema.type);
            } else {
                simpleSchemas.push((subSchema as Schema).type);
            }
            nullable = nullable === undefined ? subSchema.nullable : nullable || subSchema.nullable;
        } else if (isSimpleSchemaWithNullable(subSchema) && options?.restrictiveNulls) {
            if (nullable === undefined) {
                if(Array.isArray(subSchema.type)) {
                    simpleSchemas.push(...subSchema.type);
                } else {
                    simpleSchemas.push((subSchema as Schema).type);
                }
                nullable = subSchema.nullable;
            } else if (nullable === subSchema.nullable) {
                if(Array.isArray(subSchema.type)) {
                    simpleSchemas.push(...subSchema.type);
                } else {
                    simpleSchemas.push((subSchema as Schema).type);
                }
            } else {
                complexSchemas.push(subSchema);
            }
        } else {
            complexSchemas.push(subSchema);
        }
    }
    if (complexSchemas.length === 0) {
        return { type: simpleSchemas, ...(nullable === undefined ? {} : (nullable ? {} : {nullable})) };
    }
    const anyOf = [];
    if (simpleSchemas.length > 0) {
        anyOf.push({ type: simpleSchemas.length > 1 ? simpleSchemas : simpleSchemas[0], ...(nullable === undefined ? {} : (nullable ? {} : {nullable}))});
    }
    anyOf.push(...complexSchemas);
    return { anyOf };
}

function intersection(valuesArr: string[][]) {
    if (valuesArr.length === 0) return [];
    const arrays = valuesArr.filter(Array.isArray);
    const counter: Record<string, number> = {};
    for (const arr of arrays) {
        for (const val of arr) {
            if (!counter[val]) {
                counter[val] = 1;
            } else {
                counter[val]++;
            }
        }
    }
    return Object.entries(counter)
        .filter(([_, value]) => value === arrays.length)
        .map(([key]) => key);
}

function isSimpleSchema(schema: Schema): boolean {
    const keys = Object.keys(schema);
    return keys.length === 1 && keys[0] === 'type';
}

function isSimpleSchemaWithNullable(schema: Schema): boolean {
    const keys = Object.keys(schema);
    return keys.length === 2 && keys.indexOf('type') > -1 && keys.indexOf('nullable') > -1;
}

function isContainerSchema(schema: Schema): boolean {
    const type = (schema as Schema).type;
    return type === ValueType.Array || type === ValueType.Object;
}

// FACADE

export function createSchema(value: any, options?: SchemaGenOptions): Schema {
    if (typeof value === 'undefined') value = null;
    const clone = JSON.parse(JSON.stringify(value));
    return createSchemaFor(clone, options);
}

export function mergeSchemas(schemas: Schema[], options?: SchemaGenOptions): Schema {
    return combineSchemas(schemas, options);
}

export function extendSchema(schema: Schema, value: any, options?: SchemaGenOptions): Schema {
    const valueSchema = createSchema(value, options);
    return combineSchemas([schema, valueSchema], options);
}

export function createCompoundSchema(values: any[], options?: SchemaGenOptions): Schema {
    const schemas = values.map((value) => createSchema(value, options));
    return mergeSchemas(schemas, options);
}
