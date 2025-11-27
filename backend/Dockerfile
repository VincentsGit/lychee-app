FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use flask run with hot reload
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]