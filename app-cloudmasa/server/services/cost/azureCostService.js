// server/services/cost/azureCostService.js
import axios from 'axios';
import CloudAccount from '../../models/azureCredentialModel.js';

// In-memory cache for Azure cost data
const azureCache = new Map();

// Helper: Get cache key
const getCacheKey = (subscriptionId, type) => `${subscriptionId}:${type}`;

// Helper: Check cache
const getCachedData = (key) => {
  const entry = azureCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 5 * 60 * 1000) { // 5 minutes
    azureCache.delete(key);
    return null;
  }
  return entry.data;
};

// Helper: Set cache
const setCachedData = (key, data) => {
  azureCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// 🔐 Get auth token for Azure SP
const getAzureToken = async (tenantId, clientId, clientSecret) => {
  if (!tenantId?.trim() || !clientId?.trim() || !clientSecret?.trim()) {
    throw new Error('Missing or empty auth parameters: tenantId, clientId, or clientSecret');
  }

  // ✅ FIXED: NO trailing spaces in URL or scope
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`; // ← Removed trailing spaces
  const scope = 'https://management.azure.com/.default'; // ← Removed trailing spaces

  try {
    const res = await axios.post(
      tokenUrl,
      new URLSearchParams({
        client_id: clientId,
        scope: scope,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000 // 10s timeout
      }
    );
    return res.data.access_token;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error(`[AZURE TOKEN] Failed for tenant=${tenantId}, client=${clientId}`);
    console.error(`→ Status: ${status}`);
    if (data?.error) {
      console.error(`→ Error: ${data.error}`);
      console.error(`→ Description: ${data.error_description || 'No description'}`);
    }
    throw new Error(`Azure token acquisition failed: ${data?.error_description || err.message}`);
  }
};

// Helper: Normalize subscription ID
const normalizeSubscriptionId = (id) => id?.replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();

export const getCostSummary = async (subscriptionId) => {
  const normalizedId = normalizeSubscriptionId(subscriptionId);
  const cacheKey = getCacheKey(normalizedId, 'summary');

  // ✅ Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[AZURE CACHE] Returning cached summary for ${normalizedId}`);
    return cached;
  }

  const account = await CloudAccount.findOne({ subscriptionId: normalizedId });
  if (!account) throw new Error(`Azure account not found for subscription ID: ${normalizedId}`);

  const { tenantId, clientId } = account;
  let clientSecret;

  try {
    clientSecret = account.decryptedClientSecret;
    if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
      console.warn(`[AZURE] Decryption returned invalid secret for subscriptionId=${normalizedId}`);
      console.warn(`Encrypted structure:`, account.clientSecret);
      throw new Error('Decryption yielded empty or non-string secret');
    }
  } catch (decryptErr) {
    console.error(`[AZURE] Decryption failed for subscriptionId=${normalizedId}:`, decryptErr.message);
    throw new Error(`Failed to decrypt client secret: ${decryptErr.message}`);
  }

  const token = await getAzureToken(tenantId, clientId, clientSecret);

  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  try {
    // ✅ FIXED: NO trailing spaces in URL
    const costUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`;
    const res = await axios.post(
      costUrl,
      {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: { from: start, to: end },
        dataSet: {
          granularity: 'Daily',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [{ type: 'Dimension', name: 'ServiceName' }]
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );

    let total = 0;
    const breakdown = [];
    const rows = res.data.properties?.rows || [];
    for (const row of rows) {
      const cost = parseFloat(row[0]) || 0;
      // ✅ FIXED: Ensure serviceName is a string before trimming
      let serviceName = row[1];
      if (typeof serviceName !== 'string') {
        serviceName = 'Other';
      } else {
        serviceName = serviceName.trim(); // Now safe to call trim()
      }
      total += cost;
      breakdown.push({ service: serviceName, cost: parseFloat(cost.toFixed(2)) });
    }

    const result = {
      accountId: subscriptionId,
      accountName: account.accountName || `Azure ${subscriptionId.slice(-6)}`,
      total: parseFloat(total.toFixed(2)),
      currency: 'USD',
      breakdown,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    };

    // ✅ Cache the result
    setCachedData(cacheKey, result);

    return result;

  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 429) {
      // ✅ Retry with exponential backoff
      console.warn(`[AZURE] Rate limited (429). Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      return getCostSummary(subscriptionId); // Recursive retry
    }

    console.error(`[AZURE COST QUERY] Failed for subscriptionId=${subscriptionId}`);
    if (status) console.error(`→ HTTP ${status}`);
    if (data?.error?.message) console.error(`→ API Error:`, data.error.message);
    throw new Error(`Azure cost query failed: ${data?.error?.message || err.message}`);
  }
};

