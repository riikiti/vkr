FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared modules (core, analytics, data_generation, config)
COPY config.py ./config.py
COPY core/ ./core/
COPY analytics/ ./analytics/
COPY data_generation/ ./data_generation/

# Copy backend code
COPY backend/ ./backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
