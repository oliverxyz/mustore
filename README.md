# MuStore - Магазин музыкальных инструментов

Полнофункциональный интернет-магазин музыкальных инструментов с современным интерфейсом и мощным API.

## 🚀 Быстрый старт

### Вариант 1: Запуск через Docker (Рекомендуется)

1. **Убедитесь, что у вас установлены:**
   - Docker
   - Docker Compose

2. **Клонируйте репозиторий и перейдите в папку:**
   ```bash
   cd mustore
   ```

3. **Создайте файл .env (или используйте существующий):**
   ```bash
   cp .env.example .env
   ```

4. **Запустите приложение:**
   ```bash
   docker-compose up -d
   ```

5. **Дождитесь полной загрузки (около 2-3 минут) и откройте в браузере:**
   - Веб-сайт: http://localhost
   - API: http://localhost/api/health
   - pgAdmin: http://localhost:5050 (опционально)

### Вариант 2: Ручной запуск для разработки

1. **Установите зависимости:**
   ```bash
   # PostgreSQL должен быть установлен и запущен
   # Node.js 18+ должен быть установлен
   
   cd backend
   npm install
   ```

2. **Создайте базу данных:**
   ```bash
   # Подключитесь к PostgreSQL и создайте БД
   createdb mustore
   
   # Примените схему
   psql -U postgres -d mustore -f ../database.sql
   ```

3. **Заполните данными:**
   ```bash
   node seed.js
   ```

4. **Запустите backend:**
   ```bash
   npm run dev
   # или
   npm start
   ```

5. **Запустите frontend:**
   ```bash
   # В отдельном терминале, из корневой папки
   # Используйте любой веб-сервер, например:
   python -m http.server 8080 --directory frontend
   # или
   npx serve frontend
   ```

6. **Откройте в браузере:**
   - http://localhost:8080 (frontend)
   - http://localhost:3001/api/health (backend API)

## 🎯 Тестовые аккаунты

После инициализации базы данных доступны следующие аккаунты:

- **Администратор:**
  - Email: `admin@mustore.ru`
  - Пароль: `admin123`

- **Обычный пользователь:**
  - Email: `user@example.com`
  - Пароль: `password123`

## 📁 Структура проекта

```
mustore/
├── backend/                 # Node.js API сервер
│   ├── server.js           # Основной файл сервера
│   ├── validation.js       # Валидация запросов
│   ├── package.json        # Зависимости backend
│   ├── Dockerfile          # Docker образ для backend
│   └── uploads/            # Загруженные файлы
├── frontend/               # Frontend приложение
│   ├── index.html          # Главная страница
│   ├── script.js           # Основная логика
│   ├── api-client.js       # API клиент
│   └── style.css           # Стили
├── database.sql            # Схема базы данных
├── seed.js                 # Инициализация данных
├── docker-compose.yml      # Docker Compose конфигурация
├── nginx.conf              # Конфигурация Nginx
├── .env                    # Переменные окружения
├── Makefile               # Команды автоматизации
└── README.md              # Этот файл
```

## 🛠 Команды Makefile

Доступны следующие команды для автоматизации:

```bash
make help           # Показать все доступные команды
make install        # Установить зависимости
make dev            # Запуск в режиме разработки
make start          # Запуск в production режиме

# База данных
make db-init        # Инициализировать БД
make db-seed        # Заполнить БД тестовыми данными
make db-reset       # Сбросить и переинициализировать БД

# Docker
make docker-up      # Запустить все сервисы в Docker
make docker-down    # Остановить все сервисы
make docker-logs    # Показать логи

# Утилиты
make clean          # Очистить временные файлы
make status         # Проверить статус сервисов
make quickstart     # Быстрый старт для разработки
```

## 🐳 Docker сервисы

При запуске через Docker поднимаются следующие сервисы:

- **nginx** (порт 80) - Веб-сервер и reverse proxy
- **backend** (порт 3001) - Node.js API сервер  
- **postgres** (порт 5432) - База данных PostgreSQL
- **pgadmin** (порт 5050) - Администрирование БД (опционально)

## 🔧 API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Получение текущего пользователя

### Товары
- `GET /api/products` - Список товаров (с фильтрами)
- `GET /api/products/:id` - Детали товара
- `GET /api/products/:id/similar` - Похожие товары

### Категории и бренды
- `GET /api/categories` - Список категорий
- `GET /api/categories/:slug` - Детали категории
- `GET /api/brands` - Список брендов

### Корзина
- `GET /api/cart` - Получение корзины
- `POST /api/cart/items` - Добавление в корзину
- `PUT /api/cart/items/:id` - Обновление количества
- `DELETE /api/cart/items/:id` - Удаление из корзины

### Избранное
- `GET /api/favorites` - Список избранного
- `POST /api/favorites` - Добавление в избранное
- `DELETE /api/favorites/:id` - Удаление из избранного

## 🌟 Особенности

- ✅ Полнофункциональный каталог товаров
- ✅ Система аутентификации и авторизации
- ✅ Корзина покупок (работает для гостей и пользователей)
- ✅ Избранные товары
- ✅ Поиск и фильтрация товаров
- ✅ Адаптивный дизайн
- ✅ REST API
- ✅ Валидация данных
- ✅ Обработка ошибок
- ✅ Docker поддержка
- ✅ База данных PostgreSQL
- ✅ Nginx reverse proxy

## 🔍 Troubleshooting

### Проблема: Не загружаются товары
**Решение:** Убедитесь, что база данных инициализирована и заполнена данными:
```bash
make db-reset
# или
docker-compose exec backend node seed.js
```

### Проблема: API недоступен
**Решение:** Проверьте, что backend запущен на правильном порту:
```bash
curl http://localhost:3001/api/health
# или в Docker
docker-compose logs backend
```

### Проблема: CORS ошибки
**Решение:** Убедитесь, что в .env файле правильно настроен CORS_ORIGIN

### Проблема: Изображения не загружаются
**Решение:** Изображения загружаются с Unsplash. Проверьте интернет-соединение.

## 📝 Логи

Для просмотра логов в Docker:
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f postgres
```

## 🚀 Развертывание

Для развертывания в production:

1. Измените переменные окружения в .env
2. Установите `NODE_ENV=production`
3. Используйте HTTPS
4. Настройте backup базы данных
5. Настройте мониторинг

## 📄 Лицензия

MIT License

## 🤝 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что все порты свободны
3. Перезапустите сервисы: `docker-compose restart`
4. Полная переустановка: `docker-compose down -v && docker-compose up -d`