const http = require('http');

function postJson(path, data, token) {
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
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
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

function putJson(path, data, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
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

async function run() {
    try {
        console.log('Logging in as admin...');
        const login = await postJson('/api/login', { email: 'admin@ignation.com', password: 'lionking123' });
        console.log('login:', login.status, login.body);
        if (!login.body || !login.body.token) return console.error('No token returned');
        const token = login.body.token;

        console.log('\nGranting access (student_id:1, course_id:101)...');
        const grant = await postJson('/api/admin/grant-access', { student_id: 1, course_id: 101 }, token);
        console.log('grant-access:', grant.status, grant.body);

        const enrollmentId = grant.body && grant.body.enrollmentId;
        if (enrollmentId) {
            console.log('\nRevoking the enrollment we just created...');
            const revoke = await postJson('/api/admin/revoke-access', { enrollment_id: enrollmentId }, token);
            console.log('revoke-access:', revoke.status, revoke.body);
        }

        console.log('\nUpdating student id=1 (set full_name)');
        const upd = await putJson('/api/admin/update-student', { id: 1, full_name: 'Test Student (Admin Updated)' }, token);
        console.log('update-student:', upd.status, upd.body);

        console.log('\nApproving order id=1 (if exists)');
        const approve = await postJson('/api/admin/approve-order', { order_id: 1 }, token);
        console.log('approve-order:', approve.status, approve.body);

    } catch (e) {
        console.error('Error in tests:', e);
    }
}

run();
