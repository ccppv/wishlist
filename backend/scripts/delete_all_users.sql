-- Удаление всех пользователей и связанных данных
-- Локально: psql -U postgres -d wishlist -f scripts/delete_all_users.sql
-- Docker:  docker exec -i wishlist_db psql -U postgres -d wishlist < scripts/delete_all_users.sql

BEGIN;

DELETE FROM reservations WHERE user_id IS NOT NULL;
DELETE FROM contributions WHERE user_id IS NOT NULL;
DELETE FROM friendships;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'reserved_by_id'
    ) THEN
        UPDATE items SET reserved_by_id = NULL WHERE reserved_by_id IS NOT NULL;
    END IF;
END $$;

DELETE FROM users;
DELETE FROM guest_sessions;

COMMIT;
