import { Request } from 'express';
import { MultibodyConfig } from './config';

/**
 * Utility class for dealing with `application/json` requests.
 */
export class MultibodyJSON {

    /**
     * Consume the `JSON` of a express request with native JSON parser.
     * @param req The express request.
     * @param config The `express-multibody` configuration. (see [reference](https://github.com/hugoaboud/express-multibody?tab=readme-ov-file#Configuration))
     * @returns A parsed JSON object.
     */
    public static consume(req: Request, config?: MultibodyConfig) {
        return new Promise<Record<string, any>>((resolve, reject) => {
            let byteCount = 0;

            const chunks: any[] = [];
            req.on('data', chunk => {

                if (config?.json?.maxSize) {
                    byteCount += chunk.byteLength as number;
                    reject(new Error(`Max length exceeded ${byteCount}/${config.json.maxSize}`));
                    return;
                }
                chunks.push(chunk);
            });
            req.on('end', () => {
                const data = Buffer.concat(chunks).toString();
                resolve(JSON.parse(data));
            });
        });
    }

}

