# Bytherix EAM Backend (auth foundation)

FastAPI + PostgreSQL backend for signup and login, with Argon2id password hashing.
This is Phase 1-3 of the project spec: foundation, database and identity, tenant-aware auth.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/auth/signup` | Creates user + organization + owner membership, returns a token |
| POST | `/api/v1/auth/login` | Verifies email/password, returns a token |
| GET | `/api/v1/auth/me` | Current user, organization and role (needs `Authorization: Bearer <token>`) |
| GET | `/health/live`, `/health/ready` | Liveness / database readiness |

Interactive docs: http://localhost:8000/docs

## Setup (first time)

Requirements: Python 3.11+, Docker.

```bash
# 1. virtual environment and dependencies
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. configuration
cp .env.example .env               # Windows: copy .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
#   paste the output as SECRET_KEY in .env

# 3. start PostgreSQL
docker compose up -d

# 4. create the tables (first time only: generate the migration, then apply it)
alembic revision --autogenerate -m "create auth tables"
alembic upgrade head

# 5. run the API
uvicorn app.main:app --reload
```

## Run the tests

```bash
pytest
```

Tests use a throwaway in-memory SQLite database, so they never touch your real data.

## Upgrading an existing setup (adding rate limiting)

If you already ran the first migration, add the new table:

```bash
alembic revision --autogenerate -m "add login attempts"
alembic upgrade head
```

(If you have not run any migration yet, the first autogenerate will include it.)

## Changing the database later

Never edit tables by hand. Change a model in `app/db/models/`, then:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## How a request flows

```
route (app/api/v1/auth.py)        HTTP only: parse request, return response
  -> service (app/services/)      business rules: hash password, create org, issue token
    -> repository (app/repositories/)   database queries
      -> models (app/db/models/)  table definitions
```

Keep business logic out of route handlers. Add new features the same way.

## Security notes

- Passwords are hashed with Argon2id (random salt per password). The plain password is never stored or logged.
- Login returns the same error for "unknown email" and "wrong password", and does equal work in both cases.
- The token holds only the user id. Organization and role are looked up in the database on every request.
- Validation errors never echo the submitted password back.
- Login rate limiting: after 5 failed attempts for an email (or 20 from one IP) within 15 minutes, login returns `429 TOO_MANY_ATTEMPTS` with a `Retry-After` header, even if the password is then correct. A successful login clears that email's failures. Limits are in `.env`. Failures are stored in the `login_attempts` table. Trade-off: someone can deliberately lock a victim's account for up to 15 minutes; the short window limits the damage.
- Not built yet: signup rate limiting, email verification, password reset, refresh tokens and token revocation, invitations.
