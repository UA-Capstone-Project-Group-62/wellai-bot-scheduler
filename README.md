# WellAI Bot Scheduler

A production-ready Scheduling & Notification gRPC service that manages clinic appointments via Google Calendar API, persists state in PostgreSQL using Drizzle ORM, sends WhatsApp notifications via RabbitMQ, and dispatches 24h and 2h reminders before each appointment.

## Prerequisites

- Docker & Docker Compose
- Google Service Account JSON key file (for Calendar API)

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL=postgresql://wellai:wellai123@postgres:5432/wellai_scheduler
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GRPC_PORT=50051
LOG_LEVEL=info
```

### 2. Place Google Service Account key

Place your Google Service Account JSON key file in `config/service-account-key.json` (gitignored).

### 3. Configure clinics

Edit `config/clinics.json` to match your setup. Each clinic needs:

- `id` - unique identifier (used in gRPC calls)
- `name`, `address`, `phone`, `email` - clinic info
- `working_hours` - operating hours per day (supports Saturday/Sunday)
- `consultant_whatsapp_ids` - WhatsApp user IDs for consultant notifications
- `google_calendar_id` - the Google Calendar ID (use `"primary"` for your main calendar, or find a custom ID below)

**To find your Google Calendar ID:**

1. Go to [Google Calendar](https://calendar.google.com/)
2. In the left sidebar, click the **three dots (⋮)** next to your calendar name
3. Click **Settings**
4. Scroll down to **Integrate calendar**
5. Copy the **Calendar ID** (e.g., `abc123@group.calendar.google.com` or `yourname@gmail.com`)

> **Note:** If you want to use your primary calendar, you can use `"primary"` as the ID and it will work after sharing with the service account.

> **Important:** You must set up each clinic in `config/clinics.json` before using the service. The gRPC `listClinics` call returns all configured clinics, and `schedule`/`cancel` operations reference clinics by their `id`.

### 4. Start everything with Docker

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432`
- **RabbitMQ 4** on ports `5672` (AMQP) and `15672` (management UI)
- **Scheduler service** on port `50051`

The scheduler container will automatically run `db:push` on startup if the database is empty.

### 5. Verify

```bash
docker compose logs -f scheduler
```

## Google Calendar Setup

Setting up Google Calendar API requires two roles:
- **Developer**: Creates the Google Cloud project, Service Account, and shares the calendar
- **Client**: Shares their Google Calendar with the developer's service account email

### Step 1: Developer - Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New project"**
3. Name your project (e.g., "wellai-scheduler") and click **Create**
4. Make sure the new project is selected in the top bar

### Step 2: Developer - Enable Calendar API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for **"Google Calendar API"**
3. Click on it and click **Enable**

### Step 3: Developer - Create Service Account

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"Service Account"**
3. Give it a name (e.g., "scheduler-service") and description
4. Click **Create and continue**
5. Skip the optional steps, click **Done**
6. Find your new service account in the list, click on it
7. Go to the **Keys** tab
8. Click **"Add Key"** → **"JSON"**
9. The JSON key file will download automatically — rename it to `service-account-key.json` and move to `config/`

> **Troubleshooting:** If you see "An organisation policy that blocks service account keys has been enforced", you need to disable the org policy first. Go to **IAM & Admin** → **Org policies** → Search `iam.disableServiceAccountKeyCreation` → **Manage Policy** → Disable it. You need Organization Admin access for this.

### Step 4: Developer - Get Service Account Email

1. In the service account details page, copy the **Email** address (looks like: `scheduler-service@project-name.iam.gserviceaccount.com`)

### Step 5: Client - Share Google Calendar with Service Account

This step must be done by the client for **each clinic's calendar**.

1. Open [Google Calendar](https://calendar.google.com/) on the web
2. Find the calendar used for this clinic (click on the calendar name in the left sidebar)
3. Click the **three dots menu** → **Settings and sharing**
4. Under **"Share with specific people"**, click **Add people**
5. Paste the service account email from Step 4
6. Set permission to **"Make changes to events"**
7. Click **Send** (if prompted) and **Save**

> **Note:** Each clinic in `clinics.json` can have a different `google_calendar_id`. Repeat this step for each clinic's calendar.

### Step 6: Developer - Configure Service Account Email in Code

You will need the service account email to share calendars (Step 5). You can also hardcode it in your documentation for clients.

### Step 7: Place Key File

1. Place the downloaded `service-account-key.json` in the `config/` folder
2. If using Docker, the `docker-compose.yml` already mounts the `config/` folder

### Verification

The scheduler will run in **noop mode** if the Google key is missing or invalid. Check logs:

```bash
docker compose logs scheduler
```

Look for:
- `Google Calendar client initialized` — Calendar API is working
- `GOOGLE_APPLICATION_CREDENTIALS not set, Calendar API in noop mode` — Key not found
- `Service account key file not found, Calendar API in noop mode` — Wrong path

## Local Development

For local development with hot-reload:

```bash
pnpm install
docker compose up -d postgres rabbitmq
pnpm db:push
pnpm dev
```

## Database Commands

```bash
pnpm db:generate   # Generate migration files
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema (dev)
pnpm db:studio      # Open Drizzle Studio
```

## Project Structure

```
wellai-bot-scheduler/
├── src/
│   ├── lib/
│   │   ├── calendar.ts     # Google Calendar API wrapper
│   │   ├── clinics.ts      # Clinic config loader & helpers
│   │   ├── db.ts           # Drizzle ORM client
│   │   ├── env.ts          # Environment variables
│   │   ├── logger.ts       # Pino logger
│   │   └── rabbitmq.ts     # RabbitMQ connection manager
│   ├── db/
│   │   └── schema.ts       # Drizzle schema (appointments table)
│   ├── services/
│   │   └── scheduling/     # gRPC service implementations
│   └── server.ts           # gRPC server entry point
├── clinics.json             # Clinic configuration
├── docker-compose.yml       # PostgreSQL + RabbitMQ + Scheduler
├── drizzle.config.ts        # Drizzle ORM config
└── .env.example            # Environment template
```

## Available Scripts

| Command         | Description                        |
|-----------------|------------------------------------|
| `pnpm dev`      | Run in development mode (tsx)       |
| `pnpm build`    | Build TypeScript                   |
| `pnpm start`    | Run production build               |
| `pnpm db:push`  | Push schema to database            |
| `pnpm format`   | Format code with Prettier         |