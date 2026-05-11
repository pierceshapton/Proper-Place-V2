#!/usr/bin/env python3
"""Get auth token and test booking API."""
import asyncio
import json
import subprocess
import websockets
import urllib.request

VM_URL = "ws://127.0.0.1:50095/F_wwkQQE11A=/ws"
DEVICE = "0B6EB7D9-55BD-4AAC-92FF-A96C15D36271"
SCREENSHOT_DIR = "/Users/pierceshaptonproperplace/Proper-Place-V2/tmp_screens"
BACKEND = "https://octopus-app-lxh2t.ondigitalocean.app"

def screenshot(name):
    path = f"{SCREENSHOT_DIR}/{name}.png"
    subprocess.run(["xcrun", "simctl", "io", DEVICE, "screenshot", path], check=True, capture_output=True)
    print(f"  Screenshot: {path}")
    return path

async def main():
    async with websockets.connect(VM_URL) as ws:
        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getVM", "params": {}}))
        vm = json.loads(await ws.recv())
        isolate_id = vm["result"]["isolates"][0]["id"]

        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 2, "method": "getIsolate", "params": {"isolateId": isolate_id}}))
        isolate = json.loads(await ws.recv())
        lib_id = next(lib["id"] for lib in isolate["result"]["libraries"] if lib.get("uri","").endswith("main.dart"))
        storage_lib_id = next((lib["id"] for lib in isolate["result"]["libraries"] if "storage_service" in lib.get("uri","")), lib_id)

        async def evaluate(expr, target_id=None, wait=0.5):
            target = target_id or lib_id
            req = {"jsonrpc": "2.0", "id": 99, "method": "evaluate",
                   "params": {"isolateId": isolate_id, "targetId": target, "expression": expr}}
            await ws.send(json.dumps(req))
            resp = json.loads(await ws.recv())
            if "error" in resp:
                print(f"  ERROR: {resp['error'].get('message', '')[:200]}")
            else:
                result = resp.get("result", {})
                print(f"  Result kind: {result.get('kind')}, value: {result.get('valueAsString', '')[:100]}")
            await asyncio.sleep(wait)
            return resp

        # Get token via StorageService
        print("Getting token...")
        token_resp = await evaluate("StorageService.getToken()", wait=2.0)
        
        # Try evaluating a simpler expression to get stored data
        # Since getToken returns a Future, let's try to capture it differently
        print("\nTesting direct token lookup using SharedPreferences key...")
        token_resp2 = await evaluate("__token_holder__", wait=1.0)
        
        # Try to evaluate a simple test
        print("\nEvaluating simple test...")
        await evaluate("42.toString()", wait=0.5)
        
        # Let's try to open a booking detail using approach that avoids navigator key
        # First switch to bookings
        print("\n1. Switch to bookings tab...")
        await evaluate("goToTab(1)", wait=2.0)
        screenshot("iphone-bookings-list")
        
        # Try to open booking using navigator
        print("\n2. Try openBooking(25)...")
        await evaluate("openBooking(25)", wait=6.0)
        screenshot("iphone-booking-25-attempt")
        
        print("\n3. Try openBooking(26)...")
        await evaluate("openBooking(26)", wait=6.0)
        screenshot("iphone-booking-26-attempt")

asyncio.run(main())
