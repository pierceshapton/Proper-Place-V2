#!/usr/bin/env python3
"""Navigate Flutter app via Dart VM Service and take screenshots."""
import asyncio
import json
import subprocess
import sys
import time
import websockets

VM_URL = "ws://127.0.0.1:50095/F_wwkQQE11A=/ws"
DEVICE = "0B6EB7D9-55BD-4AAC-92FF-A96C15D36271"
SCREENSHOT_DIR = "/Users/pierceshaptonproperplace/Proper-Place-V2/tmp_screens"

def screenshot(name):
    path = f"{SCREENSHOT_DIR}/{name}.png"
    subprocess.run(
        ["xcrun", "simctl", "io", DEVICE, "screenshot", path],
        check=True, capture_output=True
    )
    print(f"Screenshot saved: {path}")
    return path

async def get_main_lib_id(ws, isolate_id):
    """Get the library ID for main.dart."""
    req = {"jsonrpc": "2.0", "id": 10, "method": "getIsolate", "params": {"isolateId": isolate_id}}
    await ws.send(json.dumps(req))
    resp = json.loads(await ws.recv())
    libs = resp.get("result", {}).get("libraries", [])
    for lib in libs:
        if lib.get("uri", "").endswith("main.dart"):
            return lib["id"]
    return None

async def evaluate_expr(ws, isolate_id, lib_id, expression):
    """Evaluate a Dart expression in the main library context."""
    req = {
        "jsonrpc": "2.0", "id": 20,
        "method": "evaluate",
        "params": {
            "isolateId": isolate_id,
            "targetId": lib_id,
            "expression": expression
        }
    }
    await ws.send(json.dumps(req))
    resp = json.loads(await ws.recv())
    if "error" in resp:
        print(f"Error evaluating '{expression}': {resp['error']}", file=sys.stderr)
    return resp

async def main():
    async with websockets.connect(VM_URL) as ws:
        # Get VM info
        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getVM", "params": {}}))
        vm = json.loads(await ws.recv())
        isolate_id = vm["result"]["isolates"][0]["id"]
        print(f"Connected. Isolate: {isolate_id}")

        lib_id = await get_main_lib_id(ws, isolate_id)
        print(f"Main library ID: {lib_id}")

        if lib_id is None:
            print("Could not find main.dart library!", file=sys.stderr)
            return

        # Step 1: Screenshot map screen (already on it)
        await asyncio.sleep(1)
        screenshot("iphone-map")
        print("Step 1: Map screenshot taken")

        # Step 2: Navigate to Bookings tab
        print("Switching to Bookings tab...")
        await evaluate_expr(ws, isolate_id, lib_id, "goToTab(1)")
        await asyncio.sleep(2)
        screenshot("iphone-bookings")
        print("Step 2: Bookings screenshot taken")

        # Step 3: Try to open a booking (ID 1 - adjust if needed)
        print("Opening booking ID 1...")
        resp = await evaluate_expr(ws, isolate_id, lib_id, "openBooking(1)")
        print(f"openBooking response: {resp}")
        await asyncio.sleep(3)
        screenshot("iphone-booking-detail")
        print("Step 3: Booking detail screenshot taken")

        # Step 4: Go back to map
        print("Going back...")
        await evaluate_expr(ws, isolate_id, lib_id, "goBack()")
        await asyncio.sleep(1)
        await evaluate_expr(ws, isolate_id, lib_id, "goToTab(0)")
        await asyncio.sleep(2)
        screenshot("iphone-map-2")

asyncio.run(main())
