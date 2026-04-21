#!/usr/bin/env python3
"""
Screenshot capture script for Proper Place app store
Navigates through key screens and captures screenshots
"""

import asyncio
import json
import websockets
import subprocess
import time
import sys
import os

# Configuration
ISO = 'isolates/574772414487215'  # Will need to discover this
LIB = 'libraries/@50503505'        # Will need to discover this
SCREENSHOT_SCRIPT = '/Users/pierceshaptonproperplace/Proper-Place-V2/proper_place/take_screenshots.sh'
OUTPUT_DIR = os.path.expanduser('~/Desktop/AppStoreScreenshots')

# Discover Dart VM service details
def get_vm_service_uri():
    """Extract VM service URI from flutter run output"""
    try:
        result = subprocess.run(
            ['lsof', '-i', ':59837'],
            capture_output=True,
            text=True,
            timeout=5
        )
        # VM service is running on this port
        return 'ws://127.0.0.1:59837'
    except:
        return None

def take_screenshot(name):
    """Take a screenshot using the shell script"""
    print(f"  Capturing: {name}")
    try:
        result = subprocess.run(
            [SCREENSHOT_SCRIPT, name],
            capture_output=True,
            timeout=10
        )
        if result.returncode == 0:
            print(f"    ✓ {name} captured")
            return True
    except Exception as e:
        print(f"    ✗ Failed to capture {name}: {e}")
    return False

def main():
    """Main screenshot capture flow"""
    print("=" * 60)
    print("Proper Place App Store Screenshot Capture")
    print("=" * 60)
    
    # Create output directory
    os.makedirs(f"{OUTPUT_DIR}/6.7-inch", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/6.5-inch", exist_ok=True)
    
    screenshots = [
        ('01_home', 'Home/Browse screen showing available places'),
        ('02_map', 'Map view with location-based discovery'),
        ('03_place_detail', 'Place detail page with info and reviews'),
        ('04_booking', 'Booking confirmation screen'),
        ('05_profile', 'User profile screen'),
    ]
    
    print("\nTo capture screenshots, navigate through the app manually:")
    print("  1. Press TAB in simulator to focus next element")
    print("  2. Or tap on different tabs at the bottom")
    print("  3. Then run this script or use take_screenshots.sh directly")
    print("\nScreenshots to capture:")
    
    captured = 0
    for i, (name, desc) in enumerate(screenshots, 1):
        print(f"\n{i}. {name}: {desc}")
        print(f"   Run: ./take_screenshots.sh {name}")
        print(f"   Then navigate in simulator to the next screen")
    
    print("\n" + "=" * 60)
    print("Files will be saved to:")
    print(f"  {OUTPUT_DIR}/6.7-inch/")
    print(f"  {OUTPUT_DIR}/6.5-inch/")
    print("=" * 60)

if __name__ == '__main__':
    main()
