# 🚀 Быстрый запуск MuStore

## Шаг 1: Подготовка

Убедитесь, что у вас установлены:
- Docker и Docker Compose
- Git (для клонирования репозитория)

## Шаг 2: Запуск

```bash
# 1. Перейдите в папку проекта
cd mustore

# 2. Создайте файл с переменными окружения (если его нет)
cp .env.example .env

# 3. Запустите все сервисы
docker-compose up -d

# 4. Дождитесь полной загрузки (2-3 минуты)
docker-compose logs -f backend

# Когда увидите "Ready to rock! 🎸" - всё готово!
```

## Шаг 3: Проверка

Откройте в браузере:
- **Сайт**: http://localhost
- **API**: http://localhost/api/health

## Шаг 4: Тестирование

Используйте тестовые аккаунты:

**Администратор:**
- Email: `admin@mustore.ru`
- Пароль: `admin123`

**Пользователь:**
- Email: `user@example.com`
- Пароль: `password123`

## ⚠️ Если что-то не работает

### Проблема: Сайт не загружается
```bash
# Проверьте статус контейнеров
docker-compose ps

# Перезапустите сервисы
docker-compose restart
```

### Проблема: Нет товаров в каталоге
```bash
# Инициализируйте данные
docker-compose exec backend node seed.js
```

### Проблема: Ошибки в API
```bash
# Посмотрите логи backend
docker-compose logs backend

# Проверьте подключение к базе данных
docker-compose exec postgres psql -U postgres -d mustore -c "SELECT COUNT(*) FROM products;"
```

### Полная переустановка
```bash
# Остановить и удалить всё
docker-compose down -v

# Удалить образы (опционально)
docker-compose down --rmi all

# Запустить заново
docker-compose up -d --build
```

## 📂 Структура портов

- **80** - Nginx (основной сайт)
- **3001** - Backend API
- **5432** - PostgreSQL
- **5050** - pgAdmin (опционально)

## 🔍 Полезные команды

```bash
# Просмотр логов
docker-compose logs -f [service_name]

# Вход в контейнер
docker-compose exec [service_name] sh

# Проверка базы данных
docker-compose exec postgres psql -U postgres -d mustore

# Остановка
docker-compose down

# Запуск с пересборкой
docker-compose up -d --build
```

## ✅ Проверочный список

- [ ] Docker запущен
- [ ] Порты 80, 3001, 5432 свободны  
- [ ] Сайт открывается на http://localhost
- [ ] API отвечает на http://localhost/api/health
- [ ] Можно войти под тестовым аккаунтом
- [ ] Товары отображаются в каталоге
- [ ] Работает добавление в корзину

Если всё отмечено ✅ - приложение работает корректно!