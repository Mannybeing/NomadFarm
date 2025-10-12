const { google } = require('googleapis');

// Test script to check and grant calendar access
async function checkCalendarAccess() {
    try {
        // Parse the workload identity credentials
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

        // Initialize auth
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly']
        });

        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        console.log('Testing access to hello@nomadfarm.co calendar...');

        // Try to access the calendar
        const calendarInfo = await calendar.calendars.get({
            calendarId: 'hello@nomadfarm.co'
        });

        console.log('✅ SUCCESS: Can access calendar');
        console.log('Calendar Summary:', calendarInfo.data.summary);
        console.log('Calendar Timezone:', calendarInfo.data.timeZone);

        // Try to list recent events
        const events = await calendar.events.list({
            calendarId: 'hello@nomadfarm.co',
            timeMin: new Date().toISOString(),
            maxResults: 5,
            singleEvents: true,
            orderBy: 'startTime'
        });

        console.log('✅ SUCCESS: Can read events');
        console.log('Number of upcoming events:', events.data.items.length);

        return true;

    } catch (error) {
        console.error('❌ ERROR: Cannot access calendar');
        console.error('Error details:', error.message);

        if (error.code === 403) {
            console.log('\n🔐 PERMISSION ISSUE:');
            console.log('The service account technology@refined-legend-474705-j6.iam.gserviceaccount.com');
            console.log('needs to be granted access to the hello@nomadfarm.co calendar.');
            console.log('\nTo fix this:');
            console.log('1. Sign in to Google Calendar with hello@nomadfarm.co');
            console.log('2. Go to calendar Settings and sharing');
            console.log('3. Add technology@refined-legend-474705-j6.iam.gserviceaccount.com');
            console.log('4. Grant "Make changes to events" permission');
        }

        return false;
    }
}

module.exports = { checkCalendarAccess };
