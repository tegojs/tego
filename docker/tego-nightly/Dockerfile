FROM tegojs/tego-node-pg:latest AS base

ARG TEGO_VERSION=latest
ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /app

RUN pnpm install

RUN pnpm build:p

COPY . /app/

COPY ./docker/tego-nightly/docker-entrypoint.sh /app/
CMD ["/app/docker-entrypoint.sh"]
