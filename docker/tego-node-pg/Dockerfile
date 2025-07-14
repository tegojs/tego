FROM node:20.18.0-bookworm as base

# 安装 PostgreSQL 客户端及zip
RUN apt-get update && \
    apt-get install -y \
    wget \
    ca-certificates \
    lsb-release \
    gnupg \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | tee /etc/apt/trusted.gpg.d/postgresql.asc \
    && echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -c | awk '{print $2}')-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y postgresql-client-16 zip \
    && rm -rf /var/lib/apt/lists/*