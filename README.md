# Xeno Mini CRM - Backend API

This is the backend service for the Xeno Mini CRM application. It provides RESTful APIs for managing customers, segments, and campaigns, as well as a background processing system for message delivery and real-time updates.

## Tech Stack

- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Queue System**: BullMQ with Redis
- **Real-time Communication**: Socket.io
- **AI Integration**: Google Generative AI (for personalized campaign messages)

## Services

The backend consists of two main services:
1. **CRM API Server**: Handles standard HTTP requests for customers, audiences, and campaigns.
2. **Channel Service**: A separate worker service that processes campaign messages using BullMQ and simulates message delivery (sending, delivered, failed).

## Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in the required variables:
   ```bash
   cp .env.example .env
   ```
   *Required variables typically include `DATABASE_URL`, `REDIS_URL`, `PORT`, `CHANNEL_PORT`, and `GEMINI_API_KEY`.*

3. **Database Setup**
   Generate Prisma client, run migrations, and seed the database with initial data:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run seed
   ```

## Running the Application

You can run both services simultaneously in separate terminal windows:

**Start the CRM API Server:**
```bash
npm run dev:crm
```

**Start the Channel Worker Service:**
```bash
npm run dev:channel
```

## Useful Commands

- `npm run prisma:studio`: Open Prisma Studio to view and edit database records.
- `npm run db:reset`: Reset the database and re-seed it (Useful for development).

## Docker Support

The project includes Dockerfiles for containerized deployment:
- `Dockerfile.crm`: For the main API server.
- `Dockerfile.channel`: For the message processing worker.
