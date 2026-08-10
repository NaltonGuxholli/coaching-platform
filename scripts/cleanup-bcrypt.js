const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..', 'node_modules');
function walk(dir) {
  try {
    return fs.readdirSync(dir).map((f) => path.join(dir, f));
  } catch (e) { return []; }
}
let removed = [];
function rm(p) {
  try {
    if (fs.existsSync(p)) {
      const stat = fs.lstatSync(p);
      if (stat.isDirectory()) {
        fs.readdirSync(p).forEach((f) => rm(path.join(p, f)));
        fs.rmdirSync(p);
        removed.push(p);
      } else {
        fs.unlinkSync(p);
        removed.push(p);
      }
    }
  } catch (e) {
    // ignore
  }
}
function findAndRemove(dir) {
  for (const file of walk(dir)) {
    const name = path.basename(file).toLowerCase();
    if (name.startsWith('.bcrypt') || name.startsWith('bcrypt') || name.includes('bcrypt')) {
      rm(file);
    } else {
      // descend
      try {
        if (fs.lstatSync(file).isDirectory()) findAndRemove(file);
      } catch (e) {}
    }
  }
}
findAndRemove(base);
console.log('Removed items:', removed.length);
if (removed.length) console.log(removed.join('\n'));
else console.log('No bcrypt artifacts found.');
