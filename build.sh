#!/usr/bin/env bash
# Build the Homematic IP HCU Fake Switches Plugin as an ARM64 tar.gz image.

set -euo pipefail

VERSION="${VERSION:-1.1.1}"
IMAGE_TAG="hmip-plugin-fake-switches:${VERSION}"
OUTPUT_FILE="hmip-plugin-fake-switches-${VERSION}.tar.gz"

echo "==> Building ARM64 image: ${IMAGE_TAG}"
docker buildx build --platform linux/arm64 --load -t "${IMAGE_TAG}" .

echo "==> Exporting to ${OUTPUT_FILE}"
docker save "${IMAGE_TAG}" | gzip > "${OUTPUT_FILE}"

echo ""
echo "Done. Upload this file in the HCU web UI (Developer Mode enabled):"
echo "  $(pwd)/${OUTPUT_FILE}"

