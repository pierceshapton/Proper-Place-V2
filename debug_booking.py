#!/usr/bin/env python3
"""Debug booking API calls via Dart VM service."""
import asyncio
import json
import websockets

VM_URL = "ws://127.0.0.1:50095/F_wwkQQE11A=/ws"

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
                print(f"  ERROR: {resp['error'].get('message', '')[:200]}")
            else:
                result = resp.get("result", {})
                kind = result.get("kind", "")
                val = result.get("valueAsString", "")
                print(f"  OK: {kind} = {val}")
            await asyncio.sleep(wait)
            return resp

        # Try to get token and then manually call the bookings API
        print("Getting token...")
        # Get the token from StorageService using an expression
        token_resp = await evaluate('StorageService.getToken()', wait=2.0)
        
        # Use http to directly call the API and inspect the response 
        print("\nTrying to fetch booking with different IDs (checking status)...")
        # We'll try to evaluate a simple http.get to see what comes back
        for bid in [25, 26, 27, 28, 29, 30]:
            # Try to call openBooking - we'll rely on visual feedback
            expr = f"openBooking({bid})"
            print(f"Trying booking ID {bid}...")
            await evaluate(expr, wait=3.0)

asyncio.run(main())
