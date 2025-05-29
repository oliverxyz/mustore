# =============================================
# MuStore Makefile
# Автоматизация часто используемых команд
# =============================================

.PHONY: help install dev start build test clean docker-up docker-down docker-logs db-init db-seed db-reset

# Переменные
DC = docker compose
NODE = node
NPM = npm

# Показать справку (команда по умолчанию)
help:
	@echo "MuStore - Доступные команды:"
	@echo ""
	@echo "Разработка:"
	@echo "  make install      - Установить зависимости"
	@echo "  make dev          - Запустить в режиме разработки"
	@echo "  make start        - Запустить в production режиме"
	@echo "  make test         - Запустить тесты"
	@echo ""
	@echo "База данных:"
	@echo "  make db-init      - Инициализировать БД"
	@echo "  make db-seed      - Заполнить БД тестовыми данными"
	@echo "  make db-reset     - Сбросить и переинициализировать БД"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up    - Запустить все сервисы в Docker"
	@echo "  make docker-down  - Остановить все сервисы"
	@echo "  make docker-logs  - Показать логи"
	@echo "  make docker-build - Пересобрать образы"
	@echo ""
	@echo "Утилиты:"
	@echo "  make clean        - Очистить временные файлы"
	@echo "  make backup       - Создать резервную копию БД"

# Установка зависимостей
install:
	$(NPM) install

# Разработка
dev:
	$(NPM) run dev

# Production
start:
	$(NPM) start

# Тесты
test:
	$(NPM) test

# База данных - инициализация
db-init:
	psql -U postgres -c "CREATE DATABASE mustore;" || true
	psql -U postgres -d mustore -f database.sql

# База данных - заполнение
db-seed:
	$(NODE) seed.js

# База данных - полный сброс
db-reset:
	psql -U postgres -c "DROP DATABASE IF EXISTS mustore;"
	psql -U postgres -c "CREATE DATABASE mustore;"
	psql -U postgres -d mustore -f database.sql
	$(NODE) seed.js

# Docker - запуск
docker-up:
	$(DC) up -d

# Docker - остановка
docker-down:
	$(DC) down

# Docker - логи
docker-logs:
	$(DC) logs -f

# Docker - пересборка
docker-build:
	$(DC) build --no-cache

# Docker - полный перезапуск
docker-restart: docker-down docker-build docker-up

# Docker - инициализация БД в контейнере
docker-db-init:
	$(DC) exec backend npm run db:init

# Docker - заполнение БД в контейнере
docker-db-seed:
	$(DC) exec backend npm run db:seed

# Очистка временных файлов
clean:
	rm -rf node_modules
	rm -rf uploads/products/*
	rm -rf logs/*
	rm -f npm-debug.log*

# Резервная копия БД
backup:
	@mkdir -p backups
	@pg_dump -U postgres mustore > backups/mustore_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backups/mustore_backup_$$(date +%Y%m%d_%H%M%S).sql"

# Восстановление из резервной копии
restore:
	@echo "Available backups:"
	@ls -la backups/*.sql
	@echo ""
	@echo "To restore, run: psql -U postgres mustore < backups/[backup_file.sql]"

# Проверка статуса сервисов
status:
	@echo "Checking services status..."
	@echo ""
	@echo "PostgreSQL:"
	@pg_isready -h localhost -p 5432 || echo "PostgreSQL is not running"
	@echo ""
	@echo "Node.js API:"
	@curl -s http://localhost:3001/api/health || echo "API is not running"
	@echo ""
	@echo "Frontend:"
	@curl -s http://localhost:80 || echo "Frontend is not running"

# Быстрый старт для разработки
quickstart: install db-init db-seed
	@echo ""
	@echo "✅ MuStore готов к работе!"
	@echo ""
	@echo "Запустите 'make dev' для старта в режиме разработки"
	@echo "или 'make docker-up' для запуска в Docker"

# Проверка окружения
check-env:
	@echo "Checking environment..."
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm not installed"; exit 1; }
	@command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL client not installed"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
	@command -v docker compose >/dev/null 2>&1 || { echo "❌ Docker Compose not installed"; exit 1; }
	@echo "✅ All requirements installed"

# Генерация документации API
api-docs:
	@echo "Generating API documentation..."
	@npx swagger-jsdoc -d swaggerDef.js -o ./docs/swagger.json
	@echo "API documentation generated at ./docs/swagger.json"