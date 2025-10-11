const http = require('http');

function postJson(path, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function getWithAuth(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        const login = await postJson('/api/login', { email: 'admin@ignation.com', password: 'lionking123' });
        console.log('login:', login.status, login.body);
        if (!login.body || !login.body.token) return console.error('No token returned');
        const token = login.body.token;
        const students = await getWithAuth('/api/admin/students', token);
        console.log('students:', students.status, students.body);
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
