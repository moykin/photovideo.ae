FROM python:3.12-slim

# Deno — JS-движок. ОБЯЗАТЕЛЕН: yt-dlp решает им YouTube JS-challenge.
# Без него: "n challenge solving failed" -> "No video formats found".
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

# ffmpeg нужен yt-dlp для склейки видео+аудио
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates fonts-dejavu-core \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
# yt-dlp ставим через pip — так автоматически подхватывается плагин PO-token.
# bgutil-ytdlp-pot-provider (плагин-клиент): yt-dlp сам берёт PO-token у сервиса bgutil-provider.
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -U "yt-dlp>=2025.05.22" bgutil-ytdlp-pot-provider

COPY app/ .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
