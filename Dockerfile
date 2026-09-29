FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY public ./public
COPY src ./src
COPY shared ./shared
COPY lambda/design.mjs ./lambda/design.mjs
COPY lambda/prompt.mjs ./lambda/prompt.mjs
COPY scripts ./scripts
RUN npm run build

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY lambda ./lambda
COPY shared ./shared
COPY --from=build /app/dist ./lambda/dist
COPY src/site-copy.json ./lambda/site-copy.json
COPY server.mjs ./server.mjs
USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.status===204?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
