#!/usr/bin/env python3
"""
Tars Notify - Simple wrapper to start/stop the notification server
"""

import os
import sys
import time
import subprocess
import argparse
import requests

def is_server_running():
    """Check if server is already running"""
    try:
        response = requests.get('http://localhost:8765/status', timeout=2)
        return response.status_code == 200
    except:
        return False

def start_server():
    """Start the notification server"""
    if is_server_running():
        print("✅ Tars Notify is already running!")
        print("   http://localhost:8765")
        return
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    server_path = os.path.join(script_dir, 'notify_server.py')
    
    # Start in background
    if sys.platform == 'win32':
        subprocess.Popen(
            [sys.executable, server_path],
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        subprocess.Popen(
            [sys.executable, server_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
    
    # Wait for it to start
    print("🚀 Starting Tars Notify...")
    for i in range(10):
        time.sleep(0.5)
        if is_server_running():
            print("✅ Server running at http://localhost:8765")
            # Test notification
            notify("Tars Notify is ready!", "ping")
            return
    
    print("⚠️ Server may not have started properly. Check for errors.")

def stop_server():
    """Stop the notification server"""
    if not is_server_running():
        print("ℹ️ Server not running")
        return
    
    try:
        requests.post('http://localhost:8765/shutdown', timeout=2)
        print("🛑 Server stopped")
    except Exception as e:
        print(f"⚠️ Error stopping server: {e}")

def notify(message="Task complete!", sound="success"):
    """Send a notification"""
    try:
        response = requests.post(
            'http://localhost:8765/notify',
            json={'message': message, 'sound': sound},
            timeout=5
        )
        if response.status_code == 200:
            print(f"🔔 Notified: {message}")
        else:
            print(f"⚠️ Notification failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("⚠️ Server not running. Start with: python tars_notify.py start")
    except Exception as e:
        print(f"⚠️ Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Tars Notify - Desktop notifications')
    parser.add_argument('action', choices=['start', 'stop', 'status', 'notify', 'test'], 
                       help='Action to perform')
    parser.add_argument('--message', '-m', default='Task complete!', 
                       help='Notification message')
    parser.add_argument('--sound', '-s', default='success', 
                       choices=['success', 'error', 'ping', 'complete'],
                       help='Sound to play')
    
    args = parser.parse_args()
    
    if args.action == 'start':
        start_server()
    elif args.action == 'stop':
        stop_server()
    elif args.action == 'status':
        if is_server_running():
            print("✅ Tars Notify is running")
            print("   http://localhost:8765")
        else:
            print("ℹ️ Tars Notify is not running")
            print("   Start with: python tars_notify.py start")
    elif args.action == 'notify':
        notify(args.message, args.sound)
    elif args.action == 'test':
        for sound in ['ping', 'success', 'complete', 'error']:
            print(f"Testing: {sound}")
            notify(f"Test: {sound}", sound)
            time.sleep(1)

if __name__ == '__main__':
    main()
