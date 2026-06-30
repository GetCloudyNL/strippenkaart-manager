# Eén image voor zowel de Next.js-app als de worker (command wordt in
# docker-compose overschreven).
FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
