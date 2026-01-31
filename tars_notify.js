#!/usr/bin/env node
/**
 * Tars Notify CLI - Command line interface for notifications
 * Usage: node tars_notify.js [start|stop|status|notify|test]
 */

const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');

const SERVER_URL = 'http://localhost:8765';
const SERVER_JS = path.join(__dirname, 'notify_server.js');

function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8765,
            path: url,
            method: method,
            timeout: 5000
        };
        
        if (data) {
            options.headers = {
                'Content-Type': 'application/json'
            };
        }
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve(body);
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Timeout')));
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function isServerRunning() {
    try {
        await makeRequest('/status');
        return true;
    } catch {
        return false;
    }
}

async function startServer() {
    if (await isServerRunning()) {
        console.log('✅ Tars Notify is already running!');
        console.log('   http://localhost:8765');
        return;
    }
    
    console.log('🚀 Starting Tars Notify...');
    
    // Start server in background
    const child = spawn('node', [SERVER_JS], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    child.unref();
    
    // Wait for it to start
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (await isServerRunning()) {
            console.log('✅ Server running at http://localhost:8765');
            // Test notification
            await notify('Tars Notify is ready!', 'ping');
            return;
        }
    }
    
    console.log('⚠️ Server may not have started properly.');
}

async function stopServer() {
    if (!await isServerRunning()) {
        console.log('ℹ️ Server not running');
        return;
    }
    
    try {
        await makeRequest('/shutdown', 'POST');
        console.log('🛑 Server stopped');
    } catch (e) {
        console.log('⚠️ Error stopping server:', e.message);
    }
}

async function notify(message = 'Task complete!', sound = 'success') {
    try {
        await makeRequest('/notify', 'POST', { message, sound });
        console.log(`🔔 Notified: ${message}`);
    } catch (e) {
        console.log('⚠️ Server not running. Start with: node tars_notify.js start');
    }
}

async function testSounds() {
    const sounds = ['ping', 'success', 'complete', 'error'];
    for (const sound of sounds) {
        console.log(`Testing: ${sound}`);
        await notify(`Test: ${sound}`, sound);
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function main() {
    const args = process.argv.slice(2);
    const action = args[0] || 'status';
    
    switch (action) {
        case 'start':
            await startServer();
            break;
        case 'stop':
            await stopServer();
            break;
        case 'status':
            if (await isServerRunning()) {
                const status = await makeRequest('/status');
                console.log('✅ Tars Notify is running');
                console.log(`   Platform: ${status.platform}`);
                console.log(`   Audio: ${status.audio_backend}`);
                console.log(`   URL: http://localhost:8765`);
            } else {
                console.log('ℹ️ Tars Notify is not running');
                console.log('   Start with: node tars_notify.js start');
            }
            break;
        case 'notify':
            const message = args[1] || 'Task complete!';
            const sound = args[2] || 'success';
            await notify(message, sound);
            break;
        case 'test':
            await testSounds();
            break;
        default:
            console.log(`
Tars Notify - Desktop notifications for Clawdbot

Usage:
  node tars_notify.js start              Start the notification server
  node tars_notify.js stop               Stop the server
  node tars_notify.js status             Check if running
  node tars_notify.js notify [msg] [sound] Send notification
  node tars_notify.js test               Test all sounds

Sounds: success, error, ping, complete
            `);
    }
}

main().catch(console.error);
