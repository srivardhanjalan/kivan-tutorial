#!/usr/bin/env bash
# Package the notification processor into notification_processor.zip, the
# artifact infra/lambda.tf deploys. boto3 ships with the Lambda Python runtime,
# so it is never vendored; the handler's one extra dependency (requests, for the
# Mailgun call) is pure python, so it's pip-installed into the build dir and
# zipped alongside handler.py.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

# Vendor the runtime deps (requests) into the build dir, then drop handler.py in
# beside them so it sits at the zip root where handler = "handler.lambda_handler"
# expects it.
pip3 install --quiet --target "$BUILD_DIR" -r notification_processor/requirements.txt
cp notification_processor/handler.py "$BUILD_DIR/"

rm -f notification_processor.zip
(cd "$BUILD_DIR" && zip -qr "$ROOT/notification_processor.zip" .)

echo "built lambda/notification_processor.zip ($(du -h notification_processor.zip | cut -f1))"
