const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
      const { statusCode } = res;
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve({ statusCode, body: raw }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log('Checking /health');
    const h = await get('/health');
    console.log('/health', h.statusCode, h.body.slice(0, 200));

    console.log('Fetching /');
    const r = await get('/');
    console.log('/', r.statusCode, 'length=', r.body.length);

    console.log('Fetching /style.css');
    const s = await get('/style.css');
    console.log('/style.css', s.statusCode, 'len=', s.body.length);

    console.log('Smoke tests passed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke tests failed', err);
    process.exit(2);
  }
})();
