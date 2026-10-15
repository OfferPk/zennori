const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const wwwDir = path.join(rootDir, 'www');

console.log('Building ZenNori web assets...');

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// Clean wwwDir
const existingFiles = fs.readdirSync(wwwDir);
for (const file of existingFiles) {
  const fp = path.join(wwwDir, file);
  if (fs.statSync(fp).isFile()) {
    fs.unlinkSync(fp);
  }
}

// Copy all assets from src/
const srcFiles = fs.readdirSync(srcDir);
let count = 0;
for (const file of srcFiles) {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(wwwDir, file);
  if (fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, destPath);
    count++;
  }
}

// Create .nojekyll for GitHub Pages
fs.writeFileSync(path.join(wwwDir, '.nojekyll'), '', 'utf8');
count++;

console.log(`ZenNori build completed: ${count} assets copied to ${wwwDir}`);
