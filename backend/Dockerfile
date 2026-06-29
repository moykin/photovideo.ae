FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# npm ci из lock + ЯВНО ставим Linux-бинарник @swc (его npm пропускает, т.к. lock
# сгенерён на macOS -> "Failed to load native binding" при strapi build).
RUN npm ci \
    && npm install --no-save "@swc/core-linux-x64-gnu@$(node -p "require('@swc/core/package.json').version")"
COPY . .
EXPOSE 1337
ENV NODE_ENV=production
CMD ["/bin/sh", "-c", "npm run build && npm run start"]
