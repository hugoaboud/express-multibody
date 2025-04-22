import { randomUUID } from 'crypto';
import { Request } from 'express';
import busboy from 'busboy';
import path from 'path';
import fs from 'fs';
import { MultibodyConfig } from './config';

type FormDataField<T = string> = {
    name: string,
    value: T
}

type FormDataPart = {
    path: {
        p: string,
        new_item?: boolean // []: undefined, [^]: true, [~]: false
    }[]
    value: string
}

/**
 * Utility class for dealing with `multipart/form-data` requests.
 */
export class MultibodyFormData {

    /**
     * Consume the `FormData` of a express request using `busboy`.
     * @param req The express request.
     * @param config The `express-multibody` configuration. (see [reference](https://github.com/hugoaboud/express-multibody?tab=readme-ov-file#Configuration))
     * @returns A list of string fields and a list of file field promises.
     * You should resolve these promises after calling this method.
     */
    public static consume(req: Request, config?: MultibodyConfig<any>): Promise<{
        fields: FormDataField[],
        filePromises: Promise<FormDataField<File>>[]
    }> {
        return new Promise(resolve => {
    
            const fields: FormDataField[] = [];
            const filePromises: Promise<FormDataField<File>>[] = [];

            // Flags to stop the parsing process
            let isParsing = true;
            const isWritingTo = new Set<string>();
            
            // File writes can last until after busboy finished,
            // so both @finish and @file.end events trigger this
            const attemptFinish = () => {
                if (isParsing || isWritingTo.size > 0) return;
                resolve({ fields, filePromises });
            };

            const bb = busboy({
                ...(config?.formdata || {}),
                headers: req.headers
            });
    
            bb.on('file', (
                name: string,
                file: any,
                original: {
                    filename: string,
                    encoding: BufferEncoding,
                    mimeType: string
                }
            ) => {
                
                // Create stream to write temporary file
                const tmpFilename = randomUUID();
                const dir = config?.files?.uploadDir || path.join(process.cwd(), 'tmp');
                const filepath = path.join(dir, tmpFilename);
                const fileStream = fs.createWriteStream(filepath);
                
                // Block finish attempts until this file is fully done
                isWritingTo.add(tmpFilename);

                // Create empty entry on promise list to guarantee ordering
                filePromises.push({} as never);
                const idx = filePromises.length-1;

                 
                file.on('data', (data: any) => {
                    fileStream.write(data);
                })
                    .on('end', () => {
                        fileStream.close(() => {

                            let field;
                            // Custom file parsing
                            if (config?.files?.parse) {
                                field = config.files.parse(name, filepath, original, req).then(file => (
                                    { name, value: file }
                                ));
                            }
                            // Default file parsing
                            else {
                                const _read = () => { fs.readFileSync(filepath); };
                                const _delete = () => { if (fs.existsSync(filepath)) fs.rmSync(filepath); };
                                field = Promise.resolve({
                                    name,
                                    value: {
                                        filepath,
                                        read: _read,
                                        delete: _delete
                                    }
                                });
                            }
    
                            // Replace empty entry with field
                            filePromises[idx] = field;

                            // Attempt to finish
                            isWritingTo.delete(tmpFilename);
                            attemptFinish();
                        });
                    });
            })
                .on('field', function(name: string, value: string) {
                    fields.push({
                        name,
                        value
                    });
                })
                .on('finish', function() {
                    isParsing = false;
                    attemptFinish();
                });

            // Express -> busboy
            req.on('data', chunk => {
                bb.write(chunk);
            });
            req.on('end', () => {
                bb.end();
            });
        });
    }

    /**
     * Inject a list of fields into a possibly-complex object.
     * More about it on the [README](README.md).
     * @param fields 
     * @param to 
     * @returns 
     */
    public static inject(fields: FormDataField<any>[], to: Record<string, any>) {

        
        const parts: FormDataPart[] = [];
        
        // Extract paths from fields, and assemble a parts array
        for (const field of fields) {
            let path: FormDataPart['path'] = field.name.split('[')
                .map(p => {
                    if (p[p.length-1] === ']') p = p.slice(0,-1);
                    const new_item = p === '^' ? true : p === '~' ? false : undefined;
                    if (p === '' || p === '^' || p === '~') p = '[]';
                    return { p, new_item };
                });
            // If the field name starts without [, the first term is removed
            if (path[0].p === '[]') {
                path = path.slice(1);
            }
            // If the final term of the path is an array, force infer of array item
            const final = path.at(-1);
            if (final?.p === '[]') {
                final.new_item = true;
            }
            parts.push({
                path,
                value: field.value
            });
        }

        // Inject each part into the object
        for (const part of parts) {

            // "Pointer" to the parent of the property being iterated
            let ref: Record<string|number, any> = to;

            for (let i = 0; i < part.path.length; i++) {
                const p = part.path[i].p;
                const next_p = part.path[i+1]?.p;
                const is_last = i === part.path.length-1;
                
                // p is a `value` or `object`
                if (p !== '[]') {
                    // last p, set value
                    if (is_last) ref[p] = part.value;
                    // not last p, create placeholder and move pointer
                    else {
                        ref[p] ??= {};
                        if (next_p === '[]' && !Array.isArray(ref[p])) ref[p] = [];
                        ref = ref[p];
                    }
                }
                // p is an `array`
                else {
                    const cur = ref[ref.length-1];

                    // Check if a new item should be added to the array
                    // before setting the value.
                    // This can be done explicitly, if the [] contains ^ or ~,
                    // or implicitly, then the code infers from some rules.

                    // not explicit iter
                    if (!(part.path[i].new_item === false))  {{
                        if (
                            // explicit new
                            part.path[i].new_item === true ||
                            
                            // infer, new if:
                            // - Item doesn't exist (empty list); or
                            // - Item is not an object; or
                            // - P is the last; or
                            // - Next p is final and included on current object
                            (!cur || typeof cur !== 'object' || is_last || (i == part.path.length-2 && next_p in cur))
                        ) {
                            if (next_p === '[]') ref.push([]);
                            else ref.push({});
                        }
                    }}

                    // last p, set value
                    if (is_last) ref[ref.length-1] = part.value;
                    // not last p, move pointer
                    else ref = ref[ref.length-1];
                }
            }
        }
        return to;
    }
}

