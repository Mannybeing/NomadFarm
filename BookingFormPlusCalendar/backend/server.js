const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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
const TZ = 'America/Santo_Domingo';
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

    // Create start and end dates in local timezone, then convert to UTC
    // This ensures we capture the full month in the user's timezone
    const startLocal = new Date(year, month - 1, 1, 0, 0, 0);
    const endLocal = new Date(year, month - 1, lastDay, 23, 59, 59);

    return [startLocal.toISOString(), endLocal.toISOString()];
};

// Convert UTC time to local timezone (helper function)
const convertUtcToTimezone = (utcDate, timezone) => {
    // Create a date in the target timezone
    const utcTime = utcDate.getTime();

    // Get timezone offset for the specific date (handles DST)
    const tempDate = new Date(utcTime);
    const utcOffset = tempDate.getTimezoneOffset() * 60000; // Convert to milliseconds

    // For America/New_York: UTC-4 (EDT) in summer, UTC-5 (EST) in winter
    // For America/Santo_Domingo: UTC-4 year round
    let timezoneOffset = 0;

    if (timezone === 'America/New_York') {
        // Rough DST calculation - this should ideally use a proper timezone library
        const year = tempDate.getFullYear();
        const march = new Date(year, 2, 1); // March 1st
        const november = new Date(year, 10, 1); // November 1st

        // Find second Sunday in March and first Sunday in November
        const secondSundayMarch = new Date(march.getFullYear(), march.getMonth(), 8 + (7 - march.getDay()) % 7);
        const firstSundayNov = new Date(november.getFullYear(), november.getMonth(), 1 + (7 - november.getDay()) % 7);

        if (tempDate >= secondSundayMarch && tempDate < firstSundayNov) {
            timezoneOffset = -4 * 3600000; // EDT: UTC-4
        } else {
            timezoneOffset = -5 * 3600000; // EST: UTC-5
        }
    } else if (timezone === 'America/Santo_Domingo') {
        timezoneOffset = -4 * 3600000; // AST: UTC-4 (no DST)
    }

    return new Date(utcTime + timezoneOffset);
};

