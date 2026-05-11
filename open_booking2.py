#!/usr/bin/env python3
"""Open booking detail screenshot with proper navigation."""
import asyncio
import json
import subprocess
import websockets

VM_URL = "ws://127.0.0.1:50095/F_wwkQQE11A=/ws"
DEVICE = "0B6EB7D9-55BD-4AAC-92FF-A96C15D36271"
SCREENSHOT_DIR = "/Users/pierceshaptonproperplace/Proper-Place-V2/tmp_screens"

def screenshot(name):
    path = f"{SCREENSHOT_DIR}/{name}.png"
    subprocess.run(["xcrun", "simctl", "io", DEVICE, "screenshot", path], check=True, capture_output=True)
    print(f"Screenshot: {path}")
    return path

async def main():
    async with websockets.connect(VM_URL) as ws:
        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getVM", "params": {}}))
        vm = json.loads(await ws.recv())
        isolate_id = vm["result"]["isolates"][0]["id"]

        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 2, "method": "getIsolate", "params": {"isolateId": isolate_id}}))
        isolate = json.loads(await ws.recv())
        lib_id = next(lib["id"] for lib in isolate["result"]["libraries"] if lib.get("uri","").endswith("main.dart"))
        print(f"Connected. Lib: {lib_id}")

        async def evaluate(expr, wait=0.5):
            req = {"jsonrpc": "2.0", "id": 99, "method": "evaluate",
                   "params": {"isolateId": isolate_id, "targetId": lib_id, "expression": expr}}
            await ws.send(json.dumps(req))
            resp = json.loads(await ws.recv())
            kind = resp.get("result", {}).get("kind", "")
            if "error" in resp:
                print(f"  ERROR evaluating '{expr}': {resp['error'].get('message', '')[:100]}")
            else:
                print(f"  OK: {expr} -> {kind}")
            await asyncio.sleep(wait)
            return resp

        # Step 1: Go to Bookings tab
        print("\n1. Switching to Bookings tab...")
        await evaluate("goToTab(1)", wait=2.0)
        screenshot("iphone-bookings-list")

        # Step 2: Open booking ID 25
        print("\n2. Opening booking ID 25...")
        await evaluate("openBooking(25)", wait=5.0)
        screenshot("iphone-booking-detail")

asyncio.run(main())
