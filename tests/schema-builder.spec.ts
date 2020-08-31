import { isArray } from 'util';

enum ValueType {
    Null = 'null',
    Boolean = 'boolean',
    Number = 'number',
    String = 'string',
    Object = 'object',
    Array = 'array',
}

type Schema = SingleTypeSchema | AnyOfSchema;
type SingleTypeSchema = PrimitiveSchema | ContainerSchema;
type PrimitiveSchema = NullSchema | BooleanSchema | NumberSchema | StringSchema;
type ContainerSchema = ArraySchema | ObjectSchema;
type AnyOfSchema = RegularAnyOfSchema | SimplifiedAnyOfSchema;

type NullSchema = {
    type: ValueType.Null;
};

type BooleanSchema = {
    type: ValueType.Boolean;
};

type NumberSchema = {
    type: ValueType.Number;
};

type StringSchema = {
    type: ValueType.String;
};

type ArraySchema = {
    type: ValueType.Array;
    items?: Schema;
};

type ObjectSchema = {
    type: ValueType.Object;
    properties?: Record<string, Schema>;
    required?: string[];
};

type SimplifiedAnyOfSchema = {
    type: ValueType[];
};

type RegularAnyOfSchema = {
    anyOf: Schema[];
};

function createSchemaFor(value: any): SingleTypeSchema {
    switch (typeof value) {
        case 'number':
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

function createSchemaForArray(arr: Array<any>): SingleTypeSchema {
    if (arr.length === 0) {
        return { type: ValueType.Array };
    }
    const elementSchemas = arr.map((value) => createSchemaFor(value));
    const items = combineSchemas(elementSchemas);
    return { type: ValueType.Array, items };
}

function createSchemaForObject(obj: Object): SingleTypeSchema {
    const schemasByProp = Object.entries(obj).reduce((acc, [prop, value]) => {
        const existingSchemas = acc[prop];
        if (!existingSchemas) {
            acc[prop] = [createSchemaFor(value)];
        } else {
            acc[prop].push(createSchemaFor(value));
        }
        return acc;
    }, {});
    return { type: ValueType.Object, properties: schemasByProp };
}

function combineSchemas(schemas: SingleTypeSchema[]): Schema {
    const schemasByType: Record<ValueType, SingleTypeSchema[]> = {
        [ValueType.Null]: [],
        [ValueType.Boolean]: [],
        [ValueType.Number]: [],
        [ValueType.String]: [],
        [ValueType.Array]: [],
        [ValueType.Object]: [],
    };

    for (const schema of schemas) {
        const { type } = schema;
        if (schemasByType[type].length === 0 || isContainerSchema(schema)) {
            schemasByType[type].push(schema);
        } else {
            continue;
        }
    }

    const resultSchemasByType: Record<ValueType, Schema> = {
        [ValueType.Null]: schemasByType[ValueType.Null][0],
        [ValueType.Boolean]: schemasByType[ValueType.Boolean][0],
        [ValueType.Number]: schemasByType[ValueType.Number][0],
        [ValueType.String]: schemasByType[ValueType.String][0],
        [ValueType.Array]: combineArraySchemas(schemasByType[ValueType.Array] as ArraySchema[]),
        [ValueType.Object]: combineObjectSchemas(schemasByType[ValueType.Object] as ObjectSchema[]),
    };

    const schemasFound = Object.values(resultSchemasByType).filter(Boolean);
    const multiType = schemasFound.length > 1;
    if (multiType) return { anyOf: schemasFound };
    return schemasFound[0] as Schema;
}

function combineArraySchemas(schemas: ArraySchema[]): ArraySchema {
    const itemSchemas: SingleTypeSchema[] = [];
    for (const schema of schemas) {
        // todo: think on this case
        if (!schema.items) continue;
        if (isSimplifiedAnyOfSchema(schema.items)) {
        } else if (isRegularAnyOfSchema(schema.items)) {
            for (const itemSchema of schema.items.anyOf) {
                itemSchemas.push(itemSchema);
            }
        } else {
        }
    }
}

function combineObjectSchemas(schemas: ObjectSchema[]): ObjectSchema {}

function isContainerSchema(schema: Schema): schema is ContainerSchema {
    const type = (schema as SingleTypeSchema).type;
    return type === ValueType.Array || type === ValueType.Object;
}

function isSimplifiedAnyOfSchema(schema: Schema): schema is SimplifiedAnyOfSchema {
    return Array.isArray((schema as SingleTypeSchema).type);
}

function isRegularAnyOfSchema(schema: Schema): schema is RegularAnyOfSchema {
    return typeof (schema as RegularAnyOfSchema).anyOf !== 'undefined';
}

function isAnyOfSchema(schema: Schema): schema is AnyOfSchema {
    return isRegularAnyOfSchema(schema) || isSimplifiedAnyOfSchema(schema);
}

function generateSchema(value: any): Schema {
    return createSchemaFor(value);
}

function simplifiedAnyOfToRegular(schema: SimplifiedAnyOfSchema): RegularAnyOfSchema {
    return {
        anyOf: schema.type.map((valueType) => ({
            type: valueType,
        })),
    };
}

function simplifyRegularAnyOfSchema(schema: RegularAnyOfSchema): SimplifiedAnyOfSchema {
    return {
        type: schema.anyOf.map((s) => {
            s.type;
        }),
    };
}

function simplifySchemas(schemas: SingleTypeSchema[]) {
    return {
        type: unique([schemas.map((s) => s.type)]),
    };
}

function unsimplifySchema(schema: Schema): Schema {
    if (isSimplifiedAnyOfSchema(schema))
        return { anyOf: (schema as SimplifiedAnyOfSchema).type.map((s) => ({ type: s })) } as Schema;
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

describe('SchemaBuilder', () => {
    it('should have nice api', async () => {});
});
