// server/services/cost/gcpCostService.js
import { GoogleAuth } from 'google-auth-library';
import { BigQuery } from '@google-cloud/bigquery';
import axios from 'axios';
import CloudAccount from '../../models/GcpConnection.js';

// ✅ getCostSummary — fully implemented
export const getCostSummary = async (projectId) => {
  const account = await CloudAccount.findOne({ 
    'gcpDetails.projectId': projectId 
  }).lean();

  if (!account?.gcpDetails?.serviceAccountKey) {
    throw new Error('GCP service account key missing for project: ' + projectId);
  }

  const credentials = JSON.parse(account.gcpDetails.serviceAccountKey);

  // 🔹 Trim trailing spaces in scopes & URLs (critical!)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-billing'] // ← no trailing space!
  });

  const accessToken = await auth.getAccessToken();

  // Optional: verify billing account linkage (fallback logic preserved)
  try {
    const billingRes = await axios.get(
      'https://cloudbilling.googleapis.com/v1/billingAccounts', // ← no trailing space!
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000
      }
    );

    const openAccounts = billingRes.data.billingAccounts?.filter(ba => ba.open) || [];
    if (openAccounts.length === 0) {
      throw new Error('No open billing accounts found');
    }
    // (We don’t strictly need project ↔ billing mapping for cost summary if BQ export exists)
  } catch (err) {
    console.warn(`[GCP] Billing API check failed (proceeding with BQ):`, err.message);
  }

  // 🔹 BigQuery cost breakdown
  try {
    const bq = new BigQuery({ credentials });

    const [rows] = await bq.query({
      query: `
        SELECT
          COALESCE(service.description, 'Other') AS service,
          SUM(cost) AS cost
        FROM \`${account.gcpDetails.billingDataset}.gcp_billing_export_v1_*\`
        WHERE
          project.id = @projectId
          AND usage_start_time >= TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), MONTH)
          AND cost IS NOT NULL
        GROUP BY service
        ORDER BY cost DESC
      `,
      params: { projectId },
      timeoutMs: 30000
    });

    let total = 0;
    const breakdown = rows.map(r => {
      const costVal = parseFloat(r.cost) || 0;
      total += costVal;
      return {
        service: r.service || 'Other',
        cost: parseFloat(costVal.toFixed(2))
      };
    });

    return {
      accountId: projectId,
      accountName: account.accountName || `GCP ${projectId.slice(0, 8)}...`,
      total: parseFloat(total.toFixed(2)),
      currency: 'USD',
      breakdown,
      month: new Date().toISOString().slice(0, 7)
    };

  } catch (bqErr) {
    console.error('[GCP BigQuery] Query failed:', bqErr.message);
    return {
      accountId: projectId,
      accountName: account.accountName || `GCP ${projectId.slice(0, 8)}...`,
      total: 0,
      currency: 'USD',
      breakdown: [{ service: 'Other', cost: 0 }],
      month: new Date().toISOString().slice(0, 7),
      error: 'BigQuery export not configured or query failed'
    };
  }
};

// ✅ All required controller imports — export stubs (replace with real logic later)
export const getCostTrend = async (projectId, granularity = 'DAILY') => {
  console.warn(`[GCP STUB] getCostTrend called for ${projectId}, gran=${granularity}`);
  return {
    projectId,
    trend: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      cost: (Math.random() * 100).toFixed(2)
    })).reverse(),
    granularity
  };
};

export const getCostForecast = async (projectId) => {
  console.warn(`[GCP STUB] getCostForecast called for ${projectId}`);
  return {
    projectId,
    projectName: `Project ${projectId}`,
    forecast: [
      { month: '2026-02', cost: 120.50 },
      { month: '2026-03', cost: 130.75 },
      { month: '2026-04', cost: 125.00 }
    ],
    timePeriod: {
      start: '2026-02-01',
      end: '2026-04-30'
    }
  };
};

export const getResourceCounts = async (projectId) => {
  console.warn(`[GCP STUB] getResourceCounts called for ${projectId}`);
  return {
    projectId,
    resources: {
      compute: 5,
      storage: 12,
      network: 3,
      databases: 2
    }
  };
};

export const getBudgets = async (projectId) => {
  console.warn(`[GCP STUB] getBudgets called for ${projectId}`);
  return {
    budgets: [],
    projectId
  };
};
