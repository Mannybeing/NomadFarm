const { GoogleAuth } = require('google-auth-library');

module.exports = async function (context, req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    try {
        context.log('Testing Google Auth directly...');

        // Parse credentials
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

        // Initialize auth directly
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly']
        });

        // Try to get an access token
        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();

        context.res = {
            status: 200,
            headers,
            body: JSON.stringify({
                message: 'Google Auth test successful',
                hasToken: !!accessToken.token,
                tokenType: accessToken.token ? 'Bearer' : 'None',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        context.log.error('Google Auth test failed:', error);
        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Google Auth failed',
                details: error.message,
                stack: error.stack
            })
        };
    }
};
