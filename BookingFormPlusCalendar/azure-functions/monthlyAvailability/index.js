const { getCalendar, generateTimeSlots, isSlotAvailable, CALENDAR_ID } = require('../shared/calendar-auth');

module.exports = async function (context, req) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    try {
        context.log('monthlyAvailability function called');

        // Get query parameters
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        const timezone = req.query.timezone || 'America/New_York';

        if (!year || !month) {
            context.res = {
                status: 400,
                headers,
                body: JSON.stringify({ error: 'Year and month are required' })
            };
            return;
        }

        // Get authenticated calendar instance
        const calendar = await getCalendar();

        // Calculate date range for the month
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        // Fetch events from Google Calendar
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startOfMonth.toISOString(),
            timeMax: endOfMonth.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.data.items || [];
        const timeSlots = generateTimeSlots();
        const availabilityData = [];

        // Generate availability for each day of the month
        const currentDay = new Date(startOfMonth);
        const now = new Date();

        while (currentDay <= endOfMonth) {
            // Skip past dates entirely (only show today and future dates)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayStart = new Date(currentDay);
            dayStart.setHours(0, 0, 0, 0);

            if (dayStart < today) {
                currentDay.setDate(currentDay.getDate() + 1);
                continue;
            }

            // Skip weekends (Sunday = 0, Saturday = 6)
            const dayOfWeek = currentDay.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                availabilityData.push({
                    date: currentDay.toISOString().split('T')[0],
                    slots: [] // No availability on weekends
                });
                currentDay.setDate(currentDay.getDate() + 1);
                continue;
            }

            // Generate 15-minute slots for business hours
            const daySlots = [];

            timeSlots.forEach(timeSlot => {
                const [hours, minutes] = timeSlot.split(':');
                const slotStart = new Date(currentDay);
                slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + 15);

                // Skip past slots for today
                if (slotStart <= now) {
                    return;
                }

                // Check if slot is available
                if (isSlotAvailable(slotStart, slotEnd, events)) {
                    daySlots.push({
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString(),
                        time: timeSlot,
                        available: true
                    });
                }
            });

            if (daySlots.length > 0) {
                availabilityData.push({
                    date: currentDay.toISOString().split('T')[0],
                    slots: daySlots
                });
            }

            currentDay.setDate(currentDay.getDate() + 1);
        }

        context.res = {
            status: 200,
            headers,
            body: JSON.stringify({
                days: availabilityData,
                timeZone: timezone,
                totalDays: availabilityData.length,
                totalSlots: availabilityData.reduce((sum, day) => sum + day.slots.length, 0)
            })
        };

    } catch (error) {
        context.log.error('Error in monthlyAvailability:', error);
        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch availability',
                details: error.message
            })
        };
    }
};
