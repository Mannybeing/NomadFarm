const { getWriteCalendar, CALENDAR_ID } = require('../shared/calendar-write');

module.exports = async function (context, req) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    try {
        context.log('createBooking function called');

        const bookingData = req.body;

        // Validate booking data
        if (!bookingData.firstName || !bookingData.email || !bookingData.selectedSlot) {
            context.res = {
                status: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: firstName, email, selectedSlot'
                })
            };
            return;
        }

        // Get authenticated calendar instance for write operations
        const calendar = await getWriteCalendar();

        // Create calendar event
        const event = {
            summary: `Booking: ${bookingData.firstName} ${bookingData.lastName || ''}`.trim(),
            description: [
                `Name: ${bookingData.firstName} ${bookingData.lastName || ''}`.trim(),
                `Email: ${bookingData.email}`,
                bookingData.whatsapp ? `WhatsApp: ${bookingData.whatsapp}` : '',
                bookingData.countryCode ? `Country: ${bookingData.countryCode}` : '',
                bookingData.message ? `Message: ${bookingData.message}` : ''
            ].filter(Boolean).join('\n'),
            start: {
                dateTime: bookingData.selectedSlot.start,
                timeZone: bookingData.userTimezone || 'America/New_York'
            },
            end: {
                dateTime: bookingData.selectedSlot.end,
                timeZone: bookingData.userTimezone || 'America/New_York'
            },
            attendees: [
                {
                    email: bookingData.email,
                    displayName: `${bookingData.firstName} ${bookingData.lastName || ''}`.trim()
                }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 10 } // 10 minutes before
                ]
            }
        };

        const createdEvent = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
            sendUpdates: 'all' // Send email notifications
        });

        context.log('Booking created successfully:', createdEvent.data.id);

        context.res = {
            status: 200,
            headers,
            body: JSON.stringify({
                success: true,
                eventId: createdEvent.data.id,
                eventLink: createdEvent.data.htmlLink,
                message: 'Booking created successfully',
                booking: {
                    name: `${bookingData.firstName} ${bookingData.lastName || ''}`.trim(),
                    email: bookingData.email,
                    datetime: bookingData.selectedSlot.start,
                    timezone: bookingData.userTimezone || 'America/New_York'
                }
            })
        };

    } catch (error) {
        context.log.error('Error in createBooking:', error);
        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create booking',
                details: error.message
            })
        };
    }
};
