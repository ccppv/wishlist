# Contributing to Wishlist

Спасибо за интерес к проекту! Мы приветствуем вклад от всех.

## Как внести свой вклад

### Reporting Bugs

Если вы нашли баг, пожалуйста:

1. Проверьте, не был ли он уже сообщен
2. Создайте новый issue с:
   - Четким описанием проблемы
   - Шагами для воспроизведения
   - Ожидаемым и фактическим поведением
   - Версией приложения и окружением

### Suggesting Features

Для предложения новых функций:

1. Проверьте существующие feature requests
2. Создайте issue с описанием:
   - Проблемы, которую решает фича
   - Предлагаемого решения
   - Альтернативных вариантов

### Pull Requests

1. **Fork репозитория**

2. **Создайте feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Следуйте code style**
   - Backend: следуйте PEP 8
   - Frontend: следуйте ESLint конфигурации
   - Используйте meaningful commit messages

4. **Напишите тесты**
   - Добавьте unit тесты для новой функциональности
   - Убедитесь, что все тесты проходят

5. **Обновите документацию**
   - Обновите README если нужно
   - Добавьте docstrings/комментарии
   - Обновите API документацию

6. **Commit и push**
```bash
git add .
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

7. **Создайте Pull Request**
   - Опишите что изменилось
   - Ссылайтесь на related issues
   - Добавьте скриншоты если UI изменения

## Code Style

### Backend (Python)

```python
# Good
def get_user_by_id(user_id: int) -> User:
    """
    Get user by ID.
    
    Args:
        user_id: The ID of the user
        
    Returns:
        User object
        
    Raises:
        HTTPException: If user not found
    """
    # Implementation
    pass

# Bad
def getUserById(userId):
    # No docstring, wrong naming
    pass
```

### Frontend (TypeScript)

```typescript
// Good
interface UserProps {
  id: number;
  name: string;
}

export function UserCard({ id, name }: UserProps) {
  return <div>{name}</div>;
}

// Bad
export function UserCard(props: any) {
  return <div>{props.name}</div>;
}
```

## Commit Messages

Следуйте [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - новая функциональность
- `fix:` - исправление бага
- `docs:` - изменения в документации
- `style:` - форматирование, без изменения кода
- `refactor:` - рефакторинг кода
- `test:` - добавление тестов
- `chore:` - обновление зависимостей и т.д.

Примеры:
```
feat: add user profile page
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify authentication logic
```

## Testing

### Backend Tests

```bash
# Запустить все тесты
docker-compose exec backend pytest

# С coverage
docker-compose exec backend pytest --cov=app tests/

# Конкретный тест
docker-compose exec backend pytest tests/test_users.py
```

### Frontend Tests

```bash
# Запустить тесты
cd frontend && npm test

# Watch mode
npm test -- --watch
```

## Local Development

1. **Setup**
```bash
./init.sh
```

2. **Backend development**
```bash
cd backend
./dev-setup.sh
source venv/bin/activate
uvicorn app.main:app --reload
```

3. **Frontend development**
```bash
cd frontend
./dev-setup.sh
npm run dev
```

## Code Review Process

1. Все PR требуют успешного прохождения тестов
2. Минимум один approve от мейнтейнера
3. Код должен следовать style guide
4. Должна быть обновлена документация

## Questions?

Если у вас есть вопросы:
- Создайте issue с тегом "question"
- Проверьте существующую документацию

## License

Внося вклад в проект, вы соглашаетесь с лицензией MIT.

## Thank You!

Спасибо за ваш вклад в развитие проекта! 🎉
