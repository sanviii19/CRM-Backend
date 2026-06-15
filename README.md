<div align="center">
  <h1>🚀 Xeno Mini CRM - Backend API</h1>
  <p>The robust, scalable, and realtime backend engine powering the Xeno Mini CRM application.</p>
</div>

<hr>

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Core Technologies](#-core-technologies)
- [Folder Structure](#-folder-structure)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Database Management](#-database-management)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Background Jobs & Messaging](#-background-jobs--messaging)
- [Real-Time WebSockets](#-real-time-websockets)
- [AI Integration](#-ai-integration)
- [Docker Deployment](#-docker-deployment)
- [Available Scripts](#-available-scripts)

---

## 🌟 Overview

The **Xeno Mini CRM Backend** is designed to handle high-volume customer data, audience segmentation, campaign generation, and simulated message delivery. It uses a modern Node.js stack with Express, backed by a PostgreSQL database managed via Prisma ORM.

Crucially, it is separated into two logical services:
1. **The CRM API Server**: Handles all standard HTTP requests (CRUD operations for customers, campaigns, segments, etc.).
2. **The Channel Service**: A worker service that consumes messages off a queue, simulates sending them, and emits real-time status updates via WebSockets.

---

## 🏗 Architecture

The backend implements a microservices-inspired pattern using BullMQ for inter-process communication:

1. **Client** makes a request to `/api/campaigns/send`.
2. **CRM API** creates campaign records in the database, generates personalized messages using Google Gemini AI, and pushes jobs into a **Redis Queue (BullMQ)**.
3. **Channel Service** picks up jobs from the queue, processes them, simulates message statuses (`SENT`, `DELIVERED`, `FAILED`), updates the database, and fires **Socket.io** events back to the client in real time.

---

## 🛠 Core Technologies

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase compatible)
- **ORM**: Prisma Client (`@prisma/client`)
- **Queue / Background Jobs**: BullMQ & Redis (`ioredis`)
- **Real-Time Communication**: Socket.io
- **AI Integration**: Google Generative AI (`@google/generative-ai`)
- **Data Validation**: Zod
- **Logging**: Winston

---

## 📂 Folder Structure

```text
CRM-Backend/
├── prisma/
│   ├── schema.prisma       # Database schema definition
│   ├── seed.js             # Initial database seeding script
│   └── migrations/         # SQL migration files
├── src/
│   ├── config/             # DB, Socket, and Env configuration
│   ├── controllers/        # Route logic & request handling
│   ├── middleware/         # Express middlewares (error handling, etc.)
│   ├── models/             # Data access layer (Prisma queries)
│   ├── routes/             # Express API routers
│   ├── services/           # Business logic (AI, Queues)
│   ├── validators/         # Zod schemas for input validation
│   ├── channel-service/    # Separate worker service for message processing
│   ├── app.js              # Express app initialization
│   └── server.js           # Main entry point for CRM API
├── .env.example            # Example environment variables
├── Dockerfile.crm          # Dockerfile for main API
├── Dockerfile.channel      # Dockerfile for worker service
├── render.yaml             # Render.com deployment configuration
└── package.json            # Dependencies and NPM scripts
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (Local or managed e.g., Supabase, Neon)
- Redis Server (Required for BullMQ)

### 1. Clone & Install
```bash
git clone <repository-url>
cd XENO-CRM/CRM-Backend
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in the required values in `.env` (See [Environment Variables](#-environment-variables)).

### 3. Database Initialization
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations to your database
npm run prisma:migrate

# Seed the database with dummy customers and orders
npm run seed
```

### 4. Start the Application

You need to run both the API and the Channel worker. Open two terminal windows:

**Terminal 1 (CRM API):**
```bash
npm run dev:crm
```

**Terminal 2 (Channel Worker):**
```bash
npm run dev:channel
```

---

## 🔐 Environment Variables

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `PORT` | Port for the main CRM API | `5000` |
| `DATABASE_URL` | Transactional DB Connection String | `postgresql://user:pass@host:5432/db` |
| `DIRECT_URL` | Direct DB connection (for migrations) | `postgresql://user:pass@host:5432/db` |
| `CHANNEL_SERVICE_URL`| URL where the Channel service runs | `http://localhost:5001` |
| `CRM_URL` | URL of the CRM API | `http://localhost:5000` |
| `GEMINI_API_KEY` | Google Gemini API Key for AI features | `AIzaSy...` |
| `NODE_ENV` | Environment mode | `development` |

*(Note: Redis connection strings may also be required depending on your `ioredis` configuration).*

---

## 🗄 Database Management

We use Prisma for database management. Here are essential commands:

- `npm run prisma:studio`: Opens a local web UI (http://localhost:5555) to view and edit database rows.
- `npm run prisma:migrate`: Applies pending migrations to the database.
- `npm run prisma:push`: Pushes schema state directly to DB (Good for rapid prototyping).
- `npm run db:reset`: Drops all tables, re-applies migrations, and runs the seed script.

---

## 📡 API Endpoints Reference

All API routes are prefixed with `/api`.

### 🩺 System & Analytics
- `GET /api/health` - Check API status.
- `GET /api/dashboard` - Get high-level stats (total customers, revenue, recent campaigns).
- `GET /api/insights` - Get deep analytics data.
- `GET /api/insights/ai-summary` - Get an AI-generated natural language summary of campaign performance (Cached for 24h to save API quota).

### 👥 Customers & Orders
- `GET /api/customers` - List all customers (supports pagination & filtering).
- `POST /api/customers` - Add a new customer.
- `GET /api/customers/:id` - Get customer details by ID.
- `GET /api/orders` - List all orders/transactions.
- `POST /api/orders` - Create a new order.

### 🎯 Segments
- `GET /api/segments` - List all saved audience segments.
- `POST /api/segments` - Create a new segment based on logical conditions (e.g., `spending > 10000 AND visits < 3`).
- `GET /api/segments/:id` - Get segment details.

### 📢 Campaigns & Delivery
- `GET /api/campaigns` - List all past and active campaigns.
- `POST /api/campaigns` - Draft a new campaign.
- `POST /api/campaigns/send` - Execute a campaign. This triggers the AI to personalize messages and queues them for delivery in the Channel service.

---

## ⚙️ Background Jobs & Messaging

When a campaign is launched, the CRM API does **not** send messages synchronously. Instead:
1. It calculates the target audience.
2. It pushes a job payload to a **BullMQ queue** via Redis.
3. The HTTP response is immediately returned to the client.
4. The **Channel Service** worker continuously listens to this queue, processes messages in batches, and randomly determines delivery success/failure for simulation.

---

## ⚡ Real-Time WebSockets

The **Channel Service** exposes a Socket.io server to provide real-time delivery metrics.

**Connection Endpoint:** Configured via `CHANNEL_SERVICE_URL` (usually port `5001`).

**Emitted Events:**
- `campaign-status-update`: Emitted every time a batch of messages changes state (e.g., from `PENDING` to `SENT`, or `SENT` to `DELIVERED`).
  - Payload: `{ campaignId, status, messagesSent, messagesFailed, ... }`

The frontend listens to these events to animate progress bars and update statistics without polling.

---

## 🤖 AI Integration

Google's **Gemini API** (`@google/generative-ai`) is tightly integrated into the workflow:
1. **Message Personalization**: When campaigns are sent, Gemini is prompted to rewrite base messages to include the customer's name and specific context.
2. **Analytics Insights**: The `/api/insights/ai-summary` endpoint feeds raw database statistics to Gemini, which returns human-readable bullet points summarizing performance trends.

---

## 🐳 Docker Deployment

The repository includes production-ready Docker setups.

Build the images:
```bash
docker build -t xeno-crm-api -f Dockerfile.crm .
docker build -t xeno-channel-worker -f Dockerfile.channel .
```

Run the containers (ensure `.env` variables are passed):
```bash
docker run -p 5000:5000 --env-file .env xeno-crm-api
docker run -p 5001:5001 --env-file .env xeno-channel-worker
```

---

## 📜 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev:crm` | `nodemon src/server.js` | Starts the CRM API with auto-reload. |
| `npm run dev:channel`| `nodemon src/channel-service/server.js`| Starts the Channel worker with auto-reload. |
| `npm run dev` | `node src/server.js` | Starts the CRM API in production mode. |
| `npm run start` | `node src/server.js` | Alias for `npm run dev`. |
| `npm run db:reset` | `prisma migrate reset ...` | Completely resets and seeds the DB. |
| `npm run seed` | `node prisma/seed.js` | Populates the DB with fake data. |

---

*Built for the Xeno Engineering Assignment - 2026.*
