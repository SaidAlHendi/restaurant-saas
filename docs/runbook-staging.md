# Runbook: staging on the laptop

Staging runs the same containers as production will: Postgres 16, Redis 7, the API, the outbox worker and the public
site, started by `infra/staging/docker-compose.yml`. A Cloudflare Tunnel makes it reachable from the internet with no
router changes. The two static apps (`apps/web`, `apps/admin`) are not on the laptop; they go to Cloudflare Pages.

```
Browser -> Cloudflare -> tunnel -> cloudflared -> api (3000)   api-staging.getsahtain.com
                                              \-> site (3000)  menu-staging.getsahtain.com
Browser -> Cloudflare Pages                                    app-staging / admin-staging.getsahtain.com
```

Postgres and Redis publish no ports. Nothing on the laptop listens to the network except through the tunnel.

## 1. One-time setup on the laptop (inside Ubuntu)

Needs Docker Engine and git in Ubuntu (WSL2). Do not use Docker Desktop.

```
git clone https://github.com/saidalhendi/restaurant-saas.git ~/restaurant-saas
cd ~/restaurant-saas
git checkout dev
cp infra/staging/staging.env.example infra/staging/staging.env
./infra/staging/deploy.sh gen-secrets      # paste the printed lines into staging.env
nano infra/staging/staging.env             # fill in the rest (see below)
```

If the clone asks for a login, the repository is private: use `gh auth login` or a personal access token with read
access to this one repository.

`staging.env` is git-ignored and `deploy.sh` sets it to mode 600. Back it up in your password manager; losing it means
losing the database passwords.

### Values you must fill in

| Variable | Where it comes from |
|---|---|
| passwords and JWT secrets | `deploy.sh gen-secrets` |
| `CLOUDFLARE_TUNNEL_TOKEN` | section 2 |
| `S3_*` | Cloudflare R2 bucket for images, section 3 |
| `CORS_ORIGINS`, `WEB_APP_URL`, `PUBLIC_SITE_URL` | already set to the `*-staging.getsahtain.com` names |
| Paddle, Resend, social links | optional; billing stays off while `PADDLE_API_KEY` is empty |

## 2. Cloudflare Tunnel (dashboard)

1. Cloudflare dashboard > **Zero Trust** > **Networks** > **Tunnels** > **Create a tunnel** > **Cloudflared**.
2. Name it `sahtain-staging`. On the install screen, copy only the **token** (the long string after `--token`) into
   `CLOUDFLARE_TUNNEL_TOKEN`. Do not run the install command it shows; the token is used by the container.
3. Add two public hostnames on that tunnel:

| Subdomain | Domain | Service type | URL |
|---|---|---|---|
| `api-staging` | `getsahtain.com` | HTTP | `api:3000` |
| `menu-staging` | `getsahtain.com` | HTTP | `site:3000` |

Cloudflare creates the DNS records for you. HTTPS is handled by Cloudflare.

## 3. Image storage (Cloudflare R2)

Staging runs with `NODE_ENV=production`, where the local-disk image driver is off, so images need an S3-compatible
bucket. Create an R2 bucket `sahtain-staging-media`, add a public custom domain (for example
`media-staging.getsahtain.com`), and an API token limited to that bucket. Fill `S3_ENDPOINT`, `S3_BUCKET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`. Keep this bucket separate from the backup bucket.

## 4. Start it

```
./infra/staging/deploy.sh up
./infra/staging/deploy.sh status
```

The first run builds the images (about 10 minutes on a laptop), creates the database and the four roles
(`app_owner`, `app_user`, `app_worker`, `app_admin`), applies all migrations, then starts the API, worker, site and
tunnel. `status` should print `200 {"status":"ok",...}`.

Then open `https://api-staging.getsahtain.com/v1/ready` and `https://menu-staging.getsahtain.com` from your phone on
mobile data (not home Wi-Fi) to prove it works from outside.

### Create the first platform admin (once)

```
cd infra/staging
ADMIN_PASSWORD='choose-a-long-password' docker compose --env-file staging.env exec -T \
  -e ADMIN_PASSWORD api node dist/scripts/create-admin.js --email you@example.com --name "Your Name" --role super
```

(If your shell stores history, set the password with a space before the command or use `read -s ADMIN_PASSWORD`.)

## 5. Web and admin on Cloudflare Pages

Create two Pages projects from the GitHub repository, production branch `dev` for staging.

| | `apps/web` project | `apps/admin` project |
|---|---|---|
| Custom domain | `app-staging.getsahtain.com` | `admin-staging.getsahtain.com` |
| Root directory | `/` | `/` |
| Build command | `pnpm install --frozen-lockfile && pnpm exec turbo run build --filter=@app/web` | `... --filter=@app/admin` |
| Output directory | `apps/web/dist` | `apps/admin/dist` |
| Env: `VITE_API_URL` | `https://api-staging.getsahtain.com` | same |
| Env: `VITE_PUBLIC_SITE_URL` | `https://menu-staging.getsahtain.com` | not needed |
| Env: `NODE_VERSION` | `22` | `22` |

`public/_redirects` (already in both apps) makes deep links such as `/invite/:token` work.

## 6. Survive restarts and power cuts

Containers use `restart: unless-stopped`, so they come back when Docker starts. Docker must start with Ubuntu, and
Ubuntu must start with Windows:

1. In Ubuntu, once: `sudo systemctl enable docker` (the installer usually does this already).
2. In an **administrator PowerShell** on Windows, once:
   `powershell -ExecutionPolicy Bypass -File \\wsl$\Ubuntu-24.04\home\<you>\restaurant-saas\infra\staging\windows\install-autostart.ps1`
   This registers a task that starts Ubuntu at sign-in and keeps it running, and turns off sleep on AC power.
3. Turn on automatic sign-in so it comes back with nobody at the keyboard: press Win+R, run `netplwiz`, untick
   "Users must enter a user name and password", enter your password. (Anyone with physical access can then use the
   laptop, so keep it somewhere safe.)
4. Windows Settings > Windows Update > Advanced options > Active hours: set a window that covers the hours you test.
5. BIOS: set "After power loss" to "Power on" if the Lenovo has the option.

Test it: restart Windows, wait five minutes, then open the `/v1/ready` address from your phone.

## 7. Everyday commands (in `~/restaurant-saas`)

```
./infra/staging/deploy.sh update     # pull the latest branch, rebuild, restart, run new migrations
./infra/staging/deploy.sh status
./infra/staging/deploy.sh logs api   # or worker, site, cloudflared
./infra/staging/deploy.sh down       # stop (data is kept)
```

Rolling back: `git checkout <older commit>` then `deploy.sh up`. Migrations are not reversed; keep them backward
compatible for one release.

## Known limits

- **Not production grade by design:** it is one laptop on home internet. If the laptop, power or internet fails,
  staging is down. Use the VPS for the pilot.
- **No backups yet.** Nightly encrypted dumps to R2 and the restore test are the next piece of work. Until then the
  database lives only on the laptop. Do not keep anything irreplaceable in staging.
- **No Sentry or uptime checks yet** (same follow-up).
- **Rate limits see the tunnel, not the visitor.** The API has no `trust proxy`, so per-IP limits (login, public
  forms) share one bucket behind the tunnel. Fine for testing, to be fixed before real traffic.
- **Paddle webhooks** need `https://api-staging.getsahtain.com/v1/billing/webhooks/paddle` added in the Paddle sandbox, and the sandbox
  keys in `staging.env`.
