# Use Python 3.11 with Node.js
FROM python:3.11-slim

# Install system dependencies for PyMuPDF and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY server/requirements.txt server/requirements.txt
COPY web/package*.json web/

# Install Python dependencies
RUN cd server && pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
RUN cd web && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd web && npm run build -- --mode production

# Create static directory and copy frontend build
RUN mkdir -p server/static && cp -r web/dist/* server/static/

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV PYTHONPATH=/app/server

# Start the application
WORKDIR /app/server
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
