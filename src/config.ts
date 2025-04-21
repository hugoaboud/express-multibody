import busboy from 'busboy'
import { Request } from 'express'

type MultibodyFile = {
    filepath: string,
    delete: () => void
}

/**
 * `express-multibody` configuration (see [reference](https://github.com/hugoaboud/express-multibody?tab=readme-ov-file#Configuration))
 */
export interface MultibodyConfig<File = MultibodyFile> {
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