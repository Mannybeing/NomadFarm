# Google Cloud Workload Identity Federation Setup

## Manual Setup via Google Cloud Console (Recommended)

### Step 1: Create Workload Identity Pool
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **refined-legend-474705-j6** (Project Number: 351664974953)
3. Navigate to **IAM & Admin** → **Workload Identity Federation**
4. Click **Create Pool**
5. Fill in:
   - **Pool ID**: `calendar-pool`
   - **Display name**: `Calendar Pool for Azure Integration`
   - **Description**: `Pool for Azure Function App to access Google Calendar`
6. Click **Continue**

### Step 2: Create Provider
1. In the pool you just created, click **Add Provider**
2. Select **OpenID Connect (OIDC)** as provider type
3. Fill in:
   - **Provider ID**: `azure-provider`
   - **Display name**: `Azure Calendar Pool Provider`
   - **Issuer (URL)**: `https://sts.windows.net/b011f6d0-7026-493b-9c0a-c865aadde317/`
   - **Audiences**: `https://iam.googleapis.com/projects/351664974953/locations/global/workloadIdentityPools/calendar-pool/providers/azure-provider`

### Step 3: Configure Attribute Mapping
In the same provider creation form:
1. **Attribute Mapping**:
   - `google.subject` = `assertion.sub`
   - `attribute.principal_id` = `assertion.sub`
2. **Attribute Conditions**: 
   ```
   assertion.aud == "https://iam.googleapis.com/projects/351664974953/locations/global/workloadIdentityPools/calendar-pool/providers/azure-provider"
   ```
3. Click **Save**

### Step 4: Configure Service Account Impersonation
1. Go to **IAM & Admin** → **Service Accounts**
2. Find service account: `technology@refined-legend-474705-j6.iam.gserviceaccount.com`
3. Click on the service account
4. Go to **Permissions** tab
5. Click **Grant Access**
6. Add principal: `principalSet://iam.googleapis.com/projects/351664974953/locations/global/workloadIdentityPools/calendar-pool/attribute.principal_id/39ba16c8-8215-43e1-89b7-6dd661f9d9d1`
7. Assign role: **Workload Identity User**
8. Click **Save**

### Step 5: Verify Configuration
After creating everything, you should see:
- **Pool**: `calendar-pool` in project `refined-legend-474705-j6`
- **Provider**: `azure-provider` configured for Azure OIDC
- **Service Account**: `technology@refined-legend-474705-j6.iam.gserviceaccount.com` with Workload Identity User role granted to the Azure managed identity

### 1. Create the Workload Identity Pool and Provider

```bash
# Set your project ID (CORRECTED - use the actual project ID, not project number)
PROJECT_ID="refined-legend-474705-j6"
PROJECT_NUMBER="351664974953"

# TROUBLESHOOTING: Let's check what's going on
echo "Current project: $PROJECT_ID"
gcloud config get-value project

# Check if we're in the right project and have the right permissions
gcloud projects describe $PROJECT_ID

# Try to list pools again with correct project ID
gcloud iam workload-identity-pools list --project=$PROJECT_ID --location="global" --format="table(name,displayName,state)"

# Create the workload identity pool with correct project ID
gcloud iam workload-identity-pools create calendar-pool \
    --project=$PROJECT_ID \
    --location="global" \
    --display-name="Calendar Pool for Azure Integration"

# Wait a moment for propagation
echo "Waiting 30 seconds for pool creation to propagate..."
sleep 30

# Now create the provider for Azure managed identity (note the corrected project number in the audience URL)
gcloud iam workload-identity-pools providers create-oidc azure-provider \
    --project=$PROJECT_ID \
    --location="global" \
    --workload-identity-pool="calendar-pool" \
    --display-name="Azure Calendar Pool Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.principal_id=assertion.sub" \
    --attribute-condition="assertion.aud=='https://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/calendar-pool/providers/azure-provider'" \
    --issuer-uri="https://sts.windows.net/b011f6d0-7026-493b-9c0a-c865aadde317/"
```

### 2. Grant the Workload Identity User role to the pool

```bash
# Grant the Azure managed identity permission to impersonate the service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/calendar-pool/attribute.principal_id/39ba16c8-8215-43e1-89b7-6dd661f9d9d1" \
    --role="roles/iam.workloadIdentityUser"
```

### 3. Allow the pool to impersonate the service account

```bash
# Grant permission to impersonate the specific service account
gcloud iam service-accounts add-iam-policy-binding \
    technology@refined-legend-474705-j6.iam.gserviceaccount.com \
    --project=$PROJECT_ID \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/calendar-pool/attribute.principal_id/39ba16c8-8215-43e1-89b7-6dd661f9d9d1"
```

**Note: If you used the new provider name 'azure-provider', update the Azure Function App settings to match:**

### 4. Verify the configuration

```bash
# List the workload identity pool providers
gcloud iam workload-identity-pools providers list \
    --project=$PROJECT_ID \
    --location="global" \
    --workload-identity-pool="calendar-pool"

# Check the service account IAM bindings
gcloud iam service-accounts get-iam-policy \
    technology@refined-legend-474705-j6.iam.gserviceaccount.com \
    --project=$PROJECT_ID

# Describe the specific provider to see its configuration
gcloud iam workload-identity-pools providers describe azure-provider \
    --project=$PROJECT_ID \
    --location="global" \
    --workload-identity-pool="calendar-pool"
```

### 5. Alternative: Check existing setup first

If you want to see what's currently configured before making changes:

```bash
# Check if workload identity pool exists
gcloud iam workload-identity-pools describe calendar-pool \
    --project=$PROJECT_ID \
    --location="global"

# List all providers in the pool
gcloud iam workload-identity-pools providers list \
    --project=$PROJECT_ID \
    --location="global" \
    --workload-identity-pool="calendar-pool"
```

## Key Values for Reference:

- **Azure Tenant ID**: `b011f6d0-7026-493b-9c0a-c865aadde317`
- **Azure Managed Identity Principal ID**: `39ba16c8-8215-43e1-89b7-6dd661f9d9d1`
- **Azure Managed Identity Client ID**: `1fb75841-7091-4224-a2cb-b14940c611b9`
- **Google Project ID**: `351664974953`
- **Google Service Account**: `technology@refined-legend-474705-j6.iam.gserviceaccount.com`
- **Workload Identity Pool**: `calendar-pool`
- **Provider**: `calendar-pool`

## After running these commands, the Azure Function should be able to authenticate to Google Calendar API using Workload Identity Federation.
