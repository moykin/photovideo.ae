FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package.json ./
# ВАЖНО: НЕ копируем package-lock.json — он сгенерён на macOS, и с ним npm пропускает
# Linux-бинарник @swc/core-linux-x64-gnu ("Failed to load native binding" при strapi build).
# Без lock npm резолвит зависимости свежо под Linux и ставит нужный бинарник (проверено).
RUN npm install --include=optional
COPY . .
EXPOSE 1337
ENV NODE_ENV=production
CMD ["/bin/sh", "-c", "npm run build && npm run start"]
