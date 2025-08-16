FROM python:3.11-slim

# Install Tesseract OCR and dependencies for pytesseract
RUN apt-get update && \
    apt-get install -y \
      build-essential \
      gcc \
      tesseract-ocr \
      libtesseract-dev \
      libleptonica-dev \
      pkg-config \
      libpng-dev \
      libjpeg-dev \
      libtiff-dev \
      zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements.txt and install Python dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Command to start your backend app using uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]