#!/usr/bin/env python3
"""
Tars Notify Client - Simple Python client for notifications
Usage in Clawdbot: from notify_client import tars_ping
"""

import requests
from typing import Optional

SERVER_URL = "http://localhost:8765"

def notify(message: str = "Task complete!", sound: str = "success") -> bool:
    """
    Send a notification to Tars Notify server.
    
    Args:
        message: The notification message to display
        sound: Sound to play - 'success', 'error', 'ping', 'complete'
    
    Returns:
        True if notification was sent successfully
    
    Example:
        >>> from notify_client import notify
        >>> notify("GitHub repo created!", "success")
    """
    try:
        response = requests.post(
            f"{SERVER_URL}/notify",
            json={"message": message, "sound": sound},
            timeout=5
        )
        return response.status_code == 200
    except Exception:
        return False

def tars_ping(message: str = "Done!") -> bool:
    """Quick ping notification"""
    return notify(message, "ping")

def tars_success(message: str = "Success!") -> bool:
    """Success notification"""
    return notify(message, "success")

def tars_error(message: str = "Error!") -> bool:
    """Error notification"""
    return notify(message, "error")

def tars_complete(message: str = "Complete!") -> bool:
    """Long task complete notification"""
    return notify(message, "complete")

def is_running() -> bool:
    """Check if notification server is running"""
    try:
        response = requests.get(f"{SERVER_URL}/status", timeout=2)
        return response.status_code == 200
    except:
        return False

# Shell command version for use with exec
def notify_shell(message: str, sound: str = "success") -> str:
    """Returns a shell command string"""
    import json
    payload = json.dumps({"message": message, "sound": sound})
    return f'curl -s -X POST {SERVER_URL}/notify -H "Content-Type: application/json" -d \'{payload}\''

if __name__ == "__main__":
    # Test
    print("Testing Tars Notify Client...")
    if is_running():
        print("✅ Server is running")
        notify("Client test successful!", "ping")
    else:
        print("⚠️ Server not running. Start with: python tars_notify.py start")
