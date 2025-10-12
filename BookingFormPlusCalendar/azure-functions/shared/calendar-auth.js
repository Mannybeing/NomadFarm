const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// Google Calendar Configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']; // Read-only access
const CALENDAR_ID = 'hello@nomadfarm.co'; // Specific calendar to use

let calendar;

// Initialize Google Calendar API with Workload Identity Federation
async function initializeGoogleCalendar() {
    try {

        let auth;
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Local development: use service account JSON file
            console.log('[DEBUG][AZURE FUNC] Using service account credentials from file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
            auth = new GoogleAuth({
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                scopes: SCOPES,
            });
        } else {
            // Azure: use Workload Identity Federation (Managed Identity)
            console.log('[DEBUG][AZURE FUNC] Using Workload Identity Federation (Managed Identity)');
            auth = new GoogleAuth({
                scopes: SCOPES,
            });
        }

        // Get the authenticated client
        let authClient;
        try {
            authClient = await auth.getClient();
            console.log('[DEBUG][AZURE FUNC] Google Auth client obtained');
        } catch (authErr) {
            console.error('[ERROR][AZURE FUNC] Failed to get Google Auth client:', authErr);
            throw authErr;
        }

        // Test the authentication by getting an access token
        try {
            const accessToken = await authClient.getAccessToken();
            console.log('[DEBUG][AZURE FUNC] Successfully obtained access token:', accessToken);
        } catch (tokenErr) {
            console.error('[ERROR][AZURE FUNC] Failed to get access token:', tokenErr);
            throw tokenErr;
        }

        // Initialize Calendar API
        try {
            calendar = google.calendar({ version: 'v3', auth: authClient });
            console.log('[INFO][AZURE FUNC] Google Calendar API initialized successfully with Workload Identity Federation');
        } catch (calErr) {
            console.error('[ERROR][AZURE FUNC] Failed to initialize Google Calendar API:', calErr);
            throw calErr;
        }
        return true;
    } catch (error) {
        console.error('[ERROR][AZURE FUNC] Failed to initialize Google Calendar API (outer catch):', error);
        console.error('[ERROR][AZURE FUNC] Error details:', error.message);
        if (error.stack) {
            console.error('[ERROR][AZURE FUNC] Stack trace:', error.stack);
        }
        return false;
    }
}

// Get calendar instance (initialize if needed)
async function getCalendar() {
    if (!calendar) {
        const initialized = await initializeGoogleCalendar();
        if (!initialized) {
            throw new Error('Failed to initialize Google Calendar API');
        }
    }
    return calendar;
}

// Helper function to generate 15-minute time slots
function generateTimeSlots() {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(timeString);
        }
    }

    return slots; // Returns 36 slots (9 hours × 4 slots per hour)
}

// Helper function to check if a slot conflicts with existing events
function isSlotAvailable(slotStart, slotEnd, existingEvents) {
    return !existingEvents.some(event => {
        if (!event.start || !event.end) return false;

        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);

        // Check for any overlap
        return slotStart < eventEnd && slotEnd > eventStart;
    });
}

module.exports = {
    getCalendar,
    generateTimeSlots,
    isSlotAvailable,
    CALENDAR_ID
};
