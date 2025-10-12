# Azure Functions + Wix Deployment Guide

This guide shows how to deploy your booking app using Azure Functions for the backend and Wix for the frontend.

## Architecture

```
Wix Website (Frontend)
    ↓ HTTPS Calls
Azure Functions (Backend APIs)
    ↓ Google Calendar API
Google Calendar
```

## Benefits of This Setup

✅ **Serverless Backend**: No server management, automatic scaling  
✅ **Cost Effective**: Pay only for function executions  
✅ **Easy Deployment**: One-command deployment to Azure  
✅ **Wix Integration**: Simple embedding in Wix  
✅ **Minimal Code Changes**: Your existing logic mostly unchanged  

## Step 1: Prepare Azure Functions

### Install Azure Functions Core Tools
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### Initialize and Test Locally
```bash
cd azure-functions
npm install
func start
```

Your functions will be available at:
- `http://localhost:7071/api/monthlyAvailability`
- `http://localhost:7071/api/createBooking`

## Step 2: Deploy to Azure

### Option A: Using Azure CLI
```bash
# Login to Azure
az login

# Create Resource Group
az group create --name nomad-booking-rg --location eastus

# Create Function App
az functionapp create \
  --resource-group nomad-booking-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name nomad-booking-functions \
  --storage-account nomadBookingStorage

# Deploy functions
func azure functionapp publish nomad-booking-functions
```

### Option B: Using VS Code Azure Extension
1. Install Azure Functions extension
2. Sign in to Azure
3. Deploy to Function App

## Step 3: Configure Environment Variables

Set these in Azure Portal > Function App > Configuration:

```
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = {"your": "credentials_json_here"}
IMPERSONATE_USER = m.salas@fractalhouse.co
```

## Step 4: Update Frontend Configuration

### Create .env file for production:
```env
REACT_APP_AZURE_FUNCTION_URL=https://nomad-booking-functions.azurewebsites.net
```

### Test the connection:
```bash
npm run build
# Test your build with the Azure Functions
```

## Step 5: Deploy to Wix

### Method 1: Wix Blocks (Recommended)
1. Build your React app: `npm run build`
2. Create a Wix Block from your component
3. Publish the block

### Method 2: HTML Embed
1. Upload your build files to a CDN
2. Create HTML embed code
3. Add to Wix page

### Method 3: Iframe
1. Host React app on Netlify/Vercel
2. Embed as iframe in Wix

## API Endpoints

After deployment, your Azure Functions will have these endpoints:

```
GET  https://nomad-booking-functions.azurewebsites.net/api/monthlyAvailability
POST https://nomad-booking-functions.azurewebsites.net/api/createBooking
```

## CORS Configuration

Azure Functions automatically handles CORS for your Wix domain. If you need custom CORS:

1. Go to Azure Portal > Function App > CORS
2. Add your Wix domain: `https://yourdomain.wixsite.com`

## Monitoring

- **Application Insights**: Automatically enabled for monitoring
- **Logs**: View in Azure Portal > Function App > Monitor
- **Metrics**: Performance and usage analytics

## Cost Estimation

Azure Functions pricing (consumption plan):
- First 1M executions: Free
- After that: $0.20 per million executions
- Memory usage: $0.000016/GB-s

For a booking app, monthly costs would typically be under $5-10.

## Troubleshooting

### Common Issues:

1. **CORS Errors**: 
   - Check Azure Functions CORS settings
   - Verify your Wix domain is allowed

2. **Calendar API Issues**:
   - Verify service account credentials
   - Check impersonation user permissions

3. **Environment Variables**:
   - Ensure all variables are set in Azure Portal
   - Restart function app after changes

### Testing:

1. Test Azure Functions directly:
```bash
curl https://nomad-booking-functions.azurewebsites.net/api/monthlyAvailability?year=2025&month=11
```

2. Test from your React app locally with Azure Functions

3. Test the full integration in Wix

## Security Considerations

- Environment variables are encrypted in Azure
- HTTPS is enforced by default
- Google service account credentials are secure
- Consider adding authentication if needed

## Next Steps

1. Deploy Azure Functions
2. Update your React app configuration
3. Test the integration
4. Deploy to Wix
5. Set up monitoring and alerts

## Support Resources

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Wix Developer Platform](https://dev.wix.com/)
- [Google Calendar API Guide](https://developers.google.com/calendar)
