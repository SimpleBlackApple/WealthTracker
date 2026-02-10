# Azure Resource Cleanup (Stop All WealthTracker Azure Costs)

This guide removes the Azure resources created by the previous Azure Container Apps deployment setup.

Primary goal: delete everything billable and verify no residual resources remain.

## Scope this guide assumes

From your previous CD config, these were used:

- Resource Group: `wealthtracker-rg`
- Container Apps Environment: `wealthtracker-env`
- Container Apps:
  - `wealthtracker-api`
  - `wealthtracker-web`
  - `wealthtracker-market-data`
- Container Apps Job: `wealthtracker-warmup`
- Azure Container Registry: `wealthtrackeracr1234`
- Log Analytics workspace (inside the same resource group)

If all of these are inside one resource group, deleting the resource group is the cleanest and cheapest path.

## Step 1: Confirm the active subscription

- Purpose: prevent deleting resources in the wrong subscription.

```bash
az login
az account show --output table
```

If needed, set subscription explicitly:

```bash
az account set --subscription "<SUBSCRIPTION_ID_OR_NAME>"
```

## Step 2: Verify what exists in the resource group

- Purpose: double-check deletion scope before destructive action.

```bash
az group show --name wealthtracker-rg --output table
az resource list --resource-group wealthtracker-rg --output table
```

## Step 3: Delete the resource group

- Purpose: remove all billable resources in one operation.

```bash
az group delete --name wealthtracker-rg --yes --no-wait
```

Track status:

```bash
az group exists --name wealthtracker-rg
```

When this returns `false`, the group is fully removed.

## Step 4: Verify no leftover Azure resources

- Purpose: ensure there are no hidden charges from stragglers.

```bash
az group list --query "[].name" --output table
az acr list --query "[].name" --output table
az monitor log-analytics workspace list --query "[].name" --output table
```

If any WealthTracker-named resource remains, delete it explicitly.

## Step 5: Delete the GitHub Actions Service Principal (if created)

- Purpose: remove unused credentials and reduce security exposure.

Find it:

```bash
az ad sp list --display-name "wealthtracker-github-actions" --query "[].{displayName:displayName,appId:appId,id:id}" --output table
```

Delete by `appId`:

```bash
az ad sp delete --id <APP_ID>
```

Optional cleanup of app registration (if still present):

```bash
az ad app delete --id <APP_ID>
```

## Step 6: Remove Azure-related GitHub secrets

- Purpose: avoid accidental redeploys and reduce credential sprawl.

In GitHub repo settings, remove:

- `AZURE_CREDENTIALS`
- `NEON_CONNECTION_STRING` (only if you are rotating and replacing it)
- `UPSTASH_REDIS_URL` / related Azure-era secrets you no longer use

Also disable/remove old Azure workflow files if you no longer want Azure CD.

## Step 7: Cost verification

- Purpose: confirm billing dropped after cleanup.

In Azure Portal:

- Cost Management + Billing -> Cost analysis
- Filter by subscription and current month
- Confirm no active spend from deleted resource group

## Notes

- Resource provider registrations (`Microsoft.App`, etc.) are subscription metadata, not billable resources.
- Resource group deletion is asynchronous; final removal can take several minutes.
- If any resources were created outside `wealthtracker-rg`, you must delete those separately.

## References

- Azure CLI `az group delete`: https://learn.microsoft.com/en-us/cli/azure/group?view=azure-cli-latest#az-group-delete
- Azure CLI `az resource list`: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest#az-resource-list
- Azure CLI `az ad sp delete`: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-delete
- Azure CLI `az ad app delete`: https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest#az-ad-app-delete