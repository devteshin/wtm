FROM node:22-alpine AS frontend
WORKDIR /frontend

# Кэширование зависимостей
RUN mkdir -p /frontend/node_modules
VOLUME /frontend/node_modules

ENV PNPM_HOME="/pnpm" PATH+=":$PNPM_HOME"
RUN corepack enable

# Копируем только lock‑файлы и package.json для установки зависимостей
COPY src/frontend/package.json src/frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --reporter=verbose

# Копируем конфигурационные файлы
COPY src/frontend/vite.config.ts ./
COPY src/frontend/index.html ./
COPY src/frontend/tsconfig.json ./
COPY src/frontend/eslint.config.js ./

# Копируем исходники
COPY src/frontend/src ./src
COPY src/frontend/public ./public

# Сборка фронтенда
RUN NODE_ENV=production pnpm build

FROM python:3.12-slim-bookworm as aiohttp-backend
WORKDIR /app
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime && echo "Europe/Moscow" >/etc/timezone
RUN apt-get update && apt-get upgrade -y && apt-get install ca-certificates build-essential libmagic-dev -y && apt-get clean
RUN update-ca-certificates
COPY src/backend/requirements.txt .
RUN pip --no-cache-dir install -U pip setuptools && pip --no-cache-dir install -r requirements.txt
COPY --from=frontend frontend/dist ./static
COPY src/backend .
ENTRYPOINT ["gunicorn", "-c", "gunicorn.config.py"]