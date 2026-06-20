
const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile()) {
            callback(filepath);
        }
    });
}

const srcDir = path.join(__dirname, 'src');

walk(srcDir, (filepath) => {
    if (!filepath.endsWith('.tsx') && !filepath.endsWith('.ts')) return;

    let content = fs.readFileSync(filepath, 'utf8');
    let modified = false;

    // Regex to match imports with version suffixes
    // Matches: import ... from "pkg@1.2.3" or "scoped/pkg@1.2.3"
    // We specifically look for the @version pattern at the end
    // Pattern: " (anything) @ (digit) (anything) "
    const regex = /from "([^"]+)@\d+\.[^"]+"/g;

    const newContent = content.replace(regex, (match, pkgName) => {
        modified = true;
        console.log(`Fixing ${filepath}: ${match} -> from "${pkgName}"`);
        return `from "${pkgName}"`;
    });

    if (modified) {
        fs.writeFileSync(filepath, newContent, 'utf8');
    }
});
