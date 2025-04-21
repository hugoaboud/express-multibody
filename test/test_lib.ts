import fs from 'fs';
import path from 'path';
import express from 'express';
import multibody from '../src';
import { Server } from 'http';
import { createHash, randomBytes, randomUUID } from 'crypto';

export type TestCallback = (body: Record<string, any>) => void

export class Test {

    public static PORT = 3420
    public static server?: Server

    /**
     * Given that we want the "server side" parsed object, and
     * the test is running from the "client side" perspective,
     * callbacks are stored to be used by the "server side" to
     * return the parsed body to the test without serializing
     * it on a network response.
    */
    public static callbacks: Record<string, TestCallback> = {};

    /* Lifecycle */

    public static beforeAll() {
        beforeAll(async () => {
            await Test.app()
        })
    }

    public static afterAll() {
        afterAll(() => 
            new Promise<void>(resolve => {
                this.server?.close(() => { resolve(); });
            })
        )
    }

    public static rmFiles(clientFiles: string[], serverFiles: {delete: ()=>void}[]) {
        for (const filepath of clientFiles) {
            if (fs.existsSync(filepath)) fs.rmSync(filepath);
        }
        for (const file of serverFiles) {
            file.delete();
        }
    }

    /* Data makers */

    public static makeFormdata(input: [string, string|{blob: Blob, filename: string}][]) {
        const multipart = new FormData();
        input.forEach(d => {
            if (typeof d[1] === 'string') {
                multipart.append(d[0],d[1]);
            }
            else {
                multipart.append(d[0],d[1].blob,d[1].filename);
            }
        })
        return multipart;
    }

    public static makeFile(
        tmpFilename: string,
        size = 1024*1024 // 1mb
    ) {
        const contents = randomBytes(size);
        const tmpPath = path.join(process.cwd(), tmpFilename);
        fs.writeFileSync(tmpPath, contents.toString('utf-8'));

        const file = fs.readFileSync(tmpFilename, { encoding: 'utf-8' });

        return {
            blob: new Blob([file]),
            filename: tmpFilename,
            filepath: tmpPath
        }
    }
    
    /* App */

    private static async app() {
        return new Promise<void>((resolve) => {      
            if (this.server) {
                resolve();
                return
            }

            const app = express();
            app.use(multibody({
                files: {
                    parse: this.parseFile.bind(this)
                }
            }));

            app.post('/test', (req, res) => {
                const id = req.query['id'] as string;
                this.useCallback(id, req.body);
                res.send();
            })

            this.server = app.listen(Test.PORT, () => {
                resolve();
            });
        })
    }

    private static async parseFile(key: string, filepath: string, original: any) {
        const hash = await Hash.file(filepath);
        const _delete = () => {
            if (fs.existsSync(filepath)) fs.rmSync(filepath);
        };
        return { key, filepath, original, hash, delete: _delete }
    } 

    /* Request */
    
    public static requestJson(body: Record<string, any>) {
        return this.fetch({
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        })
    }
    
    public static requestFormData(body: FormData) {
        return this.fetch({
            method: 'POST',
            body: body as any
        })
    }

    /* Expect Helpers */

    public static async expectedFile(key: string, uploaded: { filepath: string, filename: string }) {
        const hash = await Hash.file(uploaded.filepath);
        return {
            key: key,
            filepath: expect.anything(),
            original: {
                filename: uploaded.filename.replace(/^tmp\//, ''),
                encoding: expect.anything(),
                mimeType: expect.anything()
            },
            hash,
            delete: expect.anything()
        }
    } 

    /* Internals */

    private static saveCallback(callback: TestCallback) {
        const id = randomUUID();
        this.callbacks[id] = callback;
        return id;
    }

    private static useCallback(id: string, body: Record<string, any>) {
        this.callbacks[id](body);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.callbacks[id];
    }
    
    private static fetch(init?: RequestInit  ) {
        return new Promise<Record<string, any>>(resolve => {
            let body: Record<string, any>;
            const id = this.saveCallback(out => { body = out });
            void fetch(`http://127.0.0.1:${Test.PORT}/test?id=${id}`, init).then(() => {
                resolve(body);
            })
        })
    }
}

export class Hash {

    public static file(filepath: string) {
        return new Promise<string>(resolve => {
            const fd = fs.createReadStream(filepath);
            const hash = createHash('sha256');
            hash.setEncoding('hex');
            fd.on('end', function() {
                hash.end();
                resolve(hash.read());
            });
            fd.pipe(hash);
        })
    }

}