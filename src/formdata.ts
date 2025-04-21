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
    
            const fields: FormDataField[] = []
            const filePromises: Promise<FormDataField<File>>[] = []

            // Flags to stop the parsing process
            let isParsing = true;
            const isWritingTo = new Set<string>();
            
            // File writes can last until after busboy finished,
            // so both @finish and @file.end events trigger this
            const attemptFinish = () => {
                if (isParsing || isWritingTo.size > 0) return;
                resolve({ fields, filePromises });
            }

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
                    fileStream.write(data)
                })
                    .on('end', () => {
                        fileStream.close(() => {

                            let field;
                            // Custom file parsing
                            if (config?.files?.parse) {
                                field = config.files.parse(name, filepath, original, req).then(file => (
                                    { name, value: file }
                                ))
                            }
                            // Default file parsing
                            else {
                                const _delete = () => { if (fs.existsSync(filepath)) fs.rmSync(filepath) }
                                field = Promise.resolve({
                                    name,
                                    value: {
                                        filepath,
                                        delete: _delete
                                    }
                                });
                            }
    
                            // Replace empty entry with field
                            filePromises[idx] = field;

                            // Attempt to finish
                            isWritingTo.delete(tmpFilename);
                            attemptFinish();
                        })
                    })
            })
                .on('field', function(name: string, value: string) {
                    fields.push({
                        name,
                        value
                    })
                })
                .on('finish', function() {
                    isParsing = false;
                    attemptFinish();
                });

            // Express -> busboy
            req.on('data', chunk => {
                bb.write(chunk);
            })
            req.on('end', () => {
                bb.end()
            })
        })
    }

    /**
     * Inject a list of fields into a possibly-complex object.
     * More about it on the [README](README.md).
     * @param fields 
     * @param to 
     * @returns 
     */
    public static inject(fields: FormDataField<any>[], to: Record<string, any>) {

        // Furn fields into parts, with array paths

        const parts: {
            path: string[]
            value: any
        }[] = [];
        
        for (const field of fields) {
            let path = field.name.split('[')
                .map(p => {
                    if (p[p.length-1] === ']') p = p.slice(0,-1);
                    if (p === '') p = '[]'
                    return p;
                })
            if (path[0] === '[]') {
                path = path.slice(1);
            }
            parts.push({
                path,
                value: field.value
            });
        }

        // Inject each part into the object

        for (const part of parts) {

            let ref: Record<string|number, any> = to;

            for (let i = 0; i < part.path.length; i++) {
                const p = part.path[i];
                const is_last = i === part.path.length-1;
                
                // Object key
                if (p !== '[]') {
                    if (is_last) ref[p] = part.value;
                    else {
                        ref[p] ??= {};
                        if (part.path[i+1] === '[]' && !Array.isArray(ref[p])) ref[p] = [];
                        ref = ref[p];
                    }
                }
                // Array
                else {
                    const cur = ref[ref.length-1];
                    const next_p = part.path[i+1]

                    if (!cur || typeof cur !== 'object' || !next_p || (i >= part.path.length-2 && next_p in cur)) {
                        if (part.path[i+1] === '[]') ref.push([]);
                        else ref.push({});
                    }

                    if (is_last) ref[ref.length-1] = part.value;
                    else ref = ref[ref.length-1];
                }
            }
        }
        return to;
    }
}

