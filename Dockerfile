# syntax=docker/dockerfile:1.7
#
# One Dockerfile, two images (build with --target):
#   api   NestJS API, outbox worker and the migrate step. Same image, different command.
#   site  Public menu and landing page (React Router SSR).
# apps/web and apps/admin are static SPAs and are NOT built here (they go to Cloudflare Pages).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm CI=true
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@app/api --filter=@app/site

FROM build AS api
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/api
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]

FROM build AS site
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/site
EXPOSE 3000
USER node
CMD ["pnpm", "start"]
