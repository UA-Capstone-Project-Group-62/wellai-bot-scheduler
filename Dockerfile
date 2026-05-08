FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]