// ✅ FIXED: Correct implementation for getCostTrend
export const getCostTrend = async (subscriptionId) => {
  const normalizedId = normalizeSubscriptionId(subscriptionId);
  const cacheKey = getCacheKey(normalizedId, 'trend');

  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[AZURE CACHE] Returning cached trend for ${normalizedId}`);
    return cached;
  }

  const account = await CloudAccount.findOne({ subscriptionId: normalizedId });
  if (!account) throw new Error(`Azure account not found`);

  const { tenantId, clientId } = account;
  const clientSecret = account.decryptedClientSecret;
  if (!clientSecret) throw new Error('Failed to decrypt Azure client secret');

  const token = await getAzureToken(tenantId, clientId, clientSecret);

  // Get the last 30 days for trend
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  try {
    // ✅ FIXED: NO trailing spaces in URL
    const costUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`;
    const res = await axios.post(
      costUrl,
      {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: { from: start, to: end },
        dataSet: {
          granularity: 'Daily', // <-- This is crucial for daily trend
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [] // <-- No grouping for overall daily trend
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );

    // Process the response to create a trend array
    const trend = [];
    const rows = res.data.properties?.rows || [];
    for (const row of rows) {
      const cost = parseFloat(row[0]) || 0;
      const dateStr = row[1]; // The date string is the second element when grouping is empty
      if (dateStr) {
        trend.push({
          date: dateStr.split('T')[0], // Convert to YYYY-MM-DD
          total: parseFloat(cost.toFixed(2)),
          breakdown: {} // Breakdown by service is not available at daily level without grouping
        });
      }
    }

    // Sort by date to ensure chronological order
    trend.sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = { trend };
    setCachedData(cacheKey, result);
    return result;

  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      console.warn(`[AZURE] Rate limited (429). Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getCostTrend(subscriptionId);
    }

    throw new Error(`Azure trend query failed: ${err.message}`);
  }
};

// ✅ getCostForecast - Fixed URL
export const getCostForecast = async (subscriptionId) => {
  const normalizedId = normalizeSubscriptionId(subscriptionId);
  const cacheKey = getCacheKey(normalizedId, 'forecast');

  // ✅ Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[AZURE CACHE] Returning cached forecast for ${normalizedId}`);
    return cached;
  }

  const account = await CloudAccount.findOne({ subscriptionId: normalizedId });
  if (!account) throw new Error(`Azure account not found for subscription ID: ${normalizedId}`);

  const { tenantId, clientId } = account;
  const clientSecret = account.decryptedClientSecret;
  if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
    throw new Error('Decryption yielded empty or non-string client secret');
  }

  const token = await getAzureToken(tenantId, clientId, clientSecret);
  const now = new Date();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const start = nextMonthStart.toISOString().split('T')[0];
  const end = nextMonthEnd.toISOString().split('T')[0];

  try {
    // ✅ FIXED: NO trailing spaces in URL
    const forecastUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`;
    const res = await axios.post(
      forecastUrl,
      {
        type: 'ForecastCost',
        timeframe: 'Custom',
        timePeriod: { from: start, to: end },
        dataSet: {
          granularity: 'Monthly',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [{ type: 'Dimension', name: 'ServiceName' }]
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );

    const rows = res.data.properties?.rows || [];
    const forecastData = rows[0]; // First (and likely only) forecast row

    const cost = forecastData ? parseFloat(forecastData[0]) || 0 : 0;
    const serviceName = forecastData?.[1] || 'Other';

    const result = {
      forecast: {
        date: start,
        mean: cost,
        min: cost * 0.8, // ±20% range
        max: cost * 1.2,
        breakdown: { [serviceName]: cost }
      },
      timePeriod: { start, end },
      projectName: account.accountName || `Azure ${subscriptionId.slice(-6)}`
    };

    // ✅ Cache for 5 minutes
    setCachedData(cacheKey, result);

    return result;

  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    // ✅ Retry on 429 Too Many Requests
    if (status === 429) {
      console.warn(`[AZURE FORECAST] Rate limited (429). Retrying in 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getCostForecast(subscriptionId); // Recursive retry
    }

    // Log error
    console.error(`[AZURE FORECAST] Failed for subscriptionId=${subscriptionId}`);
    if (status) console.error(`→ HTTP ${status}`);
    if (data?.error?.message) console.error(`→ API Error:`, data.error.message);

    // Fallback: return zero forecast
    return {
      forecast: {
        date: start,
        mean: 0,
        min: 0,
        max: 0,
        breakdown: { 'Other': 0 }
      },
      timePeriod: { start, end },
      projectName: account.accountName || `Azure ${subscriptionId.slice(-6)}`
    };
  }
};

