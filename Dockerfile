FROM node:22-alpine AS frontend
WORKDIR /frontend

# Фиксируем версию pnpm 10.14.0
ENV PNPM_VERSION="10.14.0"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Устанавливаем конкретную версию pnpm через corepack
RUN corepack prepare pnpm@$PNPM_VERSION --activate && \
    # Проверяем установку pnpm
    pnpm --version

# Копируем package.json и lock‑файл для установки зависимостей
COPY src/frontend/package.json src/frontend/pnpm-lock.yaml ./

# Установка с подробным логом для диагностики
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

FROM python:3.12-slim-bookworm AS aiohttp-backend
WORKDIR /app

# Настройка часового пояса
RUN cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime && \
    echo "Europe/Moscow" > /etc/timezone

# Установка системных зависимостей
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
        ca-certificates \
        build-essential \
        libmagic-dev && \
    apt-get clean && \
    update-ca-certificates

# Копируем requirements и устанавливаем Python‑зависимости
COPY src/backend/requirements.txt .
RUN pip --no-cache-dir install -U pip setuptools && \
    pip --no-cache-dir install -r requirements.txt

# Копируем собранный фронтенд
COPY --from=frontend /frontend/dist ./static

# Копируем код бэкенда
COPY src/backend .

ENTRYPOINT ["gunicorn", "-c", "gunicorn.config.py"]
