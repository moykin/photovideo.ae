FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --include=optional
COPY . .
EXPOSE 1337
ENV NODE_ENV=production
CMD ["/bin/sh", "-c", "npm run build && npm run start"]
