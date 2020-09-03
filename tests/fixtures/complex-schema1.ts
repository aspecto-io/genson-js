import { ValueType } from '../../src';

export const complexSchema1 = {
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
