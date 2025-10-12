module.exports = async function (context, req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    try {
        context.log('Debug function called');

        // Check environment variables
        const envCheck = {
            hasGoogleApplicationCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS ? process.env.GOOGLE_APPLICATION_CREDENTIALS.length : 0,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        };

        // Try to parse the credentials
        let credentialsInfo = null;
        try {
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
                credentialsInfo = {
                    type: creds.type,
                    hasAudience: !!creds.audience,
                    hasTokenUrl: !!creds.token_url,
                    hasCredentialSource: !!creds.credential_source
                };
            }
        } catch (parseError) {
            credentialsInfo = { parseError: parseError.message };
        }

        context.res = {
            status: 200,
            headers,
            body: JSON.stringify({
                message: 'Debug function working',
                environment: envCheck,
                credentials: credentialsInfo
            })
        };

    } catch (error) {
        context.log.error('Error in debug function:', error);
        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Debug function failed',
                details: error.message
            })
        };
    }
};
