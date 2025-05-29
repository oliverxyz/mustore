# =============================================
# MuStore Backend Dockerfile
# =============================================

# Используем официальный образ Node.js (LTS версия)
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем необходимые системные пакеты
RUN apk add --no-cache \
    postgresql-client \
    curl

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем остальные файлы приложения
COPY . .

# Создаем директории для загрузок и логов
RUN mkdir -p uploads/products logs

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Устанавливаем права на директории
RUN chown -R nodeuser:nodejs /app

# Переключаемся на пользователя node для безопасности
USER nodeuser

# Открываем порт 3001
EXPOSE 3001

# Добавляем health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Команда запуска приложения
CMD ["node", "server.js"]