/**
 * Tars Notify Client - JavaScript client for notifications
 * Usage in Clawdbot: Use shell command or HTTP request
 */

const http = require('http');

const SERVER_URL = 'http://localhost:8765';

function notify(message = 'Task complete!', sound = 'success') {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ message, sound });
        
        const req = http.request({
            hostname: 'localhost',
            port: 8765,
            path: '/notify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            timeout: 5000
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(res.statusCode === 200));
        });
        
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.write(data);
        req.end();
    });
}

// Quick notifications
const tars = {
    ping: (msg = 'Done!') => notify(msg, 'ping'),
    success: (msg = 'Success!') => notify(msg, 'success'),
    error: (msg = 'Error!') => notify(msg, 'error'),
    complete: (msg = 'Complete!') => notify(msg, 'complete'),
    notify
};

// Shell command generator
function notifyCmd(message, sound = 'success') {
    return `curl -s -X POST http://localhost:8765/notify -H "Content-Type: application/json" -d '{"message":"${message}","sound":"${sound}"}'`;
}

module.exports = { notify, tars, notifyCmd };

// If run directly, test
if (require.main === module) {
    console.log('Testing Tars Notify Client...');
    notify('Client test!', 'ping').then(ok => {
        console.log(ok ? '✅ Notification sent' : '⚠️ Server not running');
    });
}
