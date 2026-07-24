FROM apify/actor-node:20 AS builder

COPY package*.json ./
RUN npm install --include=dev --audit=false

COPY . ./
RUN npm run build

RUN npm prune --omit=dev --audit=false

FROM apify/actor-node:20

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

COPY . ./

CMD ["node", "dist/main.js"]
