<script setup>
  import UsageSection from '../../components/UsageSection.vue'
</script>

# Defining Screen Parameters

When an application is launched with a [URL Scheme](https://en.wikipedia.org/wiki/Uniform_Resource_Identifier), it can reference the [query string](https://en.wikipedia.org/wiki/Query_string) values included in the scheme. When launching an application with a scheme, you can pass necessary data or activate specific features.

## Passing Data with Parameters

When launching an application, you can add key-value pairs of data to the URL in the form of parameters.

For example, it looks like this:

```
granite://{serviceName}?key1=value1&key2=value2
```

In this example, an application named `test-app` can be launched, and `name` and `age` data can be passed.

```
granite://test-app?name=tom&age=10
```

## Getting Parameter Values

Using the `useParams` hook, you can easily get the query string values from the URL when the application is launched. This hook returns the value corresponding to a specific key through the `useParams` method.

Additionally, by using the `validateParams` option, you can define and validate the parameters required for the screen. Refer to the example below.

```tsx
import { createRoute } from '@granite-js/react-native';
import { View, Text } from 'react-native';

// Define the screen corresponding to the root path ('/')
export const Route = createRoute('/', {
  component: Index,
  validateParams: (params) => ({
    // Set 'name' key as required and convert its type to string.
    name: params.name as string,
    // Set 'age' key as required and convert its type to number.
    age: params.age as number,
  }),
});

function Index() {
  // Get the query string value for the 'name' key.
  const { name, age } = Route.useParams();

  // Alternatively, you can get values from a specific path like this:
  // const { name, age } = useParams({ from: "/" });

  return (
    <View>
      <Text>Name: {name}</Text>
      <Text>Age: {age}</Text>
    </View>
  );
}
```

## Validating Parameters

<UsageSection assetType="image" assetPath="/usage/query-param/query-param-required.png">

Parameters that must be included can be validated using the `validateParams` option.

For example, the example code below will throw an error if the `name` parameter is missing.

Therefore, use the `validateParams` option to ensure that required parameters are not omitted.

::: code-group

```tsx [vanilla]
import { createRoute } from '@granite-js/react-native';
import { View, Text } from 'react-native';

export const Route = createRoute('/', {
  component: Index,
  validateParams: (params) => {
    if (!('name' in params)) {
      throw Error('name is required');
    }
    if (typeof params.name !== 'string') {
      throw Error('name must be a string');
    }

    if (!('age' in params)) {
      throw Error('age is required');
    }
    if (typeof params.age !== 'number') {
      throw Error('age must be a number');
    }

    return params as {
      name: string;
      age: number;
    };
  },
});

function Index() {
  const { name, age } = Route.useParams();

  return (
    <View>
      <Text>Name: {name}</Text>
      <Text>Age: {age}</Text>
    </View>
  );
}
```

```tsx [valibot]
import { createRoute } from '@granite-js/react-native';
import { View, Text } from 'react-native';
import * as v from 'valibot';

export const Route = createRoute('/', {
  component: Index,
  validateParams: v.object({
    name: v.string(),
    age: v.number(),
  }),
});

function Index() {
  const { name, age } = Route.useParams();

  return (
    <View>
      <Text>Name: {name}</Text>
      <Text>Age: {age}</Text>
    </View>
  );
}
```

```tsx [zod]
import { createRoute } from '@granite-js/react-native';
import { View, Text } from 'react-native';
import { z } from 'zod';

export const Route = createRoute('/', {
  component: Index,
  validateParams: z.object({
    name: z.string(),
    age: z.number(),
  }),
});

function Index() {
  const { name, age } = Route.useParams();

  return (
    <View>
      <Text>Name: {name}</Text>
      <Text>Age: {age}</Text>
    </View>
  );
}
```

:::

</UsageSection>

## Advanced Validation

Validation libraries provide powerful features for handling validation errors and transforming values.

::: code-group

```tsx [valibot]
import { createRoute } from '@granite-js/react-native';
import * as v from 'valibot';

// Using v.fallback() for error resilience
export const Route = createRoute('/profile', {
  component: Profile,
  validateParams: v.object({
    name: v.fallback(v.string(), 'Anonymous'),
    age: v.fallback(v.number(), 0),
    isActive: v.fallback(v.boolean(), true),
  }),
});
```

```tsx [valibot - optional]
import { createRoute } from '@granite-js/react-native';
import * as v from 'valibot';

// Using v.optional() with default values
export const Route = createRoute('/settings', {
  component: Settings,
  validateParams: v.object({
    theme: v.optional(v.picklist(['light', 'dark']), 'light'),
    animation: v.optional(v.boolean(), true),
    fontSize: v.optional(v.number(), 16),
  }),
});
```

```tsx [valibot - transform]
import { createRoute } from '@granite-js/react-native';
import * as v from 'valibot';

// Using v.transform() for type conversion
export const Route = createRoute('/user', {
  component: User,
  validateParams: v.object({
    // Converts string to number
    id: v.pipe(
      v.string(),
      v.transform((v) => parseInt(v))
    ),
    // Converts ISO string to Date object
    createdAt: v.pipe(
      v.string(),
      v.transform((v) => new Date(v))
    ),
  }),
});
```

```tsx [zod]
import { createRoute } from '@granite-js/react-native';
import { z } from 'zod';

// Using .catch() for error resilience
export const Route = createRoute('/profile', {
  component: Profile,
  validateParams: z.object({
    name: z.string().catch('Anonymous'),
    age: z.number().catch(0),
    isActive: z.boolean().catch(true),
  }),
});
```

```tsx [zod - default]
import { createRoute } from '@granite-js/react-native';
import { z } from 'zod';

// Using .default() for optional parameters
export const Route = createRoute('/settings', {
  component: Settings,
  validateParams: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    animation: z.boolean().default(true),
    fontSize: z.number().default(16),
  }),
});
```

```tsx [zod - transform]
import { createRoute } from '@granite-js/react-native';
import { z } from 'zod';

// Using .transform() for type conversion
export const Route = createRoute('/user', {
  component: User,
  validateParams: z.object({
    // Converts string to number
    id: z.string().transform((v) => parseInt(v)),
    // Converts ISO string to Date object
    createdAt: z.string().transform((v) => new Date(v)),
  }),
});

function User() {
  const params = Route.useParams();
  // params.id is number (not string)
  // params.createdAt is Date object
}
```

:::

## Transforming Parameter Values

The `createRoute.parserParams` option allows you to convert `string` values passed as query strings to your desired types.
By default, `useParams` automatically converts most simple types like numbers, strings, arrays, and objects, so you rarely need to override the parser directly.
However, when you need to use complex data structures or want to remove specific params, you can define a parser yourself to convert them to the desired types.

The result of the `parserParams` option is transformed before being passed to the `validateParams` option.

### Type Conversion Using the Default Parser

Using the default parser, query string values are automatically converted to appropriate types. The example below shows how to convert parameters to their correct types.

```tsx
import { createRoute } from '@granite-js/react-native';
import { View, Text } from 'react-native';

// Example URL: granite://test-app?name=tom&age=10&arr=1,2,3&obj={\"name\":\"jane\",\"age\":20}
export const Route = createRoute('/', {
  component: Index,
  validateParams: (params) => ({
    // Parameter values are automatically converted to the correct types by the default parser
    name: params.name as string, // Converts to string
    age: params.age as number, // Converts to number
    arr: params.arr as string[], // Converts to array
    obj: params.obj as { name: string; age: number }, // Converts to object
  }),
});

function Index() {
  const { name, age, arr, obj } = Route.useParams();

  return (
    <View>
      <Text>
        Name: {name}, Type: {typeof name}
      </Text>
      <Text>
        Age: {age}, Type: {typeof age}
      </Text>
      <Text>
        Array: {JSON.stringify(arr)}, Type: {typeof arr}
      </Text>
      <Text>
        Object: {JSON.stringify(obj)}, Type: {typeof obj}
      </Text>
    </View>
  );
}
```

### Overriding the Parser

The `parserParams` option allows you to define and use a custom function to transform query parameters that are difficult to handle with the default parser. For example, the code below shows how to remove a specific parameter (`referer`) and process the remaining parameters with the default parser.

```tsx
import { createRoute, defaultParserParams } from '@granite-js/react-native';
import { View, Text } from 'react-native';

// Example URL: granite://test-app?name=tom&age=10&referer=https://google.com
export const Route = createRoute('/', {
  component: Index,

  // Remove a specific parameter and process the rest with the default parser // [!code highlight:5]
  parserParams: (params) => {
    const { referer, ...rest } = params;
    return defaultParserParams(rest);
  },

  validateParams: (params) => {
    // [!code highlight:11]
    // Here, `params` is the value transformed by the parserParams function.
    // That is, `referer` is passed after being already removed.
    return {
      name: params.name,
      age: params.age,
    } as {
      name: string;
      age: number;
    };
  },
});

// Using parameters in the component
function Index() {
  const { name, age } = Route.useParams();

  return (
    <View>
      <Text>
        Name: {name}, Type: {typeof name}
      </Text>
      <Text>
        Age: {age}, Type: {typeof age}
      </Text>
    </View>
  );
}
```

::: warning Note on Duplicate Parameters
If a parameter with the same name is used multiple times, its value will be returned as an array. For example, if the `age` parameter is included twice, it will be processed as follows:

```js
// Scheme: `granite://test-app?name=tom&age=10&age=20`
const params = useParams({
  from: "/",
});

// params
{ name: 'tom', age: [10, 20] }
```

:::

## References

- [useParams](/reference/react-native/screen-control/useParams)
