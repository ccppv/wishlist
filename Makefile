.PHONY: up down restart logs logs-backend logs-frontend logs-db build clean migrate migration shell-backend shell-frontend shell-db help

# Цвета для вывода
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m # No Color

help: ## Показать это сообщение
	@echo "$(GREEN)Доступные команды:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

up: ## Запустить все сервисы
	@echo "$(GREEN)Запуск сервисов...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Сервисы запущены$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

down: ## Остановить все сервисы
	@echo "$(YELLOW)Остановка сервисов...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Сервисы остановлены$(NC)"

restart: ## Перезапустить сервисы
	@echo "$(YELLOW)Перезапуск сервисов...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Сервисы перезапущены$(NC)"

logs: ## Показать логи всех сервисов
	docker-compose logs -f

logs-backend: ## Показать логи backend
	docker-compose logs -f backend

logs-frontend: ## Показать логи frontend
	docker-compose logs -f frontend

logs-db: ## Показать логи базы данных
	docker-compose logs -f db

build: ## Пересобрать контейнеры
	@echo "$(YELLOW)Пересборка контейнеров...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Контейнеры пересобраны$(NC)"

migrate: ## Применить миграции
	@echo "$(YELLOW)Применение миграций...$(NC)"
	docker-compose exec backend alembic upgrade head
	@echo "$(GREEN)✓ Миграции применены$(NC)"

migration: ## Создать новую миграцию (использование: make migration message="описание")
	@echo "$(YELLOW)Создание миграции...$(NC)"
	docker-compose exec backend alembic revision --autogenerate -m "$(message)"
	@echo "$(GREEN)✓ Миграция создана$(NC)"

shell-backend: ## Войти в shell backend контейнера
	docker-compose exec backend /bin/bash

shell-frontend: ## Войти в shell frontend контейнера
	docker-compose exec frontend /bin/sh

shell-db: ## Подключиться к PostgreSQL
	docker-compose exec db psql -U postgres -d wishlist

clean: ## Очистить все volumes и контейнеры (ВНИМАНИЕ: удалит данные!)
	@echo "$(YELLOW)⚠️  ВНИМАНИЕ: Это удалит все данные!$(NC)"
	@read -p "Вы уверены? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -f; \
		echo "$(GREEN)✓ Очистка завершена$(NC)"; \
	fi

prod-up: ## Запустить production окружение
	@echo "$(GREEN)Запуск production окружения...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Production сервисы запущены$(NC)"

prod-down: ## Остановить production окружение
	docker-compose -f docker-compose.prod.yml down

prod-logs: ## Логи production окружения
	docker-compose -f docker-compose.prod.yml logs -f

test-backend: ## Запустить backend тесты
	docker-compose exec backend pytest

test-frontend: ## Запустить frontend тесты
	docker-compose exec frontend npm test

install-backend: ## Установить backend зависимости
	cd backend && pip install -r requirements.txt

install-frontend: ## Установить frontend зависимости
	cd frontend && npm install

format-backend: ## Форматировать backend код
	cd backend && black app/

lint-backend: ## Проверить backend код
	cd backend && flake8 app/

lint-frontend: ## Проверить frontend код
	cd frontend && npm run lint

status: ## Показать статус сервисов
	@echo "$(GREEN)Статус сервисов:$(NC)"
	@docker-compose ps

init: ## Первоначальная настройка проекта
	@echo "$(GREEN)Инициализация проекта...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)Создан файл .env. Отредактируйте его перед запуском!$(NC)"; \
	fi
	@make build
	@make up
	@echo "$(YELLOW)Ожидание запуска сервисов...$(NC)"
	@sleep 10
	@make migrate
	@echo "$(GREEN)✓ Проект инициализирован!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000/docs"
