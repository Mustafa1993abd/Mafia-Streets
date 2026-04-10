const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // text alignment
    content = content.replace(/\btext-left\b/g, 'text-start');
    content = content.replace(/\btext-right\b/g, 'text-end');
    
    // padding
    content = content.replace(/\bpl-(\d+|px)\b/g, 'ps-$1');
    content = content.replace(/\bpr-(\d+|px)\b/g, 'pe-$1');
    
    // margin
    content = content.replace(/\bml-(\d+|px|auto)\b/g, 'ms-$1');
    content = content.replace(/\bmr-(\d+|px|auto)\b/g, 'me-$1');
    content = content.replace(/\b-ml-(\d+|px)\b/g, '-ms-$1');
    content = content.replace(/\b-mr-(\d+|px)\b/g, '-me-$1');
    
    // absolute positioning
    content = content.replace(/\bleft-(\d+|px|1\/2|1\/3|1\/4|full)\b/g, 'start-$1');
    content = content.replace(/\bright-(\d+|px|1\/2|1\/3|1\/4|full)\b/g, 'end-$1');
    content = content.replace(/\b-left-(\d+|px|1\/2|1\/3|1\/4|full)\b/g, '-start-$1');
    content = content.replace(/\b-right-(\d+|px|1\/2|1\/3|1\/4|full)\b/g, '-end-$1');
    
    // border
    content = content.replace(/\bborder-l\b/g, 'border-s');
    content = content.replace(/\bborder-r\b/g, 'border-e');
    content = content.replace(/\bborder-l-(\d+|px|transparent|white\/[0-9]+|zinc-[0-9]+|red-[0-9]+)\b/g, 'border-s-$1');
    content = content.replace(/\bborder-r-(\d+|px|transparent|white\/[0-9]+|zinc-[0-9]+|red-[0-9]+)\b/g, 'border-e-$1');
    
    // rounded corners
    content = content.replace(/\brounded-l(-[a-z0-9]+)?\b/g, 'rounded-s$1');
    content = content.replace(/\brounded-r(-[a-z0-9]+)?\b/g, 'rounded-e$1');
    content = content.replace(/\brounded-tl(-[a-z0-9]+)?\b/g, 'rounded-ss$1');
    content = content.replace(/\brounded-tr(-[a-z0-9]+)?\b/g, 'rounded-se$1');
    content = content.replace(/\brounded-bl(-[a-z0-9]+)?\b/g, 'rounded-es$1');
    content = content.replace(/\brounded-br(-[a-z0-9]+)?\b/g, 'rounded-ee$1');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
