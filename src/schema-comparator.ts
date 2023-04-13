import { mergeSchemas, unwrapSchema } from './schema-builder';
import { Schema, SchemaComparisonOptions, SchemaGenOptions } from './types';

export function areSchemasEqual(schema1: Schema, schema2: Schema, options?: SchemaComparisonOptions & SchemaGenOptions): boolean {
    if (schema1 === undefined && schema2 === undefined) return true;
    if (schema1 === undefined || schema2 === undefined) return false;

    const anyOf1 = unwrapSchema(schema1);
    const anyOf2 = unwrapSchema(schema2);

    if (anyOf1.length != anyOf2.length) return false;
    if (anyOf1.length === 0) return true;

    const typeComparator = (s1: Schema, s2: Schema) => s1.type.toLocaleString().localeCompare(s2.type.toLocaleString());
    const sorted1 = [...anyOf1].sort(typeComparator);
    const sorted2 = [...anyOf2].sort(typeComparator);

    for (let i = 0; i < anyOf1.length; i++) {
        const s1 = sorted1[i];
        const s2 = sorted2[i];

        if (s1.type !== s2.type) return false;
        if (!options?.ignoreRequired && !areArraysEqual(s1.required, s2.required, options?.subsetRequired ?? false)) return false;
        if ((s1.nullable ?? true) !== (s2.nullable ?? true)) {
            return false;
        }
        if ((s1.additionalProperties ?? true) !== (s2.additionalProperties ?? true)) {
            return false;
        }
        if (!arePropsEqual(s1.properties, s2.properties, s2.additionalProperties ?? true, options)) return false;
        if (!areSchemasEqual(s1.items, s2.items, options)) return false;
    }

    return true;
}

function areArraysEqual(arr1: string[], arr2: string[], subsetRequired: boolean): boolean {
    // if subsetRequired is true, arr2 must be more restrictive than arr1
    if (arr1 === undefined && arr2 === undefined) return true;
    if (arr2 === undefined) return false;
    if (arr1 === undefined && !subsetRequired) return false;
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const combined = new Set([...arr1, ...arr2]);
    if(!subsetRequired) {
        return combined.size === set1.size && combined.size === set2.size;
    } else {
        //this asymmetry is intentional, we want to make sure that arr2 is more restrictive than arr1
        return combined.size === set2.size && combined.size >= set1.size;
    }
}

function arePropsEqual(
    props1: Record<string, Schema>,
    props2: Record<string, Schema>,
    additionalProps: boolean,
    options?: SchemaComparisonOptions & SchemaGenOptions
): boolean {
    if (props1 === undefined && props2 === undefined) return true;
    if (props1 === undefined || props2 === undefined) return false;
    const keys1 = Object.keys(props1);
    const keys2 = Object.keys(props2);
    const nonNullableKeys1 = keys1.filter((k) => !(props1[k].nullable ?? true));
    const nonNullableKeys2 = keys2.filter((k) => !(props2[k].nullable ?? true));
    if (!areArraysEqual(keys1, keys2, additionalProps && (options?.subsetRequired ?? false))) return false;
    if (!areArraysEqual(nonNullableKeys1, nonNullableKeys2, false)) return false;
    for (const key of keys1) {
        if (!areSchemasEqual(props1[key], props2[key], options)) return false;
    }
    return true;
}
/**
 * Returns a bool if all the second schema's jsons are valid in the first schema too.
 * So the subSchema is more restrictive than the mainSchema, but they are compatible.
 *
 * @param {Schema} mainSchema The less restrictive schema (superset).
 * @param {Schema} subSchema The more restrictive schema (subset).
 * @param {SchemaComparisonOptions & SchemaGenOptions} options additional options
 * @return {boolean} true if the subSchema is a subset of the mainSchema.
 *
 * @example isSubset(
 *                 { anyOf: [{ type: [ValueType.String, ValueType.Number] }] }, // valid: 1, 2, "a", "b"
 *                 { anyOf: [{ type: ValueType.Number }] } // valid: 1, 2
 *             ) === true
 */
export function isSubset(mainSchema: Schema, subSchema: Schema, options?: SchemaComparisonOptions & SchemaGenOptions): boolean {
    const mergedSchema = mergeSchemas([mainSchema, subSchema], {...options, restrictiveNulls: true, mergeToLessRestrictive: true});
    return areSchemasEqual(mainSchema, mergedSchema, { ...options, subsetRequired: true });
}
