import path from 'path';
import fs from 'fs';
import pkg from './package.json' assert { type: 'json' };

const distPackage = {
    ...pkg,
    scripts: undefined,
    devDependencies: undefined
}

fs.writeFileSync(
    path.join('dist', 'package.json'),
    JSON.stringify(distPackage, undefined, 2)
)

fs.cpSync('README.md', path.join('dist', 'README.md'))
fs.cpSync('LICENSE', path.join('dist', 'LICENSE'))

