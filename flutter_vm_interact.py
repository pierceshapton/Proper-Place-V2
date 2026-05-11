#!/usr/bin/env python3
"""Interact with Flutter app via Dart VM Service WebSocket."""
import asyncio
import json
import sys
import websockets

VM_URL = "ws://127.0.0.1:50095/F_wwkQQE11A=/ws"

async def call_vm(method, params=None):
    async with websockets.connect(VM_URL) as ws:
        # Get VM info
        req = {"jsonrpc": "2.0", "id": 1, "method": "getVM", "params": {}}
        await ws.send(json.dumps(req))
        resp = json.loads(await ws.recv())
        
        isolates = resp.get("result", {}).get("isolates", [])
        if not isolates:
            print("No isolates found")
            return
        
        isolate_id = isolates[0]["id"]
        print(f"Isolate: {isolate_id}")
        
        if method == "evaluate":
            expr = params.get("expression", "")
            req2 = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "evaluate",
                "params": {
                    "isolateId": isolate_id,
                    "targetId": "libraries/dart:core",
                    "expression": expr
                }
            }
            await ws.send(json.dumps(req2))
            resp2 = json.loads(await ws.recv())
            print(json.dumps(resp2, indent=2))
            return resp2

async def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "info"
    
    async with websockets.connect(VM_URL) as ws:
        # Get isolates
        req = {"jsonrpc": "2.0", "id": 1, "method": "getVM", "params": {}}
        await ws.send(json.dumps(req))
        resp = json.loads(await ws.recv())
        
        isolates = resp.get("result", {}).get("isolates", [])
        if not isolates:
            print("No isolates found")
            return
        
        isolate_id = isolates[0]["id"]
        print(f"Isolate: {isolate_id}", file=sys.stderr)
        
        if action == "tab":
            tab = sys.argv[2] if len(sys.argv) > 2 else "0"
            expr = f"navigatorKey.currentState?.pushNamedAndRemoveUntil('/home', (r) => false)"
            # Use goToTab function
            req2 = {
                "jsonrpc": "2.0", "id": 2,
                "method": "evaluate",
                "params": {
                    "isolateId": isolate_id,
                    "targetId": isolates[0]["id"],
                    "expression": f"goToTab({tab})"
                }
            }
            await ws.send(json.dumps(req2))
            resp2 = json.loads(await ws.recv())
            print(json.dumps(resp2, indent=2))
        elif action == "info":
            print(json.dumps(resp, indent=2))

asyncio.run(main())
