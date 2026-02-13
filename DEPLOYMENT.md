# Deployment Guide

## Production Deployment Checklist

### Pre-deployment

- [ ] Обновите все зависимости до стабильных версий
- [ ] Установите надежный `SECRET_KEY` (минимум 32 символа)
- [ ] Установите надежный пароль для PostgreSQL
- [ ] Настройте CORS в `backend/app/core/config.py`
- [ ] Проверьте все переменные окружения
- [ ] Запустите все тесты
- [ ] Проверьте логи на наличие предупреждений
- [ ] Настройте SSL сертификаты
- [ ] Настройте резервное копирование БД

### Environment Variables

Обязательные переменные для production:

```env
# Database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=strong_password_here
POSTGRES_DB=wishlist_prod

# Security
SECRET_KEY=your-very-long-random-secret-key-minimum-32-characters

# Project
PROJECT_NAME=Wishlist API
VERSION=1.0.0
```

### SSL Certificates

1. Получите SSL сертификаты (Let's Encrypt рекомендуется):
```bash
# Используя certbot
certbot certonly --standalone -d yourdomain.com
```

2. Разместите сертификаты:
```bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

3. Раскомментируйте HTTPS блок в `nginx/nginx.conf`

### Deployment Steps

#### Option 1: Docker Compose (Простой способ)

```bash
# 1. Клонируйте репозиторий на сервер
git clone <your-repo-url>
cd wishlist

# 2. Настройте environment
cp .env.example .env
# Отредактируйте .env

# 3. Запустите production
docker-compose -f docker-compose.prod.yml up -d

# 4. Примените миграции
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 5. Проверьте статус
docker-compose -f docker-compose.prod.yml ps
```

#### Option 2: Kubernetes

См. `k8s/` директорию для Kubernetes манифестов (создать отдельно).

### Database Backup

#### Автоматический backup

Создайте cron job для регулярного резервного копирования:

```bash
# Создайте скрипт backup.sh
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/wishlist"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker-compose exec -T db pg_dump -U postgres wishlist | gzip > $BACKUP_DIR/wishlist_$DATE.sql.gz

# Удалить старые бэкапы (старше 30 дней)
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x backup.sh

# Добавьте в crontab (запуск каждый день в 2:00)
0 2 * * * /path/to/backup.sh
```

#### Восстановление из backup

```bash
# Распакуйте backup
gunzip wishlist_20240211_020000.sql.gz

# Восстановите
docker-compose exec -T db psql -U postgres wishlist < wishlist_20240211_020000.sql
```

### Мониторинг

#### Health Checks

Endpoint для проверки здоровья:
```
GET http://your-domain.com/health
```

#### Логирование

Просмотр логов:
```bash
# Все логи
docker-compose -f docker-compose.prod.yml logs -f

# Только backend
docker-compose -f docker-compose.prod.yml logs -f backend

# С timestamp
docker-compose -f docker-compose.prod.yml logs -f --timestamps
```

#### Метрики (опционально)

Интегрируйте с:
- Prometheus для метрик
- Grafana для визуализации
- Sentry для отслеживания ошибок

### Security Best Practices

1. **Firewall**
```bash
# Разрешить только необходимые порты
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

2. **Обновления**
```bash
# Регулярно обновляйте систему
apt update && apt upgrade -y
```

3. **Database Security**
- Используйте сильные пароли
- Ограничьте доступ к PostgreSQL только из Docker сети
- Регулярно создавайте резервные копии

4. **Application Security**
- Держите зависимости актуальными
- Используйте HTTPS везде
- Настройте rate limiting в nginx
- Валидируйте все входные данные

### Scaling

#### Horizontal Scaling

Для масштабирования используйте load balancer:

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
  
  nginx:
    depends_on:
      - backend
```

Запуск:
```bash
docker-compose -f docker-compose.prod.yml -f docker-compose.scale.yml up -d --scale backend=3
```

#### Vertical Scaling

Увеличьте ресурсы контейнеров:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Troubleshooting

#### Проблема: Контейнеры не запускаются

```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs

# Проверьте статус
docker-compose -f docker-compose.prod.yml ps
```

#### Проблема: Database connection failed

```bash
# Проверьте, запущена ли БД
docker-compose -f docker-compose.prod.yml exec db pg_isready

# Проверьте переменные окружения
docker-compose -f docker-compose.prod.yml exec backend env | grep POSTGRES
```

#### Проблема: Frontend не подключается к backend

1. Проверьте переменные окружения frontend
2. Проверьте nginx конфигурацию
3. Проверьте логи nginx

### Rollback

В случае проблем откатитесь к предыдущей версии:

```bash
# 1. Остановите текущую версию
docker-compose -f docker-compose.prod.yml down

# 2. Переключитесь на предыдущий commit
git checkout <previous-commit>

# 3. Запустите снова
docker-compose -f docker-compose.prod.yml up -d

# 4. Откатите миграции если нужно
docker-compose -f docker-compose.prod.yml exec backend alembic downgrade -1
```

### Updates

Обновление production приложения:

```bash
# 1. Создайте backup
./backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Rebuild containers
docker-compose -f docker-compose.prod.yml build

# 4. Stop old containers
docker-compose -f docker-compose.prod.yml down

# 5. Start new containers
docker-compose -f docker-compose.prod.yml up -d

# 6. Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 7. Verify
curl http://localhost/health
```

### Performance Optimization

1. **Database**
   - Создайте индексы для часто запрашиваемых полей
   - Используйте connection pooling
   - Настройте PostgreSQL параметры

2. **Caching**
   - Используйте Redis для кэширования
   - Настройте HTTP кэширование в nginx

3. **Frontend**
   - Включите gzip компрессию в nginx
   - Используйте CDN для статики
   - Оптимизируйте изображения

4. **Backend**
   - Используйте async везде
   - Настройте worker processes
   - Оптимизируйте SQL запросы
