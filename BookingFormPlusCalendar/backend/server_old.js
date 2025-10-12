const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Mock data storage (in production, use a real database)
let bookings = [];

// Google Calendar configuration (matching Python script exactly)
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'credentials.json');
const IMPERSONATE_USER = 'm.salas@fractalhouse.co';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TZ = 'America/Bogota';  // Colombian Standard Time (UTC-5)
const WORK_START = '09:00';
const WORK_END = '18:00';
const SLOT_MIN = 60;
const CALENDAR_IDS = ['primary'];

// Initialize Google Calendar API exactly like Python script
let calendar;

const initializeCalendar = async () => {
    try {
        console.log('🔑 Loading credentials from:', SERVICE_ACCOUNT_FILE);

        // Read and parse credentials
        const credentialsContent = fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8');
        const credentials = JSON.parse(credentialsContent);

        console.log('📧 Service account email:', credentials.client_email);
        console.log('👤 Impersonating user:', IMPERSONATE_USER);

        // Create credentials exactly like Python: from_service_account_file().with_subject()
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: SCOPES,
            clientOptions: {
                subject: IMPERSONATE_USER
            }
        });

        const authClient = await auth.getClient();
        calendar = google.calendar({ version: 'v3', auth: authClient });

        console.log('✅ Google Calendar API initialized successfully');
        console.log(`📅 Calendar IDs: ${CALENDAR_IDS.join(', ')}`);
        console.log(`🌍 Timezone: ${TZ}`);
        console.log(`⏰ Work window: ${WORK_START} - ${WORK_END}`);

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Google Calendar API:', error.message);
        console.error('❌ Error details:', error);
        calendar = null;
        return false;
    }
};

// Helper functions matching Python script exactly

// Convert month to UTC window (like Python month_utc_window)
const monthUtcWindow = (year, month, tzname) => {
    const lastDay = new Date(year, month, 0).getDate();

    // Create start and end dates properly in the target timezone using moment-timezone
    const startLocal = moment.tz(`${year}-${month.toString().padStart(2, '0')}-01 00:00:00`, tzname);
    const endLocal = moment.tz(`${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')} 23:59:59`, tzname);

    return [startLocal.utc().toISOString(), endLocal.utc().toISOString()];
};

// Merge overlapping intervals (like Python merge_intervals)
const mergeIntervals = (intervals) => {
    if (!intervals || intervals.length === 0) return [];

    // Sort by start time
    intervals.sort((a, b) => a[0] - b[0]);

    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const [s, e] = intervals[i];
        const [lastStart, lastEnd] = merged[merged.length - 1];

        if (s <= lastEnd) {
            // Overlapping intervals, merge them
            merged[merged.length - 1] = [lastStart, new Date(Math.max(lastEnd.getTime(), e.getTime()))];
        } else {
            // Non-overlapping interval
            merged.push([s, e]);
        }
    }

    return merged;
};

// Generate day slots (like Python generate_day_slots)
const generateDaySlots = (busyIntervalsLocal, dayStartLocal, dayEndLocal, slotMinutes) => {
    // Filter busy intervals that overlap with this day's work window
    const overlaps = [];
    for (const [bs, be] of busyIntervalsLocal) {
        if (bs < dayEndLocal && be > dayStartLocal) {
            overlaps.push([
                new Date(Math.max(bs.getTime(), dayStartLocal.getTime())),
                new Date(Math.min(be.getTime(), dayEndLocal.getTime()))
            ]);
        }
    }

    const busy = mergeIntervals(overlaps);

    // Check if a slot overlaps with any busy time
    const overlapsAny = (s, e) => {
        for (const [bs, be] of busy) {
            if (s < be && e > bs) {
                return true;
            }
        }
        return false;
    };

    const slots = [];
    const stepMs = slotMinutes * 60 * 1000;
    let cursor = dayStartLocal.getTime();
    const dayEndTime = dayEndLocal.getTime();

    while (cursor + stepMs <= dayEndTime) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor + stepMs);

        if (!overlapsAny(slotStart, slotEnd)) {
            slots.push([slotStart, slotEnd]);
        }

        cursor += stepMs;
    }

    return slots;
};

