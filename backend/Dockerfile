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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements.txt and install Python dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]

EXPOSE 10000

# Command to start your backend app using uvicorn
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]