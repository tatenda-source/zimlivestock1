FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY app.py db.py middleware.py seed.py ./
COPY routes/ routes/
COPY services/ services/

EXPOSE 8000

# Run with gunicorn in production
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
