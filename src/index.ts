import { Request, Response, NextFunction } from 'express';
import { MultibodyFormData } from './formdata';
import { MultibodyConfig } from './config';
import { MultibodyJSON } from './json';
import fs from 'fs';
import path from 'path';

/**
 * [express-multibody](https://github.com/hugoaboud/express-multibody) is
 * a middleware which parses different types of content into the request `body`.
 * 
 * - `application/json`: Uses the native JSON parser to directly parse the
 * request stream as the body.
 * - `multipart/form-data`: Uses `busboy` to parse the request stream, then
 * builds a possibly-complex object according to the naming structure described
 * [here](https://github.com/hugoaboud/express-multibody?tab=readme-ov-file#FormData)
 * and use it as the body.
 *   - Files are also processed and included on the body according to the same naming structure.
 *   - Files can be parsed by a custom method provided in the `config` argument.
 * 
 * ```typescript
 * express.use(multibody({ ... }))
 * ```
 * 
 * @param config The `express-multibody` configuration. (see [reference](https://github.com/hugoaboud/express-multibody?tab=readme-ov-file#Configuration))
 * @returns 
 */
export default function multibody<File = string>(config?: MultibodyConfig<File>) {

    // Create uploadDir if it doesn't exist
    if (config?.files?.mkDir === undefined || config.files.mkDir) {
        const dir = config?.files?.uploadDir ?? path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
    }

    // RequestHandler
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body: Record<string, unknown> = {};
            
            const type = req.header('Content-Type');
            
            // [multipart] consumed with busboy and parsed to
            // an object structure
            if (type?.startsWith('multipart/form-data')) {
                const input = await MultibodyFormData.consume(req, config ?? {});
                MultibodyFormData.inject(input.fields, body);

                const files = await Promise.all(input.filePromises);
                MultibodyFormData.inject(files, body);
            }
            // [json] parsed with native nodejs JSON
            else if (type?.startsWith('application/json')) {
                const input = await MultibodyJSON.consume(req);
                Object.assign(body, input);
            }
            
            req.body = body;
            next();
        } catch (error) {
            next(error);
        }
    }
}