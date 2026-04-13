#!/usr/bin/env bash
set -euo pipefail

# Helper to run Automatic1111 web UI in Docker on macOS M1/M2
# Creates local folders for models/outputs and starts the container with API enabled.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SD_DIR="$ROOT_DIR/sd-webui"
MODELS_DIR="$SD_DIR/models"
OUTPUTS_DIR="$SD_DIR/outputs"

mkdir -p "$MODELS_DIR" "$OUTPUTS_DIR"

CONTAINER_NAME="sd-webui"
IMAGE="ghcr.io/automatic1111/automatic1111:latest"

echo "Pulling Docker image: $IMAGE (platform linux/arm64)..."
docker pull --platform linux/arm64 "$IMAGE" || true

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing container $CONTAINER_NAME..."
  docker rm -f "$CONTAINER_NAME" || true
fi

echo "Starting Automatic1111 web UI (API enabled) on http://127.0.0.1:7860"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 7860:7860 \
  -v "$MODELS_DIR":/stable-diffusion-webui/models \
  -v "$OUTPUTS_DIR":/stable-diffusion-webui/outputs \
  --platform linux/arm64 \
  "$IMAGE" --api

echo "Container started. Logs: docker logs -f $CONTAINER_NAME"
