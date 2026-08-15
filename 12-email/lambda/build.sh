#!/usr/bin/env bash
# Package the notification processor into notification_processor.zip, the
# artifact infra/lambda.tf deploys. The handler imports only the standard
# library and boto3, and boto3 ships with the Lambda Python runtime, so there
# is nothing to pip install and nothing to vendor: the zip is just handler.py.
set -euo pipefail
cd "$(dirname "$0")"

rm -f notification_processor.zip
# `zip -j` junks the path so handler.py lands at the zip root, where the
# handler = "handler.lambda_handler" entrypoint expects it.
zip -qj notification_processor.zip notification_processor/handler.py

echo "built lambda/notification_processor.zip ($(du -h notification_processor.zip | cut -f1))"
