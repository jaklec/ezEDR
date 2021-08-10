# Build code
FROM node:16 AS build
WORKDIR /app
COPY ./package*.json ./tsconfig*.json ./
COPY ./ezedr-core ./ezedr-core/
COPY ./ezedr-server ./ezedr-server/
COPY ./ezedr-postgres ./ezedr-postgres/
RUN npm ci
RUN npm run build

# Fetch dependencies
FROM node:16 AS postgres
WORKDIR /app
COPY ./package-lock.json ./
COPY ./ezedr-runners/postgres/package.json ./
RUN npm ci --only=production

# Build final image
FROM node:16-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV LOG_LEVEL=info

COPY ./ezedr-runners/postgres/runner.js ./
COPY ./ezedr-runners/postgres/main.js ./
COPY --from=postgres /app/node_modules ./node_modules/
COPY --from=build /app/node_modules/@jaklec/ezedr-core/package.json ./node_modules/@jaklec/ezedr-core/
COPY --from=build /app/node_modules/@jaklec/ezedr-core/lib/ ./node_modules/@jaklec/ezedr-core/lib/
COPY --from=build /app/node_modules/@jaklec/ezedr-server/package.json ./node_modules/@jaklec/ezedr-server/
COPY --from=build /app/node_modules/@jaklec/ezedr-server/lib/ ./node_modules/@jaklec/ezedr-server/lib/
COPY --from=build /app/node_modules/@jaklec/ezedr-postgres/package.json ./node_modules/@jaklec/ezedr-postgres/
COPY --from=build /app/node_modules/@jaklec/ezedr-postgres/lib/ ./node_modules/@jaklec/ezedr-postgres/lib/

RUN find ./node_modules -name "*.ts" -delete

CMD ["node", "main.js"]
