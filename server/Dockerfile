FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DATA_DIR=/data \
    NODE_NO_WARNINGS=1

COPY package.json ./
COPY src ./src

# Take the latest security fixes for the base system on every build.
RUN apk upgrade --no-cache && mkdir -p /data && chown node:node /data && chmod 700 /data
USER node
VOLUME /data
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "src/index.ts"]
