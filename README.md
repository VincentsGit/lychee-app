# lychee v2

This is `runi-app-v2`, a second version of the lychee blog app.

It keeps the same deployment infrastructure as v1:

- React + Vite frontend
- Flask + SQLite backend
- Nginx serving the built frontend over HTTPS
- Docker Compose deployment
- Existing Let's Encrypt certificate mounts for `lychee.blog`
- Copied `backend/instance/app.db` and uploaded files from v1

## What changed in v2

- Modernised responsive UI with the same lavender/orange palette and playful art direction.
- Scroll reveal animations for page sections.
- Richer home page with clearer purpose and developer credit.
- Blog archive grouped by year and month.
- Editable About page for the `runitrench` account.
- Public registration and login.
- User settings page with avatar, display name, and about-me fields.
- Public user profile pages at `/users/:id`.
- Comments on blog posts for registered users.
- Non-destructive database migrations run automatically when Flask starts.

## Deploy

From this directory:

```bash
docker compose build
docker compose up -d
```

The frontend listens on HTTPS port `8443`, matching v1. If v1 is already running on the same machine, stop it first or change one app's port mapping.

The compose file still mounts:

```text
/etc/letsencrypt/live/lychee.blog/fullchain.pem
/etc/letsencrypt/live/lychee.blog/privkey.pem
```

so the existing DNS and certificate setup can continue to be used.

## Database

The copied SQLite database is stored at:

```text
backend/instance/app.db
```

On first v2 request, Flask adds the new columns/tables needed for profiles, editable pages, and comments without dropping existing users or blog posts.

## User cleanup scripts

List users:

```bash
./scripts/list-users.sh
```

Delete a user by ID:

```bash
./scripts/delete-user-by-id.sh 12
```

For non-interactive deletion:

```bash
./scripts/delete-user-by-id.sh 12 --yes
```

The delete script refuses to delete `runitrench`, creates a database backup first, deletes the user's comments and sessions, deletes the user row, and removes their uploaded avatar file if it belongs to the app uploads folder.
