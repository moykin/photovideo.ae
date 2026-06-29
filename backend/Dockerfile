FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# npm ci — детерминированная установка из lock (фиксирует рабочую версию @swc/core
# и платформенный бинарник). npm install подтягивал новый @swc -> "Failed to load native binding".
RUN npm ci
COPY . .
EXPOSE 1337
ENV NODE_ENV=production
CMD ["/bin/sh", "-c", "npm run build && npm run start"]
