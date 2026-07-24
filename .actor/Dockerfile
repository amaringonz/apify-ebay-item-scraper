FROM apify/actor-node-playwright-chrome:20 AS builder

USER root
COPY package*.json ./
RUN npm install --include=dev --audit=false

COPY . ./
RUN npm run build

RUN npm prune --omit=dev --audit=false

FROM apify/actor-node-playwright-chrome:20

USER root
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

COPY . ./
USER myuser

CMD ["node", "dist/main.js"]
