enum ValueType {
    Null = 'null',
    Boolean = 'boolean',
    Integer = 'integer',
    Number = 'number',
    String = 'string',
    Object = 'object',
    Array = 'array',
}

type Schema = {
    type?: ValueType | ValueType[];
    items?: Schema;
    properties?: Record<string, Schema>;
    required?: string[];
    anyOf?: Array<Schema>;
};

export function createSchemaFor(value: any): Schema {
    switch (typeof value) {
        case 'number':
            if (Number.isInteger(value)) {
                return { type: ValueType.Integer };
            }
            return { type: ValueType.Number };
        case 'boolean':
            return { type: ValueType.Boolean };
        case 'string':
            return { type: ValueType.String };
        case 'object':
            if (value === null) {
                return { type: ValueType.Null };
            }
            if (Array.isArray(value)) {
                return createSchemaForArray(value);
            }
            return createSchemaForObject(value);
    }
}

function createSchemaForArray(arr: Array<any>): Schema {
    if (arr.length === 0) {
        return { type: ValueType.Array };
    }
    const elementSchemas = arr.map((value) => createSchemaFor(value));
    const items = combineSchemas(elementSchemas);
    return { type: ValueType.Array, items };
}

function createSchemaForObject(obj: Object): Schema {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
        return {
            type: ValueType.Object,
        };
    }
    const properties = Object.entries(obj).reduce((props, [key, val]) => {
        props[key] = createSchemaFor(val);
        return props;
    }, {});
    return { type: ValueType.Object, properties, required: keys };
}

function combineSchemas(schemas: Schema[]): Schema {
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
        } else {
            continue;
        }
    }

    const resultSchemasByType: Record<ValueType, Schema> = {
        [ValueType.Null]: schemasByType[ValueType.Null][0],
        [ValueType.Boolean]: schemasByType[ValueType.Boolean][0],
        [ValueType.Number]: schemasByType[ValueType.Number][0],
        [ValueType.Integer]: schemasByType[ValueType.Integer][0],
        [ValueType.String]: schemasByType[ValueType.String][0],
        [ValueType.Array]: combineArraySchemas(schemasByType[ValueType.Array]),
        [ValueType.Object]: combineObjectSchemas(schemasByType[ValueType.Object]),
    };

    if (resultSchemasByType[ValueType.Number]) {
        // if at least one value is float, others can be floats too
        delete resultSchemasByType[ValueType.Integer];
    }

    const schemasFound = Object.values(resultSchemasByType).filter(Boolean);
    const multiType = schemasFound.length > 1;
    if (multiType) {
        const wrapped = wrapAnyOfSchema({ anyOf: schemasFound });
        return wrapped;
    }
    return schemasFound[0] as Schema;
}

function combineArraySchemas(schemas: Schema[]): Schema {
    if (!schemas || schemas.length === 0) {
        return undefined;
    }
    const itemSchemas: Schema[] = [];
    for (const schema of schemas) {
        if (!schema.items) continue;
        const unwrappedSchemas = unwrapSchema(schema.items);
        itemSchemas.push(...unwrappedSchemas);
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
    };
}

function combineObjectSchemas(schemas: Schema[]): Schema {
    if (!schemas || schemas.length === 0) {
        return undefined;
    }
    const propCounter: Record<string, number> = {};
    const allPropSchemas = schemas.map((s) => s.properties).filter(Boolean);
    const schemasByProp: Record<string, Schema[]> = {};
    for (const propSchemas of allPropSchemas) {
        for (const [prop, schema] of Object.entries(propSchemas)) {
            if (!schemasByProp[prop]) {
                schemasByProp[prop] = [];
            }
            const unwrappedSchema = unwrapSchema(schema);
            schemasByProp[prop].push(...unwrappedSchema);

            if (!propCounter[prop]) {
                propCounter[prop] = 1;
            } else {
                propCounter[prop]++;
            }
        }
    }

    const properties: Record<string, Schema> = Object.entries(schemasByProp).reduce((props, [prop, schemas]) => {
        if (schemas.length === 1) {
            props[prop] = schemas[0];
        } else {
            props[prop] = combineSchemas(schemas);
        }
        return props;
    }, {});

    const schemasCount = schemas.length;
    const required = Object.entries(propCounter)
        .filter(([, val]) => val === schemasCount)
        .map(([key]) => key);

    const combinedSchema: Schema = { type: ValueType.Object };

    if (Object.keys(properties).length > 0) {
        combinedSchema.properties = properties;
    }
    if (required.length > 0) {
        combinedSchema.required = required;
    }

    return combinedSchema;
}

