export enum ValueType {
    Null = 'null',
    Boolean = 'boolean',
    Integer = 'integer',
    Number = 'number',
    String = 'string',
    Object = 'object',
    Array = 'array',
}

export type Schema = {
    type?: ValueType | ValueType[];
    items?: Schema;
    properties?: Record<string, Schema>;
    required?: string[];
    anyOf?: Array<Schema>;
    additionalProperties?: boolean;
    nullable?: boolean;
    minItems?: number;
};

export type SchemaGenOptions = {
    noRequired?: boolean;
    additionalProperties?: boolean;
    restrictiveArrays?: boolean;
    minItemsOverride?: number;
    restrictiveNulls?: boolean;
    mergeToLessRestrictive?: boolean;
};

export type SchemaComparisonOptions = {
    ignoreRequired?: boolean;
    subsetRequired?: boolean;

};
