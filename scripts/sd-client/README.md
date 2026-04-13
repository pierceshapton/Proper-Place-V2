# sd-client

Small Node client to call a local Automatic1111 Stable Diffusion web UI (API) and save generated images.

Prerequisites
- Automatic1111 web UI running locally (default: http://127.0.0.1:7860). Use the `scripts/run_automatic1111.sh` helper in the repo.
- Node 18+ and `npm` installed.

Install

```bash
cd scripts/sd-client
npm install
```

Generate an image

```bash
# prompt -> output.png
node generate.js "A vintage van parked in a London street, cinematic lighting" output.png
```

Environment variables
- `SD_API_URL` — change the API endpoint if your web UI is on a different host/port.

Notes for Apple Silicon (M1/M2)
- If you run Automatic1111 via the provided Docker helper you may want to add `--device` flags or use the `--api` and MPS-enabled image variants; the current Node client only assumes the web UI is reachable at `SD_API_URL`.
