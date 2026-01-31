#!/usr/bin/env python3
"""
Tars Notify Server - Desktop notifications for Clawdbot
Plays sounds when tasks complete so you don't have to wait staring at the screen.
"""

import os
import sys
import json
import wave
import struct
import threading
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)
PORT = 8765
SOUNDS_DIR = os.path.join(os.path.dirname(__file__), 'sounds')

# Ensure sounds directory exists
os.makedirs(SOUNDS_DIR, exist_ok=True)

# Try different audio backends
AUDIO_BACKEND = None

def init_audio():
    """Initialize audio backend"""
    global AUDIO_BACKEND
    
    # Try pygame first (cross-platform)
    try:
        import pygame
        pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
        AUDIO_BACKEND = 'pygame'
        print("✅ Audio backend: pygame")
        return True
    except Exception as e:
        print(f"⚠️ pygame failed: {e}")
    
    # Try playsound
    try:
        from playsound import playsound
        AUDIO_BACKEND = 'playsound'
        print("✅ Audio backend: playsound")
        return True
    except Exception as e:
        print(f"⚠️ playsound failed: {e}")
    
    # Windows-specific
    if sys.platform == 'win32':
        try:
            import winsound
            AUDIO_BACKEND = 'winsound'
            print("✅ Audio backend: winsound")
            return True
        except Exception as e:
            print(f"⚠️ winsound failed: {e}")
    
    # macOS-specific
    if sys.platform == 'darwin':
        AUDIO_BACKEND = 'afplay'
        print("✅ Audio backend: afplay (macOS)")
        return True
    
    # Linux - try various
    for cmd in ['aplay', 'paplay', 'ogg123']:
        if subprocess.run(['which', cmd], capture_output=True).returncode == 0:
            AUDIO_BACKEND = cmd
            print(f"✅ Audio backend: {cmd}")
            return True
    
    print("⚠️ No audio backend available - notifications will be silent")
    return False

def generate_sound(filename, freq=440, duration=0.3, pattern='beep'):
    """Generate a simple WAV sound file"""
    filepath = os.path.join(SOUNDS_DIR, filename)
    if os.path.exists(filepath):
        return filepath
    
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    with wave.open(filepath, 'w') as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = i / sample_rate
            
            if pattern == 'beep':
                # Simple beep
                value = int(32767 * 0.3 * (1 if i < num_samples * 0.1 else 0.5) * 
                           (1 if i % int(sample_rate/freq) < int(sample_rate/freq)/2 else -1))
            elif pattern == 'success':
                # Ascending two-tone
                f = freq if t < duration/2 else freq * 1.5
                value = int(32767 * 0.3 * (1 - t/duration) * 
                           (1 if i % int(sample_rate/f) < int(sample_rate/f)/2 else -1))
            elif pattern == 'error':
                # Descending tone
                f = freq * (1 - t/duration * 0.5)
                value = int(32767 * 0.3 * 
                           (1 if i % int(sample_rate/f) < int(sample_rate/f)/2 else -1))
            elif pattern == 'ping':
                # Short high ping
                envelope = max(0, 1 - t/duration * 3)
                value = int(32767 * 0.2 * envelope * 
                           (1 if i % int(sample_rate/freq) < int(sample_rate/freq)/2 else -1))
            elif pattern == 'complete':
                # Three ascending tones
                segment = int(t / (duration / 3))
                f = freq * (1 + segment * 0.5)
                value = int(32767 * 0.25 * (1 - t/duration) * 
                           (1 if i % int(sample_rate/f) < int(sample_rate/f)/2 else -1))
            else:
                value = 0
            
            # Stereo
            wav.writeframes(struct.pack('<hh', value, value))
    
    return filepath

def init_sounds():
    """Generate default sound files"""
    print("🔊 Generating sounds...")
    generate_sound('success.wav', 880, 0.4, 'success')
    generate_sound('error.wav', 440, 0.5, 'error')
    generate_sound('ping.wav', 1200, 0.15, 'ping')
    generate_sound('complete.wav', 660, 0.6, 'complete')
    print("✅ Sounds ready")

def play_sound_file(filepath):
    """Play a sound file using available backend"""
    if not AUDIO_BACKEND:
        print(f"🔇 Would play: {filepath}")
        return
    
    try:
        if AUDIO_BACKEND == 'pygame':
            import pygame
            sound = pygame.mixer.Sound(filepath)
            sound.play()
        elif AUDIO_BACKEND == 'playsound':
            from playsound import playsound
            playsound(filepath, block=False)
        elif AUDIO_BACKEND == 'winsound':
            import winsound
            winsound.PlaySound(filepath, winsound.SND_FILENAME | winsound.SND_ASYNC)
        elif AUDIO_BACKEND == 'afplay':
            subprocess.Popen(['afplay', filepath])
        elif AUDIO_BACKEND in ['aplay', 'paplay', 'ogg123']:
            subprocess.Popen([AUDIO_BACKEND, filepath], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"🔇 Audio error: {e}")

def play_sound(sound_name='success'):
    """Play a named sound"""
    filepath = os.path.join(SOUNDS_DIR, f'{sound_name}.wav')
    if os.path.exists(filepath):
        play_sound_file(filepath)
    else:
        print(f"⚠️ Sound not found: {sound_name}")
        # Fallback to system beep
        if sys.platform == 'win32':
            import winsound
            winsound.MessageBeep()
        else:
            print('\a')  # Terminal bell

# Flask routes
@app.route('/')
def index():
    """Status page"""
    return jsonify({
        'status': 'running',
        'audio_backend': AUDIO_BACKEND or 'none',
        'sounds': ['success', 'error', 'ping', 'complete'],
        'port': PORT,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/status')
def status():
    """Get server status"""
    return jsonify({
        'status': 'running',
        'audio_backend': AUDIO_BACKEND or 'none',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/notify', methods=['POST'])
def notify():
    """Trigger a notification sound"""
    data = request.get_json() or {}
    message = data.get('message', 'Notification')
    sound_name = data.get('sound', 'success')
    
    print(f"🔔 [{datetime.now().strftime('%H:%M:%S')}] {message}")
    
    # Play sound in background thread
    thread = threading.Thread(target=play_sound, args=(sound_name,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'ok': True,
        'message': message,
        'sound': sound_name,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/test/<sound_name>')
def test_sound(sound_name):
    """Test a specific sound"""
    play_sound(sound_name)
    return jsonify({'ok': True, 'sound': sound_name})

@app.route('/shutdown', methods=['POST'])
def shutdown():
    """Shutdown the server"""
    func = request.environ.get('werkzeug.server.shutdown')
    if func:
        func()
    return jsonify({'ok': True, 'message': 'Shutting down...'})

def main():
    """Main entry point"""
    print("=" * 50)
    print("🤖 Tars Notify Server")
    print("=" * 50)
    print(f"Desktop notifications for Clawdbot")
    print(f"Server: http://localhost:{PORT}")
    print("-" * 50)
    
    init_audio()
    init_sounds()
    
    print("-" * 50)
    print("Ready! Trigger with:")
    print(f'  curl -X POST http://localhost:{PORT}/notify -H "Content-Type: application/json" -d \'{"message": "Done!", "sound": "success"}\'')
    print("-" * 50)
    
    # Open browser to status page
    try:
        import webbrowser
        webbrowser.open(f'http://localhost:{PORT}')
    except:
        pass
    
    # Run server
    app.run(host='0.0.0.0', port=PORT, debug=False)

if __name__ == '__main__':
    main()
