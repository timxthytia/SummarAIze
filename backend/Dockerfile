FROM python:3.11-slim-bookworm

# Prevents prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    TESSERACT_CMD=/usr/bin/tesseract \
    LANG=C.UTF-8

# Install Tesseract + build tools + minimal deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      tesseract-ocr \
      ca-certificates \
      build-essential gcc g++ make \
      python3-dev pkg-config \
 && rm -rf /var/lib/apt/lists/* \
 && tesseract --version

WORKDIR /app

# Copy only requirements first for better Docker layer caching
COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy rest of the app
COPY . /app

# Make sure pytesseract finds the binary without code changes
ENV PYTESSERACT_TESSERACT_CMD=${TESSERACT_CMD}

RUN useradd -m appuser
USER appuser

EXPOSE 8080

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}