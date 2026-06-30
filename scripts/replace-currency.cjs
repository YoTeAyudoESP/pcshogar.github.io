const fs = require('fs');
const glob = require('glob');
const path = require('path');

const srcPath = path.join(process.cwd(), 'src');
const files = glob.sync('**/*.tsx', { cwd: srcPath, absolute: true });

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('€')) {
        // Replace '(€)' with '({getCurrencySymbol()})'
        if (content.includes('(€)')) {
            content = content.replace(/\(€\)/g, '({getCurrencySymbol()})');
            changed = true;
        }
        
        // Replace ' €' or '€ ' in strings if possible, or just '€' in JSX text.
        // It's safer to just replace '€' inside template literals or JSX strings if it's not '(€)'.
        // For example: `${value}€` -> `${value}${getCurrencySymbol()}`
        if (content.match(/`([^`]*?)€([^`]*?)`/)) {
            content = content.replace(/`([^`]*?)€([^`]*?)`/g, '`$1${getCurrencySymbol()}$2`');
            changed = true;
        }

        if (content.match(/>\s*€\s*</)) {
             content = content.replace(/>\s*€\s*</g, '>{getCurrencySymbol()}<');
             changed = true;
        }
        
        // Match base calc.: -- €
        if (content.includes('Base calc.: -- €')) {
             content = content.replace(/Base calc\.: -- €/g, 'Base calc.: -- {getCurrencySymbol()}');
             changed = true;
        }

        if (content.includes('} €')) {
             content = content.replace(/\} €/g, '} {getCurrencySymbol()}');
             changed = true;
        }

        if (content.includes('€ EUR')) {
             content = content.replace(/€ EUR/g, '{getCurrencySymbol()} EUR');
             changed = true;
        }
    }

    if (changed) {
        // Add import if it's not there
        if (!content.includes('getCurrencySymbol')) {
            // Find relative path to src/utils/financeCalculations
            const fileDir = path.dirname(file);
            let relativePath = path.relative(fileDir, path.join(srcPath, 'utils', 'financeCalculations'));
            relativePath = relativePath.replace(/\\/g, '/');
            if (!relativePath.startsWith('.')) {
                relativePath = './' + relativePath;
            }
            const importStmt = `import { getCurrencySymbol } from '${relativePath}';\n`;
            
            // Insert after the last import
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLastImport + 1) + importStmt + content.slice(endOfLastImport + 1);
            } else {
                content = importStmt + content;
            }
        }
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    }
});
