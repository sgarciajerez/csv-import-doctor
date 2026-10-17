FROM node:22-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/csv-doctor-core/package.json packages/csv-doctor-core/package.json
RUN npm ci --omit=dev --no-audit --no-fund

COPY csv-import-doctor/package.json csv-import-doctor/package-lock.json ./csv-import-doctor/
COPY csv-import-doctor/extensions/ ./csv-import-doctor/extensions/
WORKDIR /app/csv-import-doctor
RUN npm ci --omit=dev --no-audit --no-fund

WORKDIR /app
COPY . .

WORKDIR /app/csv-import-doctor
RUN npm run build

CMD ["npm", "run", "docker-start"]
