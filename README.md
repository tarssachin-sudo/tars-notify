# 🤖 Tars Notify

A lightweight notification server for Clawdbot. Plays a sound when AI tasks complete so you don't have to stare at the screen waiting.

## ✨ Features

- 🔊 **Audio notifications** - Plays sounds when tasks complete
- 🚀 **Zero dependencies** - Pure Node.js, no install needed
- 🖥️ **Cross-platform** - Works on Windows, macOS, Linux
- 📡 **Simple HTTP API** - Easy integration with any tool
- 🎯 **Multiple sounds** - Success, error, ping, complete

## 🚀 Quick Start

```bash
# Start the server
node tars_notify.js start

# Or run directly
node notify_server.js
```

Server runs on `http://localhost:8765`

## 📡 API Usage

### Trigger a notification
```bash
curl -X POST http://localhost:8765/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task complete", "sound": "success"}'
```

### Check status
```bash
curl http://localhost:8765/status
```

### Test sounds
```bash
node tars_notify.js test
```

### Stop server
```bash
node tars_notify.js stop
```

## 🔊 Sounds Available

| Sound | Use Case |
|-------|----------|
| `ping` | Quick acknowledgment |
| `success` | Task completed successfully |
| `complete` | Long-running task finished |
| `error` | Something went wrong |

## 🤖 Clawdbot Integration

### From shell:
```bash
# After a long task completes
curl -s -X POST http://localhost:8765/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"GitHub repo created!","sound":"success"}'
```

### From JavaScript:
```javascript
const { tars } = require('./notify_client');

// Quick ping
await tars.ping('Done!');

// Success notification
await tars.success('Repository created!');

// Error notification
await tars.error('Build failed!');

// Long task complete
await tars.complete('Analysis finished!');
```

### From Python:
```python
import requests

requests.post("http://localhost:8765/notify", 
              json={"message": "Done!", "sound": "success"})
```

## 🖥️ Auto-start with Windows

1. Create a shortcut to `tars_notify.js`
2. Press `Win+R`, type `shell:startup`
3. Paste the shortcut there

The server will start automatically on login.

## 📁 Project Structure

```
tars-notify/
├── notify_server.js    # Main server (generates sounds + HTTP API)
├── tars_notify.js      # CLI wrapper (start/stop/status/test)
├── notify_client.js    # JavaScript client library
├── sounds/             # Generated WAV files
└── README.md
```

## 🔧 Technical Details

- **Audio backend**: Auto-detects platform (Windows Media Player, macOS afplay, Linux aplay/paplay)
- **Sound generation**: Creates WAV files programmatically (no external assets)
- **Server**: Built-in Node.js HTTP server
- **Memory**: ~20MB RAM usage

## 📝 License

MIT - Feel free to use and modify!
