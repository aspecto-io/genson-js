# genson-js
![Build](https://github.com/aspecto-io/genson-js/workflows/Build/badge.svg) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) [![TypeScript](https://badgen.net/npm/types/env-var)](http://www.typescriptlang.org/) [![NPM version](https://img.shields.io/npm/v/genson-js.svg)](https://www.npmjs.com/package/genson-js)


**genson-js** is a user-friendly **JSON Schema** generator built in TypeScript/JavaScript.

> This is _not_ the JavaScript equivalent of the **Java Genson library**.
> The motivation for this library was to port [GenSON](https://github.com/cequencer/GenSON) python library to JS, however having exactly the same api or possiblities was not a goal.

genson-js's core function is to take JSON objects and generate schemas that describe them, with an ability to **merge** schemas.

## Usage

### Creating schemas

To infer a schema from existing object:

```ts
import { createSchema } from 'genson-js';

const schema = createSchema({
    userName: 'smith',
    languages: ['c++', 'java'],
    age: 40,
});
```

The following schema will be created:

```js
{
  type: "object",
  properties: {
    userName: {
      type: "string",
    },
    languages: {
      type: "array",
      items: {
        type: "string",
      },
    },
    age: {
      type: "integer",
    },
  },
  required: ["userName", "languages", "age"],
};
```

### Merging schemas

You can merge 2 or more schemas, so that merged schema would be kind of a superset of the schemas that it was built from:

```ts
import { mergeSchemas } from 'genson-js';

const merged = mergeSchemas([{ type: ValueType.Number }, { type: ValueType.String }]);

// will create merged schema like this:
// { type: ['number', 'string'] }
```

### Create compound schema

Shorthand for createSchema + mergeSchemas.  
Can take multiple inputs and create one compound schema:

```ts
import { createCompoundSchema } from 'genson-js';

const schema = createCompoundSchema([{ age: 19, name: 'John' }, { age: 23, admin: true }, { age: 35 }]);

// Will create the following schema:
// {
//   type: 'object',
//   properties: { admin: { type: 'boolean' }, age: { type: 'integer' }, name: { type: 'string' } },
//   required: ['age']
// }
```

### Exending schemas

You can extend existing schema to match some value:

```ts
import { extendSchema } from 'genson-js';

const extended = extendSchema({ type: ValueType.Number }, 'some string');

// will create extended schema like this:
// { type: ['number', 'string'] }
```

### Comparing schemas

You can compare 2 schemas for equality like this:

```ts
import { areSchemasEqual } from 'genson-js';

areSchemasEqual({ type: ValueType.Number }, { type: ValueType.Number });
// will return true
```

### Subset

You can also check if one schema is a subset of another one like so:

```ts
import { isSubset } from 'genson-js';

isSubset(
    { type: ValueType.Array, items: { type: [ValueType.Boolean, ValueType.Integer] } },
    { type: ValueType.Array, items: { type: [ValueType.Boolean] } }
);
// will return true
```
<hr/>
You can find more examples in the unit tests.
