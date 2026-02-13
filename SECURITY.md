# Security Policy

## Supported Versions

Версии, получающие обновления безопасности:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Если вы обнаружили уязвимость в безопасности:

1. **НЕ создавайте публичный issue**
2. Отправьте детали на [security@example.com] или создайте private security advisory
3. Включите:
   - Описание уязвимости
   - Шаги для воспроизведения
   - Потенциальное влияние
   - Возможные решения (если есть)

## Security Best Practices

### Для разработчиков

1. **Секреты и токены**
   - Никогда не коммитьте `.env` файлы
   - Используйте надежные случайные ключи
   - Храните секреты в безопасном месте

2. **Зависимости**
   - Регулярно обновляйте зависимости
   - Проверяйте известные уязвимости
   ```bash
   # Backend
   pip-audit
   
   # Frontend
   npm audit
   ```

3. **Кодирование**
   - Валидируйте все входные данные
   - Используйте параметризованные запросы
   - Избегайте SQL injection
   - Защита от XSS

4. **Аутентификация**
   - Используйте bcrypt для паролей
   - Применяйте rate limiting
   - Используйте HTTPS в production
   - Настройте CORS правильно

### Для деплоя

1. **Environment**
   - Измените все дефолтные пароли
   - Используйте сильный `SECRET_KEY`
   - Настройте SSL/TLS
   - Ограничьте доступ к БД

2. **Network**
   - Используйте firewall
   - Ограничьте открытые порты
   - Настройте VPC/security groups

3. **Monitoring**
   - Отслеживайте логи
   - Настройте алерты
   - Регулярные security audits

## Known Security Considerations

### Current Implementation

1. **JWT Tokens**
   - Токены хранятся в localStorage
   - Рассмотрите httpOnly cookies для production

2. **Rate Limiting**
   - Базовый rate limiting в nginx
   - Рассмотрите более продвинутые решения

3. **CORS**
   - Настройте allowed origins в production
   - Не используйте `allow_origins=["*"]`

### Roadmap

- [ ] Implement refresh tokens
- [ ] Add 2FA support
- [ ] Implement account lockout
- [ ] Add security headers middleware
- [ ] Implement CSRF protection
- [ ] Add request signing
- [ ] Implement API key rotation

## Updates

Проверяйте этот документ регулярно на обновления security политики.

Последнее обновление: 2024-02-11
