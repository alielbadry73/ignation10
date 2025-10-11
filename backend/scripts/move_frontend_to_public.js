const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const publicDir = path.join(__dirname, '..', 'public');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

ensureDir(publicDir);

const items = [
  'backend_root_live.html',
  'index.html',
  'home.html',
  'frontend_index.html',
  'about.html',
  'courses.html',
  'contact.html',
  'faqs.html',
  'community.html',
  'course-details.html',
  'checkout.html',
  'style.css',
  'css',
  'js',
  'images',
  'icomoon',
  'favicon.ico'
];

items.forEach((name) => {
  const src = path.join(root, name);
  const dst = path.join(publicDir, name);
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    // copy recursively
    const copyDir = (s, d) => {
      ensureDir(d);
      fs.readdirSync(s).forEach(file => {
        const sp = path.join(s, file);
        const dp = path.join(d, file);
        if (fs.statSync(sp).isDirectory()) copyDir(sp, dp);
        else fs.copyFileSync(sp, dp);
      });
    };
    copyDir(src, dst);
  } else {
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
  console.log('Copied', name, 'to public');
});

console.log('Frontend assets moved to backend/public');