function unwrapSchema(schema: Schema): Schema[] {
    if (!schema) return [];
    if (schema.anyOf) {
        return unwrapSchemas(schema.anyOf);
    }
    if (Array.isArray(schema.type)) {
        return schema.type.map((x) => ({ type: x }));
    }
    return [schema];
}

function unwrapSchemas(schemas: Schema[]): Schema[] {
    if (!schemas || schemas.length === 0) return [];
    const unwrappedSchemas = schemas.flatMap((schema) => unwrapSchema(schema));
    return unwrappedSchemas;
}

function wrapAnyOfSchema(schema: Schema): Schema {
    const simpleSchemas = [];
    const complexSchemas = [];
    for (const subSchema of schema.anyOf) {
        if (Array.isArray(subSchema.type)) {
            simpleSchemas.push(...subSchema.type);
        } else if (isSimpleSchema(subSchema)) {
            simpleSchemas.push((subSchema as Schema).type);
        } else {
            complexSchemas.push(subSchema);
        }
    }
    if (complexSchemas.length === 0) {
        return { type: simpleSchemas };
    }
    const anyOf = [];
    if (simpleSchemas.length > 0) {
        anyOf.push({ type: simpleSchemas.length > 1 ? simpleSchemas : simpleSchemas[0] });
    }
    anyOf.push(...complexSchemas);
    return { anyOf };
}

function isSimpleSchema(schema: Schema): boolean {
    const keys = Object.keys(schema);
    return keys.length === 1 && keys[0] === 'type';
}

function isContainerSchema(schema: Schema): boolean {
    const type = (schema as Schema).type;
    return type === ValueType.Array || type === ValueType.Object;
}

// facade
export function generateSchema(value: any): Schema {
    return createSchemaFor(value);
}

export function mergeSchemas(schemas: Schema[]): Schema {
    const mergedSchema = combineSchemas(schemas);
    return mergedSchema;
}

export function extendSchema(schema: Schema, value: any): Schema {
    const valueSchema = generateSchema(value);
    const mergedSchema = combineSchemas([schema, valueSchema]);
    return mergedSchema;
}

export function isSuperset(mainSchema: Schema, subSchema: Schema): boolean {
    const mergedSchema = mergeSchemas([mainSchema, subSchema]);
    const isModified = areSchemasEqual(mergedSchema, mainSchema);
    return isModified;
}

export function areSchemasEqual(schema1: Schema, schema2: Schema): boolean {
    if (schema1 === undefined && schema2 === undefined) return true;
    if (schema1 === undefined || schema2 === undefined) return false;

    if (!areAnyOfSchemasEqual(schema1, schema2)) return false;
    if (schema1.type !== schema2.type) return false;
    if (!areArraysEqual(schema1.required, schema2.required)) return false;
    if (!arePropsEqual(schema1.properties, schema2.properties)) return false;
    if (!areSchemasEqual(schema1.items, schema2.items)) return false;

    return true;
}

function areArraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1 === undefined && arr2 === undefined) return true;
    if (arr1 === undefined || arr2 === undefined) return false;
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const combined = new Set([...arr1, ...arr2]);
    const areEqual = combined.size === set1.size && combined.size === set2.size;
    return areEqual;
}

function arePropsEqual(props1: Record<string, Schema>, props2: Record<string, Schema>): boolean {
    if (props1 === undefined && props2 === undefined) return true;
    if (props1 === undefined || props2 === undefined) return false;
    const keys1 = Object.keys(props1);
    const keys2 = Object.keys(props2);
    if (!areArraysEqual(keys1, keys2)) return false;
    for (const key of keys1) {
        if (!areSchemasEqual(props1[key], props2[key])) return false;
    }
    return true;
}

function areAnyOfSchemasEqual(schema1: Schema, schema2: Schema): Boolean {
    const anyOf1 = unwrapSchema(schema1);
    const anyOf2 = unwrapSchema(schema2);

    if (anyOf1.length != anyOf2.length) return false;
    if (anyOf1.length === 0) return true;
    if (anyOf1.length === 1) {
        return areSchemasEqual(anyOf1[0], anyOf2[0]);
    }

    const sorted1 = [...anyOf1].sort();
    const sorted2 = [...anyOf2].sort();

    for (let i = 0; i < anyOf1.length; i++) {
        const s1 = sorted1[i];
        const s2 = sorted2[i];
        if (!areSchemasEqual(s1, s2)) return false;
    }
    return true;
}
