import * as fsExtra from 'fs-extra';
import fastGlob from 'fast-glob';
import * as path from 'path';

/**
 * where the bsc-transpiled files reside
 */
const transpileDir = `${__dirname}/../dist/`;

async function run() {
    //sanitize the code (remove namespace prefixes, de-indent some lines, etc)
    sanitizeCode(`${transpileDir}/source/router.brs`);
    sanitizeCode(`${transpileDir}/source/router.d.bs`, true);
}

/**
 * Sanitize the code (remove namespace prefixes, de-indent some lines, etc)
 */
function sanitizeCode(filePath: string, optional = false) {
    if (optional && !fsExtra.pathExistsSync(filePath)) {
        console.warn('File does not exist:', filePath);
        return;
    }
    let code = fsExtra.readFileSync(filePath, 'utf8')
        .toString()
        //remove commented-out import statements
        .replace(/^'import.*\n?/mg, '')
        //remove de-indent lines
        .replace("' /**", "\n' /**")
        //remove prefixes from function names
        .replace(/function\s*router\_/gi, 'function ')
        //remove prefixes from function calls
        .replace(/sgrouter_/gi, '')
        //remove prefixes from namespaces
        .replace(/\bnamespace sgrouter./gi, 'namespace ')
        //remove all trailing whitespace on each line
        .replace(/[ \t]*$/gm, '')
        //remove newlines or blank lines from start of file
        .replace(/^[\r\n\s]*/, '')
        // replace createNode("Router" with createNode("roku_router"
        .replace(/createNode\("Router"/g, 'createNode("sgrouter_Router"')
        .trim()

    //remove the leading and trailing namespace for the .d.bs file
    if (/\.d\.bs$/.test(filePath)) {
        code = code
            //remove the first namespace declaration
            .replace(/^namespace.*\r?\n?/m, '')
            //the first occurrence of the `end namespace
            .replace(/^end namespace.*\r?\n?/m, '')
    }
    fsExtra.outputFileSync(filePath, code, 'utf8');
}

run();
