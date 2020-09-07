import { ValueType } from '../../src';

export const complexSchema2 = {
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
