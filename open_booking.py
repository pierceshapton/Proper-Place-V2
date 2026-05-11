#!/usr/bin/env python3
"""Open specific booking detail and take screenshot."""
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

async def main():
    async with websockets.connect(VM_URL) as ws:
        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getVM", "params": {}}))
        vm = json.loads(await ws.recv())
        isolate_id = vm["result"]["isolates"][0]["id"]

        # Find main.dart library
        await ws.send(json.dumps({"jsonrpc": "2.0", "id": 2, "method": "getIsolate", "params": {"isolateId": isolate_id}}))
        isolate = json.loads(await ws.recv())
        lib_id = None
        for lib in isolate.get("result", {}).get("libraries", []):
            if lib.get("uri", "").endswith("main.dart"):
                lib_id = lib["id"]
                break
        print(f"Connected. Lib: {lib_id}")

        async def evaluate(expr):
            req = {"jsonrpc": "2.0", "id": 99, "method": "evaluate",
                   "params": {"isolateId": isolate_id, "targetId": lib_id, "expression": expr}}
            await ws.send(json.dumps(req))
            resp = json.loads(await ws.recv())
            if "error" in resp:
                print(f"  ERROR: {resp['error'].get('message', resp['error'])}")
            return resp

        # Open booking #25
        print("Opening booking #25...")
        await evaluate("openBooking(25)")
        await asyncio.sleep(4)
        screenshot("iphone-booking-detail")

asyncio.run(main())
