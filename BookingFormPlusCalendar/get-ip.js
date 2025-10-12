const os = require('os');

function getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        const networkInterface = networkInterfaces[interfaceName];
        for (const net of networkInterface) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIPAddress();
console.log('📱 For mobile testing, update the BACKEND constant in NomadBooking.tsx to:');
console.log(`const BACKEND = "http://${localIP}:3001";`);
console.log('');
console.log('🔧 Current network information:');
console.log(`   Local IP: ${localIP}`);
console.log(`   Backend URL: http://${localIP}:3001`);
