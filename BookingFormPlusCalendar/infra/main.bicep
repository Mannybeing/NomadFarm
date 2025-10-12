targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name which is used to generate a short unique hash for each resource')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('The image name for the function app')
param functionAppImageName string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
}

// Resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// Shared resources module
module shared './shared.bicep' = {
  name: 'shared'
  scope: rg
  params: {
    location: location
    resourceToken: resourceToken
    tags: tags
  }
}

// Function app module
module functionApp './function.bicep' = {
  name: 'function'
  scope: rg
  params: {
    location: location
    resourceToken: resourceToken
    tags: tags
    appServicePlanId: shared.outputs.appServicePlanId
    storageAccountName: shared.outputs.storageAccountName
    applicationInsightsName: shared.outputs.applicationInsightsName
    functionAppImageName: functionAppImageName
  }
}

// Outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_FUNCTION_URL string = functionApp.outputs.functionAppUrl
output AZURE_FUNCTION_NAME string = functionApp.outputs.functionAppName
