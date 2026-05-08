FROM node:20 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --include=optional
COPY . .
RUN npm run build

FROM node:20 AS production
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libssl-dev && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --only=production --include=optional
COPY --from=build /app/build ./build
COPY --from=build /app/config ./config
COPY --from=build /app/src ./src
COPY --from=build /app/public ./public
EXPOSE 1337
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
