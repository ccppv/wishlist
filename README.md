# Wishlist - Social Wishlist Application

Полноценная основа веб-приложения для социального вишлиста с production-ready архитектурой.

## 🏗️ Архитектура

### Frontend
- **Next.js 14** - React framework с SSR/SSG
- **TypeScript** - статическая типизация
- **Tailwind CSS** - адаптивная верстка
- **Zustand** - state management
- **SWR** - data fetching
- **Axios** - HTTP клиент
- **WebSocket** - real-time коммуникация

### Backend
- **FastAPI** - современный Python web framework
- **SQLAlchemy 2.0** - async ORM
- **Alembic** - миграции базы данных
- **Pydantic** - валидация данных
- **JWT** - аутентификация
- **WebSocket** - real-time функциональность

### База данных
- **PostgreSQL 16** - основная БД
- **Redis 7** - кэширование и сессии

### Инфраструктура
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация
- **Nginx** - reverse proxy (production)

## 📁 Структура проекта

```
hh_works/
├── backend/                  # FastAPI приложение
│   ├── alembic/             # Миграции базы данных
│   │   ├── versions/        # Файлы миграций
│   │   └── env.py          # Конфигурация Alembic
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           ├── auth.py       # Аутентификация
│   │   │           ├── users.py      # Управление пользователями
│   │   │           └── websocket.py  # WebSocket
│   │   ├── core/           # Конфигурация и утилиты
│   │   │   ├── config.py   # Настройки приложения
│   │   │   └── security.py # Безопасность (JWT, пароли)
│   │   ├── db/             # База данных
│   │   │   ├── base.py     # Базовые модели
│   │   │   └── session.py  # Сессии БД
│   │   ├── models/         # SQLAlchemy модели
│   │   │   └── user.py
│   │   ├── schemas/        # Pydantic схемы
│   │   │   └── user.py
│   │   └── main.py         # Точка входа
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── frontend/                # Next.js приложение
│   ├── app/                # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/         # React компоненты
│   ├── lib/               # Утилиты
│   │   ├── api-client.ts  # API клиент
│   │   └── websocket-client.ts
│   ├── store/             # State management
│   │   └── auth.ts
│   ├── types/             # TypeScript типы
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── .env.local.example
│
├── nginx/                  # Nginx конфигурация
│   └── nginx.conf
│
├── docker-compose.yml      # Development окружение
├── docker-compose.prod.yml # Production окружение
├── .env.example           # Пример переменных окружения
├── .gitignore
├── Makefile              # Удобные команды
└── README.md
```

## 🚀 Быстрый старт

### Требования
- Docker и Docker Compose
- Git

### Установка и запуск

1. **Клонируйте репозиторий**
```bash
cd /Users/mansik/Desktop/hh_works
```

2. **Создайте файл .env**
```bash
cp .env.example .env
# Отредактируйте .env и установите надежные пароли
```

3. **Запустите проект**
```bash
make up
# или
docker-compose up -d
```

4. **Примените миграции**
```bash
make migrate
# или
docker-compose exec backend alembic upgrade head
```

5. **Откройте приложение**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## 🛠️ Команды Makefile

```bash
make up              # Запустить все сервисы
make down            # Остановить все сервисы
make restart         # Перезапустить сервисы
make logs            # Показать логи всех сервисов
make logs-backend    # Логи backend
make logs-frontend   # Логи frontend
make migrate         # Применить миграции
make migration       # Создать новую миграцию
make shell-backend   # Войти в контейнер backend
make shell-frontend  # Войти в контейнер frontend
make shell-db        # Подключиться к PostgreSQL
make build           # Пересобрать контейнеры
make clean           # Очистить volumes и контейнеры
```

## 📝 Работа с миграциями

### Создание новой миграции
```bash
# Автогенерация миграции на основе изменений моделей
make migration message="add wishlist table"

# Или напрямую
docker-compose exec backend alembic revision --autogenerate -m "add wishlist table"
```

### Применение миграций
```bash
make migrate
# или
docker-compose exec backend alembic upgrade head
```

### Откат миграции
```bash
docker-compose exec backend alembic downgrade -1
```

## 🔧 Разработка

### Backend разработка

1. **Активация виртуального окружения (локально)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

2. **Запуск локально**
```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend разработка

1. **Установка зависимостей**
```bash
cd frontend
npm install
```

2. **Запуск dev server**
```bash
npm run dev
```

3. **Build production**
```bash
npm run build
npm start
```

## 🏭 Production deployment

1. **Настройте переменные окружения**
```bash
cp .env.example .env
# Установите надежные значения для production
```

2. **Запустите production конфигурацию**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Настройте SSL сертификаты**
```bash
# Разместите сертификаты в nginx/ssl/
# Раскомментируйте HTTPS блок в nginx/nginx.conf
```

## 🔐 Безопасность

### Обязательно измените в production:
- `SECRET_KEY` - минимум 32 символа, случайная строка
- `POSTGRES_PASSWORD` - надежный пароль для БД
- Настройте HTTPS с валидными SSL сертификатами
- Настройте CORS в `backend/app/core/config.py`
- Включите firewall и ограничьте доступ к портам

## 📚 API документация

После запуска backend доступна автоматическая документация:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 Тестирование

### Backend тесты
```bash
cd backend
pytest
```

### Frontend тесты
```bash
cd frontend
npm test
```

## 🔄 WebSocket

WebSocket endpoint доступен по адресу:
```
ws://localhost:8000/api/v1/ws/{client_id}
```

Пример использования в frontend:
```typescript
import WebSocketClient from '@/lib/websocket-client';

const ws = new WebSocketClient(process.env.NEXT_PUBLIC_WS_URL!);
ws.connect('user-123');
ws.onMessage((data) => console.log(data));
ws.send({ type: 'message', content: 'Hello' });
```

## 📦 Зависимости

### Backend
- fastapi - Web framework
- uvicorn - ASGI server
- sqlalchemy - ORM
- asyncpg - PostgreSQL driver
- alembic - Миграции
- pydantic - Валидация
- python-jose - JWT
- passlib - Хеширование паролей

### Frontend
- next - React framework
- react - UI library
- typescript - Типизация
- tailwindcss - CSS framework
- axios - HTTP client
- zustand - State management
- swr - Data fetching

## 🤝 Contributing

1. Создайте feature branch
2. Добавьте изменения
3. Напишите тесты
4. Создайте Pull Request

## 📄 Лицензия

MIT

## 📞 Контакты

Для вопросов и предложений создайте issue в репозитории.

---

**Готово к разработке! 🚀**

Базовая структура настроена. Теперь можно начинать разработку основной функциональности приложения:
- Модели для wishlists и wish items
- API endpoints для CRUD операций
- UI компоненты
- Аутентификация и авторизация
- Real-time обновления через WebSocket
