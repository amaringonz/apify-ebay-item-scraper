FROM apify/actor-node-playwright-chrome:20 AS builder

USER root
COPY package*.json ./
RUN npm install --include=dev --audit=false

COPY . ./
RUN npm run build

RUN npm prune --omit=dev --audit=false

FROM apify/actor-node-playwright-chrome:20

USER root
COPY --from=builder /home/myuser/package*.json ./
COPY --from=builder /home/myuser/node_modules ./node_modules
COPY --from=builder /home/myuser/dist ./dist

COPY . ./
USER myuser

CMD ["node", "dist/main.js"]