// Main function matching Python monthly_availability_payload
const monthlyAvailabilityPayload = async (year, month, userTimezone = TZ) => {
    if (!calendar) {
        console.warn('Google Calendar not available, using mock data');
        return generateMockAvailability(year, month);
    }

    try {
        console.log(`[Calendar] Fetching availability for ${year}-${month.toString().padStart(2, '0')}`);

        // 1) Get month boundaries in UTC (like Python script)
        const [timeMin, timeMax] = monthUtcWindow(year, month, userTimezone);

        console.log(`[Calendar] Time range: ${timeMin} to ${timeMax}`);
        console.log(`[Calendar] Timezone: ${userTimezone}`);
        console.log(`[Calendar] Calendar IDs: ${CALENDAR_IDS.join(', ')}`);

        // 2) FreeBusy query for entire month (single call like Python)
        const freeBusyRequest = {
            timeMin,
            timeMax,
            timeZone: userTimezone,
            items: CALENDAR_IDS.map(id => ({ id }))
        };

        console.log('[Calendar] FreeBusy request:', JSON.stringify(freeBusyRequest, null, 2));

        const response = await calendar.freebusy.query({
            requestBody: freeBusyRequest
        });

        console.log('[Calendar] FreeBusy response received');
        console.log('[Calendar] Full FreeBusy response:', JSON.stringify(response.data, null, 2));

        // 3) Collect all busy intervals and merge (like Python script)
        const busyAll = [];
        for (const calendarId of CALENDAR_IDS) {
            const calendarData = response.data.calendars[calendarId];
            if (calendarData && calendarData.busy) {
                console.log(`[Calendar] Found ${calendarData.busy.length} busy periods for ${calendarId}`);
                for (const busyPeriod of calendarData.busy) {
                    const start = new Date(busyPeriod.start);
                    const end = new Date(busyPeriod.end);
                    busyAll.push([start, end]);
                    console.log(`[Calendar] Busy: ${start.toISOString()} - ${end.toISOString()}`);
                }
            } else {
                console.log(`[Calendar] No busy periods found for ${calendarId}`);
            }
        }

        const mergedBusy = mergeIntervals(busyAll);
        console.log(`[Calendar] Total merged busy periods: ${mergedBusy.length}`);

        // Log busy periods for debugging
        mergedBusy.forEach((busy, index) => {
            console.log(`[Calendar] Busy period ${index + 1}: ${busy[0].toISOString()} - ${busy[1].toISOString()}`);
        });

        // 4) Parse work hours
        const [workStartHour, workStartMin] = WORK_START.split(':').map(Number);
        const [workEndHour, workEndMin] = WORK_END.split(':').map(Number);

        // 5) Build per-day slots within work window
        const lastDay = new Date(year, month, 0).getDate();
        const daysPayload = [];
        const events = [];

        for (let d = 1; d <= lastDay; d++) {
            // Create date properly in the target timezone for accurate day-of-week calculation
            const dayMoment = moment.tz(`${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`, userTimezone);
            const dateStr = dayMoment.format('YYYY-MM-DD');

            // Skip weekends (check day of week in the target timezone)
            const dayOfWeek = dayMoment.day(); // 0 = Sunday, 6 = Saturday

            // Debug log for specific day
            if (dateStr === '2025-10-10') {
                console.log(`🔍 Checking date ${dateStr}:`);
                console.log(`   Timezone: ${userTimezone}`);
                console.log(`   Day of week: ${dayOfWeek} (${dayMoment.format('dddd')})`);
                console.log(`   Is weekend: ${dayOfWeek === 0 || dayOfWeek === 6}`);
            }

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Skip weekends completely - don't add to response
                continue;
            }

            // Skip past dates (compare in target timezone)
            const todayInTargetTz = moment.tz(userTimezone).startOf('day');
            if (dayMoment.isBefore(todayInTargetTz)) {
                // Skip past dates completely - don't add to response
                continue;
            }            // Create work day boundaries properly in the target timezone using moment-timezone
            const dayStartMoment = moment.tz(`${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')} ${WORK_START}`, userTimezone);
            const dayEndMoment = moment.tz(`${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')} ${WORK_END}`, userTimezone);

            const dayStart = dayStartMoment.toDate();
            const dayEnd = dayEndMoment.toDate();            // Generate slots for this day
            const daySlots = generateDaySlots(mergedBusy, dayStart, dayEnd, SLOT_MIN);

            const slotObjs = daySlots.map(([start, end]) => ({
                start: start.toISOString(),
                end: end.toISOString()
            }));

            daysPayload.push({ date: dateStr, slots: slotObjs });

            // Add to events array for FullCalendar compatibility
            for (const [start, end] of daySlots) {
                events.push({
                    title: "Available",
                    start: start.toISOString(),
                    end: end.toISOString(),
                    allDay: false,
                    extendedProps: { type: "available" }
                });
            }
        }

        const payload = {
            timeZone: userTimezone,
            slotMinutes: SLOT_MIN,
            workWindow: { start: WORK_START, end: WORK_END },
            calendarsQueried: CALENDAR_IDS,
            month: `${year}-${month.toString().padStart(2, '0')}`,
            days: daysPayload,
            events: events
        };

        console.log(`[Calendar] Generated ${daysPayload.length} days with ${events.length} total available slots`);
        return payload;

    } catch (error) {
        console.error('[Calendar] Error fetching calendar data:', error.message);
        console.error('[Calendar] Full error:', error);

        // Fallback to mock data on error
        return generateMockAvailability(year, month);
    }
};