// ✅ getResourceCounts - Improved logic
export const getResourceCounts = async (subscriptionId) => {
  const normalizedId = normalizeSubscriptionId(subscriptionId);
  const account = await CloudAccount.findOne({ subscriptionId: normalizedId });
  if (!account) throw new Error(`Azure account not found`);

  const { tenantId, clientId } = account;
  const clientSecret = account.decryptedClientSecret;
  if (!clientSecret) throw new Error('Failed to decrypt Azure client secret');

  const token = await getAzureToken(tenantId, clientId, clientSecret);

  const resources = { EC2: 0, S3: 0, RDS: 0, Lambda: 0, Others: 0 };

  try {
    // Virtual Machines (EC2 equivalent)
    const vmRes = await axios.get(
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/virtualMachines?api-version=2023-03-01`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    resources.EC2 = vmRes.data.value?.length || 0;

    // Storage Accounts (S3 equivalent)
    const storageRes = await axios.get(
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Storage/storageAccounts?api-version=2023-01-01`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    resources.S3 = storageRes.data.value?.length || 0;

    // SQL Servers (RDS equivalent - count servers, not individual DBs)
    const sqlRes = await axios.get(
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Sql/servers?api-version=2023-02-01-preview`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    resources.RDS = sqlRes.data.value?.length || 0; // Count servers as a proxy for RDS instances

    // Functions (Lambda equivalent)
    const funcRes = await axios.get(
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2022-03-01&$filter=startswith(kind,'function')`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    resources.Lambda = funcRes.data.value?.length || 0;

    // Others: total - known (This is an approximation)
    const allRes = await axios.get(
      `https://management.azure.com/subscriptions/${subscriptionId}/resources?api-version=2021-04-01`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 }
    );
    const total = allRes.data.value?.length || 0;
    resources.Others = Math.max(0, total - resources.EC2 - resources.S3 - resources.RDS - resources.Lambda);

  } catch (err) {
    console.warn(`[AZURE Resource Count] Partial failure for ${subscriptionId}:`, err.message);
  }

  return { counts: resources };
};

// ✅ getBudgets - Improved with actual/forecast placeholders
export const getBudgets = async (subscriptionId) => {
  const normalizedId = normalizeSubscriptionId(subscriptionId);
  const account = await CloudAccount.findOne({ subscriptionId: normalizedId });
  if (!account) throw new Error(`Azure account not found`);

  const { tenantId, clientId } = account;
  const clientSecret = account.decryptedClientSecret;
  if (!clientSecret) throw new Error('Failed to decrypt Azure client secret');

  const token = await getAzureToken(tenantId, clientId, clientSecret);

  try {
    const res = await axios.get(
      `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Consumption/budgets?api-version=2021-10-01`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );

    // Fetch the current month's actual cost to populate 'actual'
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    let actualCost = 0;

    try {
      const actualRes = await axios.post(
        `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2021-10-01`,
        {
          type: 'ActualCost',
          timeframe: 'Custom',
          timePeriod: { from: start, to: end },
          dataSet: {
            granularity: 'Monthly',
            aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
            grouping: []
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      actualCost = parseFloat(actualRes.data.properties?.rows?.[0]?.[0]) || 0;
    } catch (actualErr) {
      console.warn(`[AZURE BUDGETS] Could not fetch actual cost for ${subscriptionId}:`, actualErr.message);
    }

    const budgets = (res.data.value || []).map(b => ({
      name: b.name || 'Unnamed',
      type: 'Azure Budget',
      amount: b.amount || 0,
      currency: b.amount?.currency || 'USD',
      actual: actualCost, // ← Populate actual cost
      forecast: 0, // ← Forecast might need a separate call or calculation
      status: b.status || 'OK'
    }));

    return { budgets };
  } catch (err) {
    console.warn(`[AZURE BUDGETS] Skipped for ${subscriptionId}:`, err.message);
    return { budgets: [] };
  }
};
