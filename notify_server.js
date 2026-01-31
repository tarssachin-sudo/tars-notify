#!/usr/bin/env node
/**
 * Tars Notify Server - Desktop notifications for Clawdbot
 * Plays sounds when tasks complete so you don't have to wait staring at the screen
 * 
 * Usage: node notify_server.js
 * Server runs on http://localhost:8765
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = 8765;
const SOUNDS_DIR = path.join(__dirname, 'sounds');

// Ensure sounds directory exists
if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

// Check platform
const platform = os.platform();
let audioBackend = null;

// Detect available audio backends
function detectAudioBackend() {
    // Windows
    if (platform === 'win32') {
        audioBackend = 'powershell';
        return;
    }
    
    // macOS
    if (platform === 'darwin') {
        exec('which afplay', (err) => {
            if (!err) audioBackend = 'afplay';
        });
        return;
    }
    
    // Linux - check various
    const checkCmd = 'which aplay paplay play || echo "none"';
    exec(checkCmd, (err, stdout) => {
        if (stdout.includes('aplay')) audioBackend = 'aplay';
        else if (stdout.includes('paplay')) audioBackend = 'paplay';
        else if (stdout.includes('play')) audioBackend = 'sox';
    });
}

// Generate a simple WAV file
function generateWav(filename, freq = 440, duration = 0.3, pattern = 'beep') {
    const filepath = path.join(SOUNDS_DIR, filename);
    if (fs.existsSync(filepath)) return filepath;
    
    const sampleRate = 44100;
    const numSamples = Math.floor(duration * sampleRate);
    const dataSize = numSamples * 4; // 2 channels * 2 bytes
    const fileSize = 44 + dataSize;
    
    const buffer = Buffer.alloc(fileSize);
    let offset = 0;
    
    // WAV Header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size
    buffer.writeUInt16LE(1, offset); offset += 2; // AudioFormat (PCM)
    buffer.writeUInt16LE(2, offset); offset += 2; // NumChannels (stereo)
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(sampleRate * 4, offset); offset += 4; // ByteRate
    buffer.writeUInt16LE(4, offset); offset += 2; // BlockAlign
    buffer.writeUInt16LE(16, offset); offset += 2; // BitsPerSample
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;
    
    // Generate samples
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let value = 0;
        
        if (pattern === 'beep') {
            const envelope = i < numSamples * 0.1 ? 1 : 0.5;
            value = Math.floor(32767 * 0.3 * envelope * Math.sin(2 * Math.PI * freq * t));
        } else if (pattern === 'success') {
            const f = t < duration / 2 ? freq : freq * 1.5;
            const envelope = 1 - t / duration;
            value = Math.floor(32767 * 0.3 * envelope * Math.sin(2 * Math.PI * f * t));
        } else if (pattern === 'error') {
            const f = freq * (1 - t / duration * 0.5);
            value = Math.floor(32767 * 0.3 * Math.sin(2 * Math.PI * f * t));
        } else if (pattern === 'ping') {
            const envelope = Math.max(0, 1 - t / duration * 3);
            value = Math.floor(32767 * 0.2 * envelope * Math.sin(2 * Math.PI * freq * t));
        } else if (pattern === 'complete') {
            const segment = Math.floor(t / (duration / 3));
            const f = freq * (1 + segment * 0.5);
            const envelope = 1 - t / duration;
            value = Math.floor(32767 * 0.25 * envelope * Math.sin(2 * Math.PI * f * t));
        }
        
        // Stereo (left and right)
        buffer.writeInt16LE(value, offset); offset += 2;
        buffer.writeInt16LE(value, offset); offset += 2;
    }
    
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

// Generate all sounds
function initSounds() {
    console.log('🔊 Generating sounds...');
    generateWav('success.wav', 880, 0.4, 'success');
    generateWav('error.wav', 440, 0.5, 'error');
    generateWav('ping.wav', 1200, 0.15, 'ping');
    generateWav('complete.wav', 660, 0.6, 'complete');
    console.log('✅ Sounds ready');
}

// Play sound
function playSound(soundName = 'success') {
    const filepath = path.join(SOUNDS_DIR, `${soundName}.wav`);
    if (!fs.existsSync(filepath)) {
        console.log(`⚠️ Sound not found: ${soundName}`);
        return;
    }
    
    let cmd = null;
    
    if (platform === 'win32') {
        // Use PowerShell to play WAV
        cmd = `powershell -c "(New-Object Media.SoundPlayer '${filepath}').PlaySync()"`;
    } else if (platform === 'darwin') {
        cmd = `afplay "${filepath}"`;
    } else {
        // Linux - try different backends
        if (audioBackend === 'aplay') {
            cmd = `aplay "${filepath}" 2>/dev/null`;
        } else if (audioBackend === 'paplay') {
            cmd = `paplay "${filepath}" 2>/dev/null`;
        } else if (audioBackend === 'sox') {
            cmd = `play "${filepath}" 2>/dev/null`;
        }
    }
    
    if (cmd) {
        exec(cmd, { timeout: 5000 }, (err) => {
            if (err) console.log(`🔇 Audio error: ${err.message}`);
        });
    } else {
        console.log(`🔇 Would play: ${soundName}`);
        // Terminal bell fallback
        process.stdout.write('\x07');
    }
}

// HTTP Server
const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = req.url;
    const timestamp = new Date().toISOString();
    
    // Status endpoint
    if (url === '/' || url === '/status') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'running',
            audio_backend: audioBackend || 'default',
            platform: platform,
            sounds: ['success', 'error', 'ping', 'complete'],
            port: PORT,
            timestamp
        }, null, 2));
        return;
    }
    
    // Notify endpoint
    if (url === '/notify' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const message = data.message || 'Notification';
                const sound = data.sound || 'success';
                const time = new Date().toLocaleTimeString();
                
                console.log(`🔔 [${time}] ${message}`);
                playSound(sound);
                
                res.writeHead(200);
                res.end(JSON.stringify({
                    ok: true,
                    message,
                    sound,
                    timestamp
                }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }
    
    // Test sound endpoint
    if (url.startsWith('/test/')) {
        const soundName = url.split('/')[2];
        playSound(soundName);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, sound: soundName }));
        return;
    }
    
    // Shutdown endpoint
    if (url === '/shutdown' && req.method === 'POST') {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, message: 'Shutting down...' }));
        setTimeout(() => process.exit(0), 100);
        return;
    }
    
    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// Start server
detectAudioBackend();
initSounds();

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🤖 Tars Notify Server');
    console.log('='.repeat(50));
    console.log(`Desktop notifications for Clawdbot`);
    console.log(`Server: http://localhost:${PORT}`);
    console.log('-'.repeat(50));
    console.log('Ready! Trigger with:');
    console.log(`  curl -X POST http://localhost:${PORT}/notify \\\n    -H "Content-Type: application/json" \\\n    -d '{"message": "Done!", "sound": "success"}'`);
    console.log('-'.repeat(50));
    
    // Play startup sound
    setTimeout(() => playSound('ping'), 500);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    server.close(() => process.exit(0));
});
