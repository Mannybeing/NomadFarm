const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// Google Calendar Configuration for write operations
const WRITE_SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CALENDAR_ID = 'hello@nomadfarm.co';

let writeCalendar;

// Initialize Google Calendar API with write permissions
async function initializeWriteCalendar() {
    try {
        // Parse the workload identity credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

        // Initialize Google Auth with workload identity federation
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: WRITE_SCOPES,
        });

        // Get the authenticated client
        const authClient = await auth.getClient();

        // Initialize Calendar API
        writeCalendar = google.calendar({ version: 'v3', auth: authClient });

        console.log('[INFO] Google Calendar API initialized successfully with write permissions');
        return true;
    } catch (error) {
        console.error('[ERROR] Failed to initialize Google Calendar API for write operations:', error);
        return false;
    }
}

// Get calendar instance for write operations
async function getWriteCalendar() {
    if (!writeCalendar) {
        const initialized = await initializeWriteCalendar();
        if (!initialized) {
            throw new Error('Failed to initialize Google Calendar API for write operations');
        }
    }
    return writeCalendar;
}

module.exports = {
    getWriteCalendar,
    CALENDAR_ID
};
