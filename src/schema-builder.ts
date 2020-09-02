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

function isContainerSchema(schema: Schema): boolean {
    const type = (schema as Schema).type;
    return type === ValueType.Array || type === ValueType.Object;
}

function isWrappedAnyOfSchema(schema: Schema): boolean {
    return Array.isArray((schema as Schema).type);
}

function wrapAnyOfSchema(schema: Schema): Schema {
    const simpleSchemas = [];
    const complexSchemas = [];
    for (const subSchema of schema.anyOf) {
        if (isWrappedAnyOfSchema(subSchema)) {
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

function isSchema(schema: Schema): schema is Schema {
    return typeof (schema as Schema).type === 'string';
}

function simplifySchemas(schemas: Schema[]) {
    return {
        type: unique([schemas.map((s) => s.type)]),
    };
}

function unsimplifySchema(schema: Schema): Schema {
    if (isWrappedAnyOfSchema(schema))
        return { anyOf: (schema.type as ValueType[]).map((s) => ({ type: s })) } as Schema;
    return schema;
}

function unique(array: any[]) {
    const set = new Set(array);
    const uniqueValues = [...set.values()];
    return uniqueValues;
}

// function mergeComplexSchemas(schema1: Schema, schema2: Schema): Schema {
//     if (schema1.type === ValueType.Array && schema2.type === ValueType.Array)
//         return mergeArraySchemas(schema1, schema2);
//     if (schema1.type === ValueType.Object && schema2.type === ValueType.Object)
//         return mergeObjectSchemas(schema1, schema2);
//     throw new Error(`Can't merge complex schemas of different types ${schema1.type} and ${schema2.type}`);
// }

// function mergeObjectSchemas(s1: ObjectSchema, s2: ObjectSchema): ObjectSchema {
//     const props1 = Object.entries(s1.properties);
//     const props2 = Object.entries(s2.properties);
//     // if ()
// }

// function mergeArraySchemas(s1: ArraySchema, s2: ArraySchema): ArraySchema {
//     const itemSchemaTypes: Record<ValueType, boolean | Schema> = {
//         [ValueType.Array]: false,
//         [ValueType.Object]: false,
//         [ValueType.Boolean]: false,
//         [ValueType.Number]: false,
//         [ValueType.String]: false,
//         [ValueType.Null]: false,
//     };
// }
// function getUniqueSchemas(schemas: Schema[]) {
//     const uniqueSchemas = [];
//     schemas.forEach((schema) => {
//         if (!uniqueSchemas.some((s) => areEqual(s, schema))) {
//             uniqueSchemas.push(schema);
//         }
//     });
//     return uniqueSchemas;
// }

// function areEqual(s1: Schema, s2: Schema): boolean {
//     if (s1.type != s2.type) return false;
//     if (s1.type == NodeType.Array && s2.type == NodeType.Array) {
//         if (typeof s1.items !== typeof s2.items) return false;
//         if (Array.isArray(s1.items) && Array.isArray(s2.items)) {
//             if (s1.items?.length !== s2.items?.length) return false;
//             return;
//         }
//     }
// }

// function mergeSchemas(schemas: Schema[]): Schema {}
// function extendSchema(object: any): Schema {}
// function isSuperset(schema: Schema, schema: Schema): boolean {}

// facede
export function generateSchema(value: any): Schema {
    return createSchemaFor(value);
}
