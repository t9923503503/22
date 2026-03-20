# CLAUDE.md — Инструкция для ИИ-ассистента

## Стек проекта

**Это НЕ Supabase cloud.** Используется собственный сервер:

| Слой | Технология |
|------|-----------|
| БД | PostgreSQL 16 (self-hosted) |
| API | PostgREST v12 (self-hosted, порт 3000) |
| Веб | nginx → статика + `/api/rest/v1/` → PostgREST |
| Клиент | `supabase-js` SDK (указывает на свой сервер, не на `*.supabase.co`) |
| Фронтенд | Vanilla JS, статические HTML-файлы, PWA |

`supabase-js` используется **только как HTTP-клиент** к PostgREST — никаких Supabase Auth, Storage, Edge Functions, Realtime-сервисов cloud-платформы нет.

---

## Конфигурация

`config.js` в корне (не в git) задаёт:
```js
window.APP_CONFIG = {
  supabaseUrl:     'https://domain.com',       // свой сервер, НЕ *.supabase.co
  supabaseAnonKey: 'eyJ...',                   // JWT-токен для PostgREST
};
```

`supabaseAnonKey` — это JWT, подписанный секретом из `jwt-secret` в `/etc/postgrest.conf`.

---

## Архитектура API

```
Браузер
  └── supabase-js SDK
        └── POST https://domain.com/api/rest/v1/rpc/create_room
              └── nginx (proxy_pass → 127.0.0.1:3000)
                    └── PostgREST
                          └── PostgreSQL: функция public.create_room(...)
```

Nginx-прокси в `server_restore.sh`:
```nginx
location /api/rest/v1/ {
    proxy_pass http://127.0.0.1:3000/;
}
```

---

## База данных

Вся схема описана в **`supabase_migration.sql`** — единый источник истины.

### Основные таблицы

| Таблица | Назначение |
|---------|-----------|
| `kotc_sessions` | Синхронизация состояния (room_code + secret hash) |
| `players` | База игроков с рейтингом |
| `tournaments` | Турниры |
| `tournament_participants` | Участники + вейтлист |
| `player_requests` | Заявки новых игроков на модерацию |

### RPC-функции (все — SECURITY DEFINER)

**Синхронизация комнат:**
- `create_room(p_room_code, p_room_secret, p_initial_state)` — создать/подключиться к комнате
- `get_room_state(p_room_code, p_room_secret)` — получить состояние
- `push_room_state(p_room_code, p_room_secret, p_state)` — обновить состояние
- `rotate_room_secret(p_room_code, p_room_secret, p_new_room_secret)` — сменить секрет

**Регистрация:**
- `search_players`, `safe_register_player`, `safe_cancel_registration`
- `submit_player_request`, `approve_player_request`, `reject_player_request`
- `create_temporary_player`, `merge_players`
- `publish_tournament_results`, `get_public_leaderboard`

Прямой доступ к таблицам закрыт через RLS и REVOKE — все операции идут через RPC.

---

## Типичные ошибки и их причины

### `Could not find the function public.create_room(...) in the schema cache`

**Причина:** `supabase_migration.sql` не применён к PostgreSQL, или PostgREST не перезагрузил кеш схемы.

**Решение:**
```bash
# Применить миграцию
sudo -u postgres psql <DB_NAME> < supabase_migration.sql

# Если функция уже есть, но PostgREST её не видит — перезагрузить кеш:
sudo systemctl restart postgrest
# или из SQL:
SELECT pg_notify('pgrst', 'reload schema');
```

### `JWT expired` / `invalid JWT`

**Причина:** `supabaseAnonKey` не соответствует `jwt-secret` в `/etc/postgrest.conf`.

**Решение:** Пересоздать JWT с тем же секретом, обновить `config.js`.

### Функция есть, но возвращает `permission denied`

**Причина:** GRANT не выдан роли `anon` или `authenticated`.

**Решение:** Проверить секцию GRANT в `supabase_migration.sql` и перезапустить.

---

## Развёртывание сервера

Полный скрипт: `server_restore.sh`. Порядок шагов:

1. Обновление системы
2. Установка nginx, certbot
3. Установка PostgreSQL 16
4. Создание БД и ролей (`anon`, `authenticated`)
5. Восстановление бэкапа (`lpbvolley_backup_YYYYMMDD.sql`)
6. **Применение миграции** (`supabase_migration.sql`) ← обязательно после бэкапа
7. Установка PostgREST
8. Деплой сайта из GitHub
9. Настройка nginx
10. SSL через certbot

Если сервер уже развёрнут, после изменений в `supabase_migration.sql`:
```bash
sudo -u postgres psql <DB_NAME> < supabase_migration.sql
sudo systemctl restart postgrest
```

---

## Локальная разработка

```bash
node serve.mjs 8000
# или
python3 -m http.server 8000
```

Без `config.js` (или с пустыми значениями) синхронизация отключена — приложение работает только с `localStorage`.

---

## Чего НЕ делать

- Не добавлять ссылки на `supabase.com/dashboard` — у нас нет Supabase cloud
- Не предлагать Edge Functions, Supabase Auth, Supabase Storage — этого нет в стеке
- Не предлагать `supabase db push` / Supabase CLI — миграции применяются через `psql`
- Не путать `supabaseAnonKey` с anon-ключом Supabase cloud — это наш JWT для PostgREST
