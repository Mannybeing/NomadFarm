const { app } = require('@azure/functions');
const { google } = require('googleapis');

// Configuration (same as your Express app)
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TZ = 'America/Sao_Paulo';
const WORK_START = '09:00';
const WORK_END = '18:00';
const SLOT_MIN = 15;
const CALENDAR_IDS = ['hello@nomadfarm.co'];

let calendar;

// Initialize Google Calendar API
const initializeCalendar = async () => {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: SCOPES
        });

        const authClient = await auth.getClient();
        calendar = google.calendar({ version: 'v3', auth: authClient });

        console.log('✅ Google Calendar API initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Google Calendar API:', error);
        return false;
    }
};

// Helper functions (from your Express app)
const monthUtcWindow = (year, month, tzname) => {
    const lastDay = new Date(year, month, 0).getDate();
    const startLocal = new Date(year, month - 1, 1, 0, 0, 0);
    const endLocal = new Date(year, month - 1, lastDay, 23, 59, 59);
    return [startLocal.toISOString(), endLocal.toISOString()];
};

// Azure Function for Monthly Availability
app.http('monthlyAvailability', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'monthlyAvailability',
    handler: async (request, context) => {
        // CORS headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        try {
            // Initialize calendar if not already done
            if (!calendar) {
                const initialized = await initializeCalendar();
                if (!initialized) {
                    return {
                        status: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to initialize calendar' })
                    };
                }
            }

            const url = new URL(request.url);
            const year = parseInt(url.searchParams.get('year'));
            const month = parseInt(url.searchParams.get('month'));
            const timezone = url.searchParams.get('timezone') || TZ;

            if (!year || !month) {
                return {
                    status: 400,
                    headers,
                    body: JSON.stringify({ error: 'Year and month are required' })
                };
            }

            // Get UTC window for the month
            const [startTime, endTime] = monthUtcWindow(year, month, timezone);



            // Print the calendarId being used
            const calendarId = CALENDAR_IDS[0] || 'primary';
            console.log(`[DEBUG] Fetching calendar: ${calendarId}`);

            // Fetch calendar metadata (summary/name)
            let calendarSummary = null;
            try {
                const calendarMeta = await calendar.calendars.get({ calendarId });
                calendarSummary = calendarMeta.data.summary;
                console.log(`[DEBUG] Calendar summary: ${calendarSummary}`);
            } catch (metaErr) {
                console.log(`[DEBUG] Could not fetch calendar summary:`, metaErr.message);
            }

            // Fetch events from Google Calendar
            const events = await calendar.events.list({
                calendarId: calendarId,
                timeMin: startTime,
                timeMax: endTime,
                singleEvents: true,
                orderBy: 'startTime'
            });

            // Business logic constants (matching original backend)
            const WORK_START_HOUR = 9;  // 9 AM
            const WORK_END_HOUR = 18;   // 6 PM
            const SLOT_MINUTES = 15;    // 15-minute slots

            // Get current time in the user's timezone for filtering past slots
            const now = new Date();
            console.log(`[DEBUG] Current time: ${now.toISOString()}`);

            // Generate calendar days for the month with proper business logic
            const daysInMonth = new Date(year, month, 0).getDate();
            const calendarDays = [];

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const currentDate = new Date(year, month - 1, day);

                // Skip past dates entirely (only show today and future dates)
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
                currentDate.setHours(0, 0, 0, 0); // Reset to start of day for comparison

                if (currentDate < today) {
                    console.log(`[DEBUG] Skipping past date: ${dateStr}`);
                    continue; // Skip past dates entirely
                }

                // Skip weekends (Sunday = 0, Saturday = 6)
                const dayOfWeek = new Date(year, month - 1, day).getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    calendarDays.push({
                        date: dateStr,
                        slots: [] // No availability on weekends
                    });
                    continue;
                }

                // Generate 15-minute slots for business hours
                const slots = [];
                for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
                    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
                        // Create slot time with proper timezone handling
                        const slotStart = new Date(year, month - 1, day, hour, minute, 0);
                        const slotEnd = new Date(year, month - 1, day, hour, minute + SLOT_MINUTES, 0);

                        // Skip past slots for today (only show future time slots)
                        const currentTime = new Date();
                        if (slotStart <= currentTime) {
                            console.log(`[DEBUG] Skipping past slot: ${slotStart.toISOString()}`);
                            continue;
                        }

                        // Format times with timezone offset
                        const endMinute = minute + SLOT_MINUTES;
                        const endHour = endMinute >= 60 ? hour + 1 : hour;
                        const endMinuteFormatted = endMinute >= 60 ? endMinute - 60 : endMinute;

                        const startISO = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-05:00`;
                        const endISO = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinuteFormatted).padStart(2, '0')}:00-05:00`;

                        // TODO: Check against Google Calendar events for conflicts
                        // For now, we'll check if this slot conflicts with any existing events
                        const hasConflict = events.data.items?.some(event => {
                            if (!event.start?.dateTime || !event.end?.dateTime) return false;

                            const eventStart = new Date(event.start.dateTime);
                            const eventEnd = new Date(event.end.dateTime);

                            // Check if slot overlaps with this event
                            return slotStart < eventEnd && slotEnd > eventStart;
                        });

                        // Only add slot if no conflict
                        if (!hasConflict) {
                            slots.push({
                                start: startISO,
                                end: endISO
                            });
                        }
                    }
                }

                calendarDays.push({
                    date: dateStr,
                    slots: slots
                });
            }

            console.log(`[DEBUG] Generated ${calendarDays.length} calendar days`);

            // Process availability to match frontend interface
            const availability = {
                timeZone: timezone, // Frontend expects timeZone, not timezone
                days: calendarDays, // Array of DayAvailability objects expected by frontend
                calendarId,
                calendarSummary
            };

            return {
                status: 200,
                headers,
                body: JSON.stringify(availability)
            };

        } catch (error) {
            context.log('Error in monthlyAvailability:', error);
            return {
                status: 500,
                headers,
                body: JSON.stringify({ error: 'Internal server error' })
            };
        }
    }
});

// Azure Function for Creating Bookings
app.http('createBooking', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'createBooking',
    handler: async (request, context) => {
        // CORS headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        try {
            // Initialize calendar if not already done
            if (!calendar) {
                const initialized = await initializeCalendar();
                if (!initialized) {
                    return {
                        status: 500,
                        headers,
                        body: JSON.stringify({ error: 'Failed to initialize calendar' })
                    };
                }
            }

            const bookingData = await request.json();

            // Validate booking data
            if (!bookingData.firstName || !bookingData.email || !bookingData.selectedSlot) {
                return {
                    status: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields' })
                };
            }

            // Create calendar event
            const event = {
                summary: `Booking: ${bookingData.firstName} ${bookingData.lastName}`,
                description: `Email: ${bookingData.email}\nWhatsApp: ${bookingData.whatsapp}\nCountry: ${bookingData.countryCode}`,
                start: {
                    dateTime: bookingData.selectedSlot.start,
                    timeZone: bookingData.userTimezone || TZ
                },
                end: {
                    dateTime: bookingData.selectedSlot.end,
                    timeZone: bookingData.userTimezone || TZ
                }
            };

            const createdEvent = await calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            context.log('Booking created:', createdEvent.data.id);

            return {
                status: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    eventId: createdEvent.data.id,
                    message: 'Booking created successfully'
                })
            };

        } catch (error) {
            context.log('Error in createBooking:', error);
            return {
                status: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create booking' })
            };
        }
    }
});

// Handle CORS preflight requests
app.http('cors', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: '*',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
    }
});
