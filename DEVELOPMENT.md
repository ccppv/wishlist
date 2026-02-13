# Development Guide

## Backend Development

### Структура проекта

```
backend/
├── app/
│   ├── api/v1/endpoints/  # API эндпоинты
│   ├── core/              # Конфигурация и утилиты
│   ├── db/                # База данных
│   ├── models/            # SQLAlchemy модели
│   └── schemas/           # Pydantic схемы
```

### Добавление нового endpoint

1. Создайте схему в `app/schemas/`:
```python
# app/schemas/wishlist.py
from pydantic import BaseModel

class WishListCreate(BaseModel):
    title: str
    description: str | None = None
```

2. Создайте модель в `app/models/`:
```python
# app/models/wishlist.py
from sqlalchemy import Column, Integer, String
from app.db.base import Base

class WishList(Base):
    __tablename__ = "wishlists"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
```

3. Создайте endpoint в `app/api/v1/endpoints/`:
```python
# app/api/v1/endpoints/wishlists.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_wishlists():
    return []
```

4. Добавьте router в `app/api/v1/__init__.py`:
```python
from app.api.v1.endpoints import wishlists
api_router.include_router(wishlists.router, prefix="/wishlists", tags=["wishlists"])
```

### Работа с миграциями

```bash
# Создать миграцию
make migration message="add wishlists table"

# Применить миграции
make migrate

# Откатить последнюю миграцию
docker-compose exec backend alembic downgrade -1
```

## Frontend Development

### Структура

```
frontend/
├── app/            # Next.js App Router
├── components/     # React компоненты
├── lib/           # Утилиты
├── store/         # State management
└── types/         # TypeScript типы
```

### Создание нового компонента

```typescript
// components/WishlistCard.tsx
interface WishlistCardProps {
  title: string;
  description?: string;
}

export default function WishlistCard({ title, description }: WishlistCardProps) {
  return (
    <div className="p-4 border rounded">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
```

### API calls

```typescript
// lib/api/wishlists.ts
import apiClient from '@/lib/api-client';

export async function getWishlists() {
  const response = await apiClient.get('/api/v1/wishlists/');
  return response.data;
}

export async function createWishlist(data: WishListCreate) {
  const response = await apiClient.post('/api/v1/wishlists/', data);
  return response.data;
}
```

### State management с Zustand

```typescript
// store/wishlist.ts
import { create } from 'zustand';

interface WishlistStore {
  wishlists: WishList[];
  setWishlists: (wishlists: WishList[]) => void;
  addWishlist: (wishlist: WishList) => void;
}

export const useWishlistStore = create<WishlistStore>((set) => ({
  wishlists: [],
  setWishlists: (wishlists) => set({ wishlists }),
  addWishlist: (wishlist) => set((state) => ({
    wishlists: [...state.wishlists, wishlist]
  })),
}));
```

## Database

### Подключение к PostgreSQL

```bash
make shell-db
```

### Полезные SQL команды

```sql
-- Список таблиц
\dt

-- Описание таблицы
\d users

-- Выполнить запрос
SELECT * FROM users;
```

## Testing

### Backend тесты

```bash
# Запустить тесты
make test-backend

# С coverage
docker-compose exec backend pytest --cov=app tests/
```

### Frontend тесты

```bash
make test-frontend
```

## WebSocket Development

### Backend WebSocket

```python
# app/api/v1/endpoints/websocket.py
@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(data, client_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
```

### Frontend WebSocket

```typescript
const ws = new WebSocketClient(process.env.NEXT_PUBLIC_WS_URL!);
ws.connect('user-123');
ws.onMessage((data) => {
  console.log('Received:', data);
});
ws.send({ type: 'update', data: {...} });
```

## Best Practices

### Backend
- Используйте async/await для всех DB операций
- Валидируйте входные данные через Pydantic
- Используйте typing hints везде
- Пишите docstrings для функций
- Обрабатывайте ошибки корректно

### Frontend
- Используйте TypeScript строго
- Создавайте переиспользуемые компоненты
- Используйте SWR для data fetching
- Оптимизируйте изображения через next/image
- Следуйте принципам accessibility

## Debugging

### Backend
```python
# Добавьте breakpoint
import pdb; pdb.set_trace()

# Или используйте логирование
import logging
logger = logging.getLogger(__name__)
logger.debug("Debug message")
```

### Frontend
- Используйте React DevTools
- Chrome DevTools для network/performance
- console.log() для быстрой отладки
- VS Code debugger для breakpoints

## Performance

### Backend
- Используйте async везде
- Кэшируйте частые запросы в Redis
- Используйте database indexes
- Пагинация для больших списков

### Frontend
- Dynamic imports для code splitting
- Оптимизация изображений
- Кэширование через SWR
- Lazy loading компонентов
