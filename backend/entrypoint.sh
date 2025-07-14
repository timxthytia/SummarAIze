#!/bin/bash
echo "=== Entrypoint: Tesseract location ==="
which tesseract
echo "=== Entrypoint: Tesseract version ==="
tesseract --version
echo "=== Entrypoint: Environment PATH ==="
echo $PATH
echo "=== Starting Uvicorn ==="
exec uvicorn main:app --host 0.0.0.0 --port 10000