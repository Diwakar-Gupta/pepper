import requests
import time
from config import MAX_RETRY_ATTEMPTS, RETRY_DELAY_BASE, WAKEUP_TIMEOUT


def wake_up_render_app(url, timeout=WAKEUP_TIMEOUT):
    """Wake up a suspended Render webapp by making an HTTP request"""
    try:
        print(f"Attempting to wake up Render app at {url}...")
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print("✓ Render app is awake and responding")
            return True
        else:
            print(f"⚠ Render app responded with status {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"⚠ Timeout waiting for Render app to wake up ({timeout}s)")
        return False
    except requests.exceptions.ConnectionError:
        print("⚠ Connection error - Render app may still be starting up")
        return False
    except Exception as e:
        print(f"⚠ Error waking up Render app: {e}")
        return False


def connect_with_retry(sio, url, max_attempts=MAX_RETRY_ATTEMPTS):
    """Connect to signaling server with retry logic for suspended Render apps"""
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"\n--- Connection Attempt {attempt}/{max_attempts} ---")
            
            # First, try to wake up the Render app
            if attempt > 1:  # Skip wake-up on first attempt
                print("Render app may be suspended, attempting to wake it up...")
                wake_up_render_app(url)
                # Give the app some time to fully start up
                time.sleep(3)
            
            print(f"Connecting to signaling server: {url}")
            sio.connect(url, transports=["websocket"])
            print("✓ Successfully connected to signaling server!")
            return True
            
        except Exception as e:
            error_msg = str(e).lower()
            print(f"✗ Connection attempt {attempt} failed: {e}")
            
            if attempt < max_attempts:
                # Calculate exponential backoff delay
                delay = RETRY_DELAY_BASE ** attempt
                print(f"Waiting {delay} seconds before retry...")
                time.sleep(delay)
            else:
                print(f"\n❌ All {max_attempts} connection attempts failed.")
                print("\nPossible solutions:")
                print("1. Check if the Render app URL is correct")
                print("2. Verify the Render app is deployed and running")
                print("3. Wait a few minutes and try again (Render apps can take time to start)")
                print("4. Check Render dashboard for any deployment issues")
                return False
    
    return False
