FROM python:3.12-slim

# ffmpeg нужен yt-dlp для склейки видео+аудио
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg wget ca-certificates \
    && wget -q -O /usr/local/bin/yt-dlp \
       https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
