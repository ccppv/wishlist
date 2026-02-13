# API Reference

## Authentication

### POST /api/v1/auth/login
Авторизация пользователя

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

### POST /api/v1/auth/register
Регистрация нового пользователя

**Request:**
```json
{
  "email": "user@example.com",
  "username": "string",
  "password": "string",
  "full_name": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

## Users

### GET /api/v1/users/
Получить список пользователей

**Query Parameters:**
- `skip`: int (default: 0)
- `limit`: int (default: 100)

**Response:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "username": "string",
    "full_name": "string",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2024-02-11T00:00:00Z",
    "updated_at": "2024-02-11T00:00:00Z"
  }
]
```

### GET /api/v1/users/{user_id}
Получить пользователя по ID

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "string",
  "full_name": "string",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2024-02-11T00:00:00Z",
  "updated_at": "2024-02-11T00:00:00Z"
}
```

### PUT /api/v1/users/{user_id}
Обновить пользователя

**Request:**
```json
{
  "email": "newemail@example.com",
  "username": "newusername",
  "full_name": "New Name",
  "password": "newpassword"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "newemail@example.com",
  "username": "newusername",
  "full_name": "New Name",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2024-02-11T00:00:00Z",
  "updated_at": "2024-02-11T00:00:00Z"
}
```

### DELETE /api/v1/users/{user_id}
Удалить пользователя

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## WebSocket

### WS /api/v1/ws/{client_id}
WebSocket соединение для real-time обновлений

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/user-123');
```

**Message Format:**
```json
{
  "type": "message_type",
  "data": {},
  "timestamp": "2024-02-11T00:00:00Z"
}
```

**Example Messages:**

Отправка сообщения:
```json
{
  "type": "chat",
  "message": "Hello!"
}
```

Получение сообщения:
```json
{
  "client_id": "user-123",
  "message": "Hello!",
  "type": "echo"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## Rate Limiting

API использует rate limiting для защиты от злоупотреблений:

- General endpoints: 30 запросов в секунду
- API endpoints: 10 запросов в секунду
- Burst: до 20 дополнительных запросов

При превышении лимита:
```json
{
  "detail": "Too many requests"
}
```

## Authentication

Все защищенные endpoints требуют JWT токен в заголовке:

```
Authorization: Bearer <access_token>
```

Токен получается через `/api/v1/auth/login` или `/api/v1/auth/register`.

## Interactive Documentation

Полная интерактивная документация доступна по адресам:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Examples

### Python Example

```python
import requests

# Login
response = requests.post(
    'http://localhost:8000/api/v1/auth/login',
    data={'username': 'user', 'password': 'password'}
)
token = response.json()['access_token']

# Get users
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'http://localhost:8000/api/v1/users/',
    headers=headers
)
users = response.json()
```

### JavaScript Example

```javascript
// Login
const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    username: 'user',
    password: 'password'
  })
});
const { access_token } = await loginResponse.json();

// Get users
const usersResponse = await fetch('http://localhost:8000/api/v1/users/', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const users = await usersResponse.json();
```

### cURL Example

```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user&password=password"

# Get users
curl -X GET "http://localhost:8000/api/v1/users/" \
  -H "Authorization: Bearer <access_token>"
```
