# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies + Playwright Chromium deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    # Playwright browser dependencies
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libxshmfence1 libx11-xcb1 libxcb1 libxfixes3 \
    libxext6 libx11-6 libxcb-shm0 libxcb-dri3-0 \
    # Fonts
    fonts-freefont-ttf fonts-noto-color-emoji fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium browser (without --with-deps since we installed deps above)
RUN playwright install chromium

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
