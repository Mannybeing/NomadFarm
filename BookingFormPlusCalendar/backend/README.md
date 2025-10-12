# Booking Backend

A simple Express.js backend server for the React booking application.

## Features

- **GET /api/monthlyAvailability** - Returns available time slots for a given month
- **POST /api/createBooking** - Creates a new booking
- **GET /api/bookings** - Lists all bookings (admin endpoint)
- **GET /health** - Health check endpoint

## Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Or start in production mode:
   ```bash
   npm start
   ```

The server will run on http://localhost:3001

## API Documentation

### Get Monthly Availability

```
GET /api/monthlyAvailability?year=2025&month=11
```

Response:
```json
{
  "timeZone": "America/New_York",
  "days": [
    {
      "date": "2025-11-03",
      "slots": [
        {
          "start": "2025-11-03T09:00:00Z",
          "end": "2025-11-03T10:00:00Z"
        }
      ]
    }
  ]
}
```

### Create Booking

```
POST /api/createBooking
```

Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "whatsapp": "+1234567890",
  "roomInterest": "Private",
  "experience": "Retreat",
  "about": "I'm interested in...",
  "workSchedule": "9-5 EST",
  "selectedSlot": {
    "start": "2025-11-03T09:00:00Z",
    "end": "2025-11-03T10:00:00Z"
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "id": "1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "selectedSlot": { ... },
    "status": "confirmed",
    "createdAt": "2025-10-06T..."
  }
}
```

## Mock Data

The server generates random availability data:
- Excludes weekends
- 70% chance of having available slots on weekdays
- Various time slots throughout the day (9-6 PM)
- Stores bookings in memory (resets on server restart)

## Environment

- **Development**: Runs on port 3001
- **CORS**: Enabled for frontend development
- **Logging**: Console logs for all API requests