// Create date in specific timezone (helper function)
const createDateInTimezone = (year, month, day, hour, minute, second, timezone) => {
    // Create date in local system timezone first
    const localDate = new Date(year, month - 1, day, hour, minute, second);

    // Adjust for target timezone
    let timezoneOffset = 0;

    if (timezone === 'America/New_York') {
        const tempDate = new Date(year, month - 1, day);
        const marchSecondSunday = new Date(year, 2, 8 + (7 - new Date(year, 2, 1).getDay()) % 7);
        const novFirstSunday = new Date(year, 10, 1 + (7 - new Date(year, 10, 1).getDay()) % 7);

        if (tempDate >= marchSecondSunday && tempDate < novFirstSunday) {
            timezoneOffset = -4 * 3600000; // EDT: UTC-4
        } else {
            timezoneOffset = -5 * 3600000; // EST: UTC-5
        }
    } else if (timezone === 'America/Santo_Domingo') {
        timezoneOffset = -4 * 3600000; // AST: UTC-4
    }

    // Convert to UTC by subtracting the timezone offset
    return new Date(localDate.getTime() - timezoneOffset);
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

// Format time in HH:MM format for display
const formatLocalTime = (date, timezone) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Generate day slots (like Python generate_day_slots)
function generateDaySlots(date, userTimezone, busyIntervals) {
    const slots = [];
    const workingHours = [9, 10, 11, 13, 14, 15, 16]; // Like Python script

    for (const hour of workingHours) {
        // Create slot in local timezone (not UTC)
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        // Check if slot conflicts with any busy period (all times are now in local timezone)
        const isConflict = busyIntervals.some(([busyStart, busyEnd]) => {
            const conflict = slotStart < busyEnd && slotEnd > busyStart;
            if (conflict) {
                console.log(`[Slot] CONFLICT DETECTED for ${formatLocalTime(slotStart, userTimezone)}-${formatLocalTime(slotEnd, userTimezone)}`);
                console.log(`[Slot] Slot: ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
                console.log(`[Slot] Busy: ${busyStart.toISOString()} - ${busyEnd.toISOString()}`);
            }
            return conflict;
        });

        if (!isConflict) {
            // Format as local time string like Python script
            const slotStartLocal = formatLocalTime(slotStart, userTimezone);
            const slotEndLocal = formatLocalTime(slotEnd, userTimezone);
            slots.push(`${slotStartLocal} - ${slotEndLocal}`);
        } else {
            console.log(`[Slot] Excluding ${formatLocalTime(slotStart, userTimezone)} - conflicts with busy period`);
        }
    }

    return slots;
}

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

        // 3) Collect all busy intervals and convert to local timezone (like Python script)
        const busyAll = [];
        for (const calendarId of CALENDAR_IDS) {
            const calendarData = response.data.calendars[calendarId];
            if (calendarData && calendarData.busy) {
                console.log(`[Calendar] Found ${calendarData.busy.length} busy periods for ${calendarId}`);
                for (const busyPeriod of calendarData.busy) {
                    // Convert UTC times to local timezone like Python script
                    const startUtc = new Date(busyPeriod.start);
                    const endUtc = new Date(busyPeriod.end);

                    // Convert to local timezone
                    const startLocal = convertUtcToTimezone(startUtc, userTimezone);
                    const endLocal = convertUtcToTimezone(endUtc, userTimezone);

                    busyAll.push([startLocal, endLocal]);
                    console.log(`[Calendar] Busy (UTC): ${startUtc.toISOString()} - ${endUtc.toISOString()}`);
                    console.log(`[Calendar] Busy (${userTimezone}): ${startLocal.toISOString()} - ${endLocal.toISOString()}`);
                }
            } else {
                console.log(`[Calendar] No busy periods found for ${calendarId}`);
            }
        }

        const mergedBusy = mergeIntervals(busyAll);
        console.log(`[Calendar] Total merged busy periods: ${mergedBusy.length}`);

        // 4) Parse work hours
        const [workStartHour, workStartMin] = WORK_START.split(':').map(Number);
        const [workEndHour, workEndMin] = WORK_END.split(':').map(Number);

        // 5) Build per-day slots within work window
        const lastDay = new Date(year, month, 0).getDate();
        const daysPayload = [];
        const events = [];

        for (let d = 1; d <= lastDay; d++) {
            const dayDate = new Date(year, month - 1, d);
            const dateStr = dayDate.toISOString().split('T')[0];

            // Skip weekends
            const dayOfWeek = dayDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                daysPayload.push({ date: dateStr, slots: [] });
                continue;
            }

            // Skip past dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dayDate < today) {
                daysPayload.push({ date: dateStr, slots: [] });
                continue;
            }

            // Generate slots for this day using the correct function signature
            console.log(`[Day] Processing ${dateStr} with ${mergedBusy.length} busy intervals`);

            // Filter busy intervals to only those that affect this specific day
            const dayStart = new Date(dayDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayBusyIntervals = mergedBusy.filter(([busyStart, busyEnd]) => {
                // Check if busy period overlaps with this day
                return busyStart < dayEnd && busyEnd > dayStart;
            });

            console.log(`[Day] Filtered to ${dayBusyIntervals.length} busy intervals for ${dateStr}`);

            // Special debugging for October 9th
            if (dateStr === '2025-10-09') {
                console.log(`\n🔍 DEBUGGING OCTOBER 9TH 2025:`);
                console.log(`📅 Day boundaries: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);
                console.log(`🔧 All merged busy intervals (${mergedBusy.length}):`);
                for (let j = 0; j < mergedBusy.length; j++) {
                    const [start, end] = mergedBusy[j];
                    const overlaps = start < dayEnd && end > dayStart;
                    console.log(`   All-busy ${j + 1}: ${start.toISOString()} - ${end.toISOString()} (overlaps: ${overlaps})`);
                }
                console.log(`🚫 Day-specific busy intervals (${dayBusyIntervals.length}):`);
            }

            for (let i = 0; i < dayBusyIntervals.length; i++) {
                const [start, end] = dayBusyIntervals[i];
                console.log(`[Day] Day-specific busy ${i + 1}: ${start.toISOString()} - ${end.toISOString()}`);
            }

            const daySlots = generateDaySlots(dayDate, userTimezone, dayBusyIntervals);

            // Convert string slots back to time objects for compatibility
            const slotObjs = daySlots.map(slot => {
                // Parse the "09:00 - 10:00" format back to start/end times
                const [startTime, endTime] = slot.split(' - ');
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);

                const start = new Date(dayDate);
                start.setHours(startHour, startMin, 0, 0);

                const end = new Date(dayDate);
                end.setHours(endHour, endMin, 0, 0);

                return {
                    start: start.toISOString(),
                    end: end.toISOString()
                };
            });

            daysPayload.push({ date: dateStr, slots: slotObjs });

            // Add to events array for FullCalendar compatibility
            for (const slotObj of slotObjs) {
                events.push({
                    title: "Available",
                    start: slotObj.start,
                    end: slotObj.end,
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
            countryCode,
            numberOfGuests,
            heardAbout,
            heardAboutOther,
            mooCode,
            firstTime,
            roomInterest,
            experience,
            paymentOption,
            alternativePricing,
            about,
            workSchedule,
            mailingList,
            selectedSlot
        } = req.body;

        console.log(`[API] POST /api/createBooking - Booking request from ${firstName} ${lastName}`);
        console.log('[API] Full booking data received:', {
            firstName,
            lastName,
            email,
            whatsapp,
            countryCode,
            numberOfGuests,
            heardAbout,
            heardAboutOther,
            mooCode,
            firstTime,
            roomInterest,
            experience,
            paymentOption,
            alternativePricing,
            about,
            workSchedule,
            mailingList,
            selectedSlot
        });

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
            countryCode,
            numberOfGuests,
            heardAbout,
            heardAboutOther,
            mooCode,
            firstTime,
            roomInterest,
            experience,
            paymentOption,
            alternativePricing,
            about: about.trim(),
            workSchedule: workSchedule.trim(),
            mailingList,
            selectedSlot,
            createdAt: new Date().toISOString(),
            status: 'confirmed'
        };

        bookings.push(booking);

        console.log(`[API] Booking created successfully:`, booking);

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
