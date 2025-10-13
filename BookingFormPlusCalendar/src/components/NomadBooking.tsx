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
        const credentials = {
            type: process.env.GOOGLE_TYPE,
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: process.env.GOOGLE_AUTH_URI,
            token_uri: process.env.GOOGLE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
            universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
        };

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
                orderBy: 'startTime',
                timeZone: 'America/Mexico_City'
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

            // Helper to get Mexico City offset for a date
            function getMexicoCityOffset(date) {
                // Get offset in minutes
                const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
                const mxDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
                const offsetMin = (mxDate.getTime() - utcDate.getTime()) / 60000;
                const sign = offsetMin >= 0 ? '+' : '-';
                const absMin = Math.abs(offsetMin);
                const hours = String(Math.floor(absMin / 60)).padStart(2, '0');
                const minutes = String(absMin % 60).padStart(2, '0');
                return `${sign}${hours}:${minutes}`;
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const currentDate = new Date(year, month - 1, day);
                // Skip past dates entirely (only show today and future dates)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                currentDate.setHours(0, 0, 0, 0);
                if (currentDate < today) {
                    continue;
                }
                // Determine business hours based on day of week (Mexico City time)
                const dayOfWeek = currentDate.getDay();
                let startHour, endHour;
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    // Weekend: 11am to 4pm
                    startHour = 11;
                    endHour = 16;
                } else {
                    // Weekday: 9am to 5pm
                    startHour = 9;
                    endHour = 17;
                }
                const MX_TZ_OFFSET = getMexicoCityOffset(currentDate);
                // Generate 15-minute slots for business hours
                const slots = [];
                for (let hour = startHour; hour < endHour; hour++) {
                    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
                        const slotStart = new Date(year, month - 1, day, hour, minute, 0);
                        const slotEnd = new Date(year, month - 1, day, hour, minute + SLOT_MINUTES, 0);
                        // Ensure slotEnd does not exceed endHour
                        if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) {
                            continue;
                        }
                        // Skip past slots for today (only show future time slots)
                        const currentTime = new Date();
                        if (slotStart <= currentTime) {
                            continue;
                        }
                        // Format times with Mexico City timezone offset
                        const startISO = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${MX_TZ_OFFSET}`;
                        const endHourISO = slotEnd.getHours();
                        const endMinuteISO = slotEnd.getMinutes();
                        const endISO = `${dateStr}T${String(endHourISO).padStart(2, '0')}:${String(endMinuteISO).padStart(2, '0')}:00${MX_TZ_OFFSET}`;
                        // Check against Google Calendar events for conflicts
                        const hasConflict = events.data.items?.some(event => {
                            if (!event.start?.dateTime || !event.end?.dateTime) return false;
                            const eventStart = new Date(event.start.dateTime);
                            const eventEnd = new Date(event.end.dateTime);
                            return slotStart < eventEnd && slotEnd > eventStart;
                        });
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