// Helper function to generate mock availability data
const generateMockAvailability = (year, month) => {
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Skip weekends for this example
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            days.push({
                date: dateStr,
                slots: []
            });
            continue;
        }

        // Generate random availability (some days have slots, some don't)
        const hasAvailability = Math.random() > 0.3; // 70% chance of having slots

        if (hasAvailability) {
            const slots = [];
            for (let hour = 9; hour < 18; hour++) {
                // Randomly skip some slots to simulate realistic availability
                if (Math.random() > 0.4) { // 60% chance for each slot
                    const startTime = new Date(year, month - 1, day, hour, 0, 0);
                    const endTime = new Date(year, month - 1, day, hour + 1, 0, 0);
                    slots.push({
                        start: startTime.toISOString(),
                        end: endTime.toISOString()
                    });
                }
            }
            days.push({ date: dateStr, slots });
        } else {
            days.push({ date: dateStr, slots: [] });
        }
    }

    return {
        timeZone: TZ,
        slotMinutes: SLOT_MIN,
        workWindow: { start: WORK_START, end: WORK_END },
        month: `${year}-${month.toString().padStart(2, '0')}`,
        days: days
    };
};

// Initialize calendar on startup
initializeCalendar().then(success => {
    if (success) {
        console.log('📅 Calendar initialization completed');
    } else {
        console.log('⚠️ Calendar initialization failed - using mock data');
    }
}).catch(error => {
    console.error('❌ Failed to initialize Google Calendar API:', error.message);
    calendar = null;
});

// API ENDPOINTS

// GET /api/monthlyAvailability
app.get('/api/monthlyAvailability', async (req, res) => {
    try {
        const { year, month, timezone } = req.query;

        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const userTimezone = timezone || TZ;

        console.log(`[API] GET /api/monthlyAvailability - Year: ${yearNum}, Month: ${monthNum}, Timezone: ${userTimezone}`);

        if (!yearNum || !monthNum || yearNum < 2020 || yearNum > 2030 || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ error: 'Invalid year or month parameters' });
        }

        const availability = await monthlyAvailabilityPayload(yearNum, monthNum, userTimezone);
        res.json(availability);

    } catch (error) {
        console.error('[API] Error in /api/monthlyAvailability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/createBooking
app.post('/api/createBooking', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            whatsapp,
            roomInterest,
            experience,
            about,
            workSchedule,
            selectedSlot
        } = req.body;

        console.log(`[API] POST /api/createBooking - Booking request from ${firstName} ${lastName}`);

        // Validate required fields
        if (!firstName || !lastName || !email || !whatsapp || !roomInterest || !experience || !selectedSlot) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate selected slot
        if (!selectedSlot.start || !selectedSlot.end) {
            return res.status(400).json({ error: 'Invalid time slot' });
        }

        // Create booking object
        const booking = {
            id: Date.now().toString(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            whatsapp: whatsapp.trim(),
            roomInterest,
            experience,
            about: about.trim(),
            workSchedule: workSchedule.trim(),
            selectedSlot,
            createdAt: new Date().toISOString(),
            status: 'confirmed'
        };

        bookings.push(booking);

        console.log(`[API] Booking created successfully:`, {
            id: booking.id,
            name: `${booking.firstName} ${booking.lastName}`,
            email: booking.email,
            slot: `${booking.selectedSlot.start} - ${booking.selectedSlot.end}`,
            totalBookings: bookings.length
        });

        // Return complete booking data as JSON
        res.status(201).json({
            success: true,
            message: 'Booking submitted successfully',
            booking: booking
        });

    } catch (error) {
        console.error('[API] Error in /api/createBooking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/bookings (bonus endpoint to view all bookings)
app.get('/api/bookings', (req, res) => {
    console.log(`[API] GET /api/bookings - Total bookings: ${bookings.length}`);
    res.json({
        bookings: bookings.map(booking => ({
            id: booking.id,
            name: `${booking.firstName} ${booking.lastName}`,
            email: booking.email,
            roomInterest: booking.roomInterest,
            experience: booking.experience,
            selectedSlot: booking.selectedSlot,
            status: booking.status,
            createdAt: booking.createdAt
        })),
        total: bookings.length
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        totalBookings: bookings.length
    });
});

// GET /api/debug/calendars (debug endpoint to list available calendars)
app.get('/api/debug/calendars', async (req, res) => {
    if (!calendar) {
        return res.status(500).json({ error: 'Google Calendar not initialized' });
    }

    try {
        const response = await calendar.calendarList.list();
        const calendars = response.data.items.map(cal => ({
            id: cal.id,
            summary: cal.summary,
            description: cal.description,
            primary: cal.primary,
            accessRole: cal.accessRole
        }));

        console.log(`[DEBUG] Available calendars:`, calendars);

        res.json({
            currentlyUsing: CALENDAR_IDS,
            availableCalendars: calendars,
            serviceAccount: 'test-sa@elaborate-hash-467616-k0.iam.gserviceaccount.com'
        });
    } catch (error) {
        console.error('[DEBUG] Error listing calendars:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[API] Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Booking Backend Server running on http://localhost:${PORT}`);
    console.log('📅 Available endpoints:');
    console.log(`   GET  /api/monthlyAvailability?year=2025&month=11`);
    console.log(`   POST /api/createBooking`);
    console.log(`   GET  /api/bookings`);
    console.log(`   GET  /health`);
    console.log('');
    console.log('💡 Ready to handle requests from React app!');
});
