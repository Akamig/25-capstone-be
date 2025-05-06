# Seat Reservation System Implementation Guide

## Overview

This guide explains how to set up and run the seat reservation system with database persistence using Prisma and SQLite3, including WebSocket functionality for real-time updates.

## Setup Instructions

### 1. Install Required Packages

```bash
npm install @prisma/client @nestjs/websockets socket.io class-validator class-transformer
npm install prisma --save-dev
```

### 2. Initialize Prisma

```bash
npx prisma init
```

### 3. Configure Your Project

1. Copy the schema.prisma file content to `prisma/schema.prisma`
2. Create the `.env` file with the database connection string
3. Copy all the provided files to their respective locations

### 4. Set Up the Database

```bash
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

### 5. Start the Application

```bash
npm run start:dev
```

## Project Structure

```
├── src/
│   ├── main.ts                      # Application entry point
│   ├── prisma/
│   │   ├── prisma.module.ts         # Prisma module configuration
│   │   └── prisma.service.ts        # Prisma service for database access
│   └── seat/
│       ├── dtos/
│       │   └── update-seat-status.dto.ts  # Data transfer objects
│       ├── interfaces/
│       │   ├── seat-metadata.interface.ts # Interfaces for seat metadata
│       │   └── seat-status.interface.ts   # Interface for seat status
│       ├── seat-status/
│       │   └── seat-status.gateway.ts     # WebSocket gateway
│       ├── seat.controller.ts       # HTTP controller for seat operations
│       ├── seat.module.ts           # Seat module configuration
│       └── seat.service.ts          # Service for seat operations
├── prisma/
│   └── schema.prisma                # Prisma schema
└── .env                             # Environment variables
```

## API Endpoints

### REST Endpoints

- `GET /seat/metadata` - Get seat metadata (layouts, positions)
- `GET /seat/status` - Get all seat statuses
- `POST /seat/status/:seatId` - Update seat status
  - Body: `{ "occupied": boolean }`

### WebSocket Events

- **Client to Server**:

  - `request-updates` - Subscribe to seat updates
  - `update-seat` - Update a seat status with payload `{ seatId: string, occupied: boolean }`

- **Server to Client**:
  - `initial-status` - Sent when a client connects, contains all seat statuses
  - `seat-update` - Sent when a seat status changes
  - `subscription-success` - Confirmation of subscription to updates
  - `error` - Error message if something fails

## Database Schema

The database consists of four main tables:

- `SeatRoom` - Contains information about rooms with seats
- `SeatLayout` - Defines different layouts for rooms
- `SeatPosition` - Stores position information for seats in layouts
- `Seat` - Stores the actual seat status (occupied/free)

## Architecture Design

1. **Database Layer**: Prisma ORM provides type-safe database access
2. **Service Layer**: SeatService handles business logic and data persistence
3. **Controller Layer**: REST API endpoints for CRUD operations
4. **WebSocket Layer**: Real-time notifications for seat status changes

## Data Flow

1. When a seat status changes (via REST or WebSocket):

   - Data is persisted to the database via Prisma
   - An event is emitted via RxJS Subject
   - WebSocket gateway broadcasts the update to all subscribed clients

2. When a new client connects:
   - Initial seat statuses are sent to the client
   - Client can subscribe to real-time updates
