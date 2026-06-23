# lychee-app

`lychee-app` is a personal blog and planning app built for Runi. It combines a cosy public website with a small owner-managed publishing workflow, user accounts, comments, travel checklists, and a Steam game tracking page.

## Features

- Public home, about, blog, travel, games, and socials pages.
- React + Vite frontend with Material UI styling.
- Flask backend with SQLite storage.
- Public registration and login.
- User profiles with avatars, display names, and about-me text.
- Blog archive grouped by date.
- Rich-text post creation and editing for the owner account.
- Comments on blog posts for signed-in users.
- Editable About page for the owner account.
- Travel overview pages with click-through checklist details.
- Owner-only travel checklist ticking, so Runi can mark items off as she goes.
- Editable Spotify page for embedding Runi's current playlist.
- Steam games page for tracking purchased games and comparing regional store prices.
- Docker Compose deployment with nginx serving the built frontend over HTTPS.

## Tech Stack

- Frontend: React, Vite, Material UI, TipTap
- Backend: Flask, SQLite, gunicorn
- Deployment: Docker Compose, nginx

## Local Development

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Docker Deployment

From the repository root:

```bash
docker compose build
docker compose up -d
```

The frontend container serves HTTPS on port `8443`, and the backend listens on port `5000`.

The compose setup expects certificate files to be mounted for nginx. Update `docker-compose.yml` and `nginx/nginx.conf` if deploying to a different domain or certificate path.

## Environment Variables

Steam tracking is optional. To enable it, provide these variables outside of git, for example in a local `.env` file:

```text
STEAM_API_KEY=your_steam_api_key
STEAM_ID=your_steam_id
```

Do not commit `.env` or production secrets. Runtime uploads, SQLite database files, certificate files, and local environment files are intentionally ignored.

## Database

The app uses SQLite and runs non-destructive startup migrations from the Flask app. Runtime database files live under `backend/instance/` and are ignored by git.

## Maintenance Scripts

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

The delete script refuses to delete the owner account, creates a database backup first, deletes the user's comments and sessions, deletes the user row, and removes their uploaded avatar file if it belongs to the app uploads folder.

## Certificate Renewal

The site uses a Let's Encrypt certificate for `lychee.blog` and `www.lychee.blog`. When it needs renewing, use the manual DNS flow that has been reliable for this deployment:

```bash
sudo docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  certbot/certbot certonly \
  --manual \
  --preferred-challenges=dns \
  -d lychee.blog -d www.lychee.blog
```

After Certbot asks for the DNS TXT records, add them in the domain provider, wait for propagation, then continue the prompt. Once renewal completes, reload the app so nginx picks up the new certificate:

```bash
docker compose down
docker compose up -d
```
