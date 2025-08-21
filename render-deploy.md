# Deployment Guide for Render

## Quick Setup for Render

### 1. Gunicorn Configuration

Your app is ready for production deployment with gunicorn. The correct command is:

```
gunicorn app:app
```

- `app` (left side) = your Python file name (`app.py`)
- `app` (right side) = your Flask instance variable name

### 2. Render Service Settings

When creating your service on Render:

**Build Command:**

```
pip install -r requirements.txt
```

**Start Command:**

```
gunicorn app:app
```

**Environment Variables (Required):**

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BROWSERBASE_API_KEY=your_browserbase_api_key_here
BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here
```

**Optional Environment Variables:**

```
OUTLOOK_EMAIL=your_outlook_email@domain.com
OUTLOOK_PASSWORD=your_app_password_here
OUTLOOK_CLIENT_ID=your_client_id_here
OUTLOOK_CLIENT_SECRET=your_client_secret_here
OUTLOOK_TENANT_ID=your_tenant_id_here
```

### 3. Important Notes

- **Port Configuration**: Render automatically sets the `$PORT` environment variable. Gunicorn will bind to it automatically - no code changes needed.

- **File Storage**: Render's file system is ephemeral. The `temp_outputs/` directory and generated files will be deleted between deployments. Consider using external storage (AWS S3, etc.) for persistent files in production.

- **Memory**: PowerPoint generation can be memory-intensive. Consider using Render's higher-tier plans for better performance.

- **Timeouts**: Web scraping can take time. Render's free tier has request timeouts. Consider upgrading for longer-running processes.

### 4. Testing Locally with Gunicorn

Before deploying, test locally:

```bash
pip install -r requirements.txt
gunicorn app:app
```

Your app will be available at `http://localhost:8000`

### 5. Alternative: Docker Deployment

If you prefer Docker, create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:$PORT"]
```
