#!/usr/bin/env python3
"""Get token via VM service and find valid booking IDs."""
import asyncio
import json
import subprocess
import websockets
import ssl
import urllib.request
import urllib.parse

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

        async def evaluate(expr, wait=0.5):
            req = {"jsonrpc": "2.0", "id": 99, "method": "evaluate",
                   "params": {"isolateId": isolate_id, "targetId": lib_id, "expression": expr}}
            await ws.send(json.dumps(req))
            resp = json.loads(await ws.recv())
            if "error" in resp:
                print(f"  ERROR: {resp['error'].get('message', '')[:300]}")
            else:
                result = resp.get("result", {})
                print(f"  kind={result.get('kind')}, value={result.get('valueAsString', '')[:200]}")
            await asyncio.sleep(wait)
            return resp

        # Print token to console - we'll read it from flutter logs
        print("Triggering token print to console...")
        await evaluate("StorageService.getToken().then((t) => print('TOKEN:' + (t ?? 'null')))", wait=2.0)

asyncio.run(main())
