# Seat Monitoring Backend

NestJS backend for a seat monitoring and reservation system using MQTT and real-time WebSocket communication.

## Features

- **Real-time seat monitoring** via MQTT integration with Meshtastic modules
- **WebSocket API** for real-time frontend updates
- **REST API** for layout and seat management
- **Protobuf message handling** for efficient communication
- **SQLite database** with Prisma ORM
- **Comprehensive logging** and error handling
- **Unit and E2E testing** with Jest

## Architecture

```
[Meshtastic Modules] → [MQTT Broker] → [NestJS Backend] → [WebSocket] → [Frontend]
                                            ↓
                                     [SQLite Database]
```

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_USERNAME="your_username"
MQTT_PASSWORD="your_password"
MQTT_REGION="KR"
DEFAULT_RESERVATION_MINUTES=2
PORT=3000
```

## Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# (Optional) Open Prisma Studio
npm run prisma:studio
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Endpoints

### Layout Management

- `GET /layout/init` - Get all available layouts
- `GET /layout/seats?layoutid=<id>` - Get seats in a layout
- `GET /layout/seat-status?layoutid=<id>` - Get current seat status
- `POST /layout/seat-status?layoutId=<id>&seatId=<id>` - Reserve a seat temporarily

### Module Management

- `GET /layout/modules/unassigned` - Get modules not assigned to seats
- `POST /layout/seats/:seatId/assign-module/:moduleId` - Assign module to seat
- `POST /layout/modules/:moduleId/refresh` - Request status refresh

## WebSocket Events

### Client → Server

- `subscribe-layout` - Subscribe to layout updates
- `unsubscribe-layout` - Unsubscribe from layout
- `ping` - Health check

### Server → Client

- `seat-update` - Real-time seat status changes
- `module-status-update` - Module battery/status updates
- `mqtt-status` - MQTT connection status
- `layout-status` - Current layout status

## MQTT Topics

- `msh/{REGION}/2/e/Main/#` - Device metrics (battery, uptime)
- `msh/{REGION}/2/e/SeatState/#` - Seat occupation status

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── layout/              # Layout and seat management
├── mqtt/                # MQTT service and communication
├── prisma/              # Database service
├── protobuf/            # Protobuf encoding/decoding
├── websocket/           # WebSocket gateway
└── types/               # TypeScript type definitions
```

## Module Communication

### Temporary Reservation Flow

1. Frontend sends reservation request
2. Backend sends protobuf message to module via MQTT
3. Module sets occupied state for specified duration
4. Module returns to original state after timeout

### Status Refresh Flow

1. Backend sends refresh command to module
2. Module responds with current status
3. Backend updates database and notifies subscribers

## Error Handling

- Comprehensive error logging with context
- Graceful MQTT reconnection
- WebSocket connection management
- Database transaction rollbacks
- Validation of all inputs

## Monitoring

The application provides verbose logging for:

- MQTT connection status
- Message processing
- Database operations
- WebSocket connections
- API requests

## Contributing

1. Follow TypeScript best practices
2. Add unit tests for new features
3. Update documentation
4. Use conventional commit messages
