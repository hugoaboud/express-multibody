/**
 * Represents an object as a FormData, in a way that
 * can be parsed by `express-multibody`.
 * 
 * This version uses the `File` type available on Browsers,
 * but will fail to run on a NodeJS environment.
 */
export class FormObj extends FormData {
    
    constructor(obj: Record<string, any>) {
        super();
        const parts = this.make('', obj);
        for (const part of parts) {
            this.append(part[0], part[1]);
        }
    }

    /**
     * Make a list of parts to be appended to the FormData
     */
    private make(key: string, value: any): [string, string|File][] {
        // Null or undefined, no field
        if (value == null) {
            return [];
        }
        // Primitive or file, single field
        if (typeof value !== 'object' || value instanceof File) {
            return [[key, value]];
        }
        // Array, make children
        if (Array.isArray(value)) {
            return value.map(val => {
                const children = this.make(key + '[~]', val);
                // Replace first part children with ^ operator
                children[0][0] = key + '[^]' + children[0][0].slice(key.length+3);
                return children;
            }).flat(1);
        }
        // Object, make children
        else {
            const parts: [string, any][] = [];
            for (const subkey in value) {
                parts.push(...this.make(key + `[${subkey}]`, value[subkey]));
            }
            return parts;
        }
    }
}