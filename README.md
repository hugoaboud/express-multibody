# express-multibody

[express](https://github.com/expressjs/express) middleware which parses different types of content into a `body` object

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
		* 5.5.1. [Explicit Array Operators](#ExplicitArrayOperators)
	* 5.6. [Complex Objects](#ComplexObjects)
	* 5.7. [Files](#Files)
* 6. [FormObj](#FormObj)
* 7. [Contributing](#Contributing)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

##  1. <a name='SupportedContent-Types'></a>Supported Content-Types

- `application/json`: Uses the builtin JSON parser to parse the request stream;
- `multipart/form-data`: Uses `busboy` to parse the request stream, then builds a possibly-complex object according to the naming structure described [below](#FormData);
  - Files are also processed and included on the body according to the same naming structure;
  - Files can be parsed by a custom method provided in the `config` argument;

##  2. <a name='Usage'></a>Usage

Install with `npm`:

```shell
npm i express-multibody
```

Import and `use` it on the express app:

```typescript
import express from 'express'
import multibody from 'express-multibody'

const app = express();
app.use(multibody())

app.post('/', (req, res) => {
    req.body // Request data, regardless of Content-Type
})

app.listen(3420, () => {
    console.log('Server running');
})
```

> `req.body` also contains references to the uploaded files, which are saved into a temporary directory with a random UUID.

##  3. <a name='Configuration'></a>Configuration

You can pass a configuration object to `multibody` with a few options:

```typescript
app.use(multibody({
    ...
}))
```

With the options below:

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

####  5.5.1. <a name='ExplicitArrayOperators'></a>Explicit Array Operators

At this point, the definition above is not enough to solve some ambiguities. For example:

```typescript
prop1[][a]='value1'
prop1[][b]='value2'
prop1[][c]='value3'

// Which of the below should be accepted as correct?
{
    prop1: [
        { a: 'value1' },
        { b: 'value2' },
        { c: 'value3' },
    ]
}
{
    prop1: [
        { a: 'value1', b: 'value2' },
        { c: 'value3' },
    ]
}
...
{
    prop1: [
        { a: 'value1', b: 'value2', c: 'value3' }
    ]
}
```

Everytime a property is added to an array field, we must decide whether to add it as a new item on the array or add it as a property to the current last item.

This can be done explicitly with the `Array Operators`:
- `^`: Should add a new item to the array
- `~`: Should add to last item of array

```typescript
prop1[^][a]='value1'
prop1[~][b]='value2'
prop1[^][c]='value3'

{
    prop1: [
        { a: 'value1', b: 'value2' },
        { c: 'value3' },
    ]
}
```

If not specified, the library will infer by itself (which can lead to undesired behavior as shown above).
A new item is added to the array on any of the four scenarios below:
- Array is currently empty
- Last item of the array is a string
- Array is a leaf of the object
- Last item already includes the property being added

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

###  5.7. <a name='Files'></a>Files

Files can be inserted at any point of the object tree, just like other fields.

The file is uploaded to a temporary directory, with a random UUID as filename, and a reference to it is inserted on the body.

```typescript
prop1={binary}
prop2[a]={binary}
prop2[b][]={binary}
prop2[b][]={binary}

{
    prop1: {
        filepath: '...', read(), delete()
    },
    prop2: {
        a: {
            filepath: '...', read(), delete()
        },
        b: [
            {
                filepath: '...', read(), delete()
            },
            {
                filepath: '...', read(), delete()
            }
        ]
    }
}
```

The file reference contains the _filepath_ and 2 helper methods:
- `read` read the temporary file contents from disk
- `delete` delete the temporary file from disk

##  6. <a name='FormObj'></a>FormObj

The library offers a class `FormObj` which can be used on a JS client to dump an object into `FormData` following the syntax described above.

This allows a seamless transfer of data containing files: Client sends an object containing values and files, files are uploaded and the request body is assembled with references to the files on server.

```typescript
import { FormObj } from 'express-multibody/client/formobj';

const formdata = new FormObj({
    prop1: 'value1',
    prop2: <Blob>,
    prop3: [
        'value2',
        <Blob>,
        [
            'value4',
            <Blob>
        ],
        {
            nested1: 'value4',
            nested2: <Blob>
        }
    ],
    prop4: {
        nested1: 'value5',
        nested2: <Blob>,
        nested3: [
            'value6',
            <Blob>
        ],
        nested4: {
            deep1: 'value7',
            deep2: <Blob>
        }
    }
})

fetch('http://...', {
    method: 'POST',
    body: formdata
})
```

> The parsing should work with objects of any arbitrary depth. If it fails on some specific case, please open an Issue with the input and expected output.

##  7. <a name='Contributing'></a>Contributing

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

> Notice about tests: in order to guarantee data integrity on upload, the tests at the file `test/formdata_files.test.ts` create _a lot_ (~500) of files on the `/tmp` folder. It then uploads those files to the test server and compares the hashes. This requires around ~50mb max of hard drive. All the files are automatically deleted by the tests.
>
> You can take a look at `Test.makeFile` and `Test.rmFiles` to make sure you're comfortable with running it.