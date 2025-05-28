# =============================================
# MuStore Backend Dockerfile
# =============================================

# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем остальные файлы приложения
COPY . .

# Создаем директорию для загрузок
RUN mkdir -p uploads/products

# Устанавливаем права на директорию uploads
RUN chown -R node:node /app/uploads

# Переключаемся на пользователя node для безопасности
USER node

# Открываем порт
EXPOSE 3000

# Команда запуска приложения
CMD ["node", "server.js"]