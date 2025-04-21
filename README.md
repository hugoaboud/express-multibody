# express-multibody

A [express](https://github.com/expressjs/express) middleware which parses different types of content into the request `body`.

<!-- vscode-markdown-toc -->
* 1. [Supported Content-Types](#SupportedContent-Types)
* 2. [Usage](#Usage)
* 3. [Configuration](#Configuration)
* 4. [JSON](#JSON)
* 5. [FormData](#FormData)
	* 5.1. [Values](#Values)
	* 5.2. [Objects](#Objects)
	* 5.3. [Objects with nested properties](#Objectswithnestedproperties)
	* 5.4. [Arrays](#Arrays)
	* 5.5. [Object Arrays](#ObjectArrays)
	* 5.6. [Complex Objects](#ComplexObjects)
* 6. [Contributing](#Contributing)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

##  1. <a name='SupportedContent-Types'></a>Supported Content-Types

- `application/json`: Uses the builtin JSON parser to parse the request stream;
- `multipart/form-data`: Uses `busboy` to parse the request stream, then builds a possibly-complex object according to the naming structure described [below](#FormData);
  - Files are also processed and included on the body according to the same naming structure.
  - Files can be parsed by a custom method provided in the `config` argument.

##  2. <a name='Usage'></a>Usage

Install with `npm`:

```shell
npm i express-multibody
```

Import and use it on the express app:

```typescript
import express from 'express'
import multibody from 'express-multibody'

const app = express.app();
app.use(multibody({
    // config
}))
```

The contents should be available at the `req.body` of the route:

```typescript
app.post('/', (req, res) => {
    // req.body
})
```

This object also contains references to the uploaded files, which are saved into a temporary directory with a random UUID.

##  3. <a name='Configuration'></a>Configuration

```typescript
export interface MultibodyConfig<File = any> {
    /**
     * Settings for file uploads.
     * Currently applies for `multipart/form-data` only.
     */
    files?: {
        
        /**
         * Creates the `uploadDir` if it doesn't exist. [default: `true`]
         */
        mkDir?: boolean,
    
        /**
         * When a file is received, it'll be saved into the folder below
         * with a random UUID name. [default: `%CWD%/tmp`]
         */
        uploadDir?: string

        /**
         * By default, files are returned as an object containing
         * the absolute filepath (at _uploadDir_) and a delete method.
         * 
         * You can use this property to declare a method that parses it
         * as you want, and it will be injected on the object at the
         * proper location.
         * 
         * - A reference to the `express.Request` object is also passed,
         * it can be used to inject metadata along with the body, such
         * as a list of all files.
         */
        parse?: (
            formKey: string,
            filepath: string,
            original: {
                filename: string,
                encoding: BufferEncoding,
                mimeType: string
            },
            req: Request
        ) => Promise<File>
    }
    
    /**
     * Settings for `multipart/form-data` requests.
     * 
     * `busboy` configuration (see [reference](https://github.com/mscdex/busboy?tab=readme-ov-file#exports))
     */
    formdata?: busboy.BusboyConfig,
    
    /**
     * Settings for `application/json` requests.
     */
    json?: {
        /**
         * Maximum size of the JSON data **in bytes**. [default: `Infinity`]
         */
        // TODO
        maxSize?: number
    }
}
```

##  4. <a name='JSON'></a>JSON

Requests with a header `Content-Type: multipart/form-data` are parsed with the builtin JSON parser, then used as the `body`.

##  5. <a name='FormData'></a>FormData

Requests with a header `Content-Type: multipart/form-data` are parsed with [busboy](https://github.com/mscdex/busboy), transformed into a possibly-complex object according to the rules below, then used as the body.

The examples below also apply for files, which are parsed into a reference.

###  5.1. <a name='Values'></a>Values

```typescript
prop1='value1'
prop2='value2'
prop3='value3'

{
    prop1: 'value1',
    prop2: 'value2',
    prop3: 'value3'
}
```

###  5.2. <a name='Objects'></a>Objects

```typescript
prop1[a]='value1'
prop1[b]='value2'
prop2[c]='value3'

{
    prop1: {
        a: 'value1',
        b: 'value2'
    },
    prop2: {
        c: 'value3'
    }
}
```

###  5.3. <a name='Objectswithnestedproperties'></a>Objects with nested properties

```typescript
prop1[a]='value1'
prop1[b][c]='value2'
prop1[b][d]='value3'

{
    prop1: {
        a: 'value1',
        b: {
            c: 'value2',
            d: 'value3'
        }
    }
}
```

###  5.4. <a name='Arrays'></a>Arrays

```typescript
prop1[]='value1'
prop1[]='value2'
prop2[]='value3'

{
    prop1: [
        'value1',
        'value2'
    ],
    prop2: [
        'value3'
    ]
}
```

###  5.5. <a name='ObjectArrays'></a>Object Arrays

```typescript
prop1[][a]='value1'
prop1[][b]='value2'
prop1[][a]='value3'

{
    prop1: [
        {
            a: 'value1',
            b: 'value2'
        }
        {
            a: 'value3'
        }
    ]
}
```

> The parsing of object arrays is performed sequentially (given that FormData parts ordering is guaranteed).
> When inserting a new key into an array item, the last object of the array is checked. If it includes the key, a new object is created and pushed to the array, where the key will be inserted.
>
> This means you should fully serialize each object before starting the next one when dumping.

###  5.6. <a name='ComplexObjects'></a>Complex Objects

```typescript
prop1[a]='value1'
prop1[b][c]='value2'
prop1[b][d]='value3'
prop1[b][e][]='value4'
prop1[b][e][]='value5'
prop1[b][e][][]='value6'
prop1[b][e][][]='value7'
prop1[b][e][][][f]='value8'
prop1[b][e][][][g]='value9'
prop1[b][e][][][f]='value10'

{
    prop1: {
        a: 'value1',
        b: {
            c: 'value2',
            d: 'value3',
            e: [
                'value4',
                'value5',
                [
                    'value6',
                    'value7',
                    {
                        f: 'value8',
                        g: 'value9'
                    },
                    {
                        f: 'value10'
                    }
                ]
            ]
        }
    },
}
```

##  6. <a name='Contributing'></a>Contributing

Clone the project and install the dependencies:

```shell
git clone https://github.com/hugoaboud/express-multibody.git
cd express-multibody

npm i
```

You can run the tests in watch mode while making changes:

```shell
npm run test -- --watch
```

Before opening a PR, make sure the project builds, there are no linting errors and all tests pass. You can do so with the following command:

```shell
npm run check
```