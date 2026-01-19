// server/controllers/cost/gcpCostController.js
import {
  getCostSummary,
  getCostTrend,
  getCostForecast,
  getResourceCounts,
  getBudgets
} from '../../services/cost/gcpCostService.js';

// Helper: Safe string extraction
const getString = (val) => (val && typeof val === 'string' ? val.trim() : '');

// ✅ getCostData — main cost summary endpoint
export const getCostData = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const data = await getCostSummary(projectId);
    return res.json(data);
  } catch (err) {
    console.error(`[GCP COST SUMMARY] Project: ${req.query.projectId}`, err);
    const msg = err.message || 'GCP cost summary fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    if (msg.includes('missing')) return res.status(400).json({ error: msg });
    return res.status(500).json({ error: 'GCP cost summary unavailable' });
  }
};

// ✅ getTrend — handles granularity safely
export const getTrend = async (req, res) => {
  try {
    const { projectId, granularity } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const gran = getString(granularity) || 'DAILY';
    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(gran.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid granularity. Use DAILY, WEEKLY, or MONTHLY' });
    }
    const data = await getCostTrend(projectId, gran);
    return res.json(data);
  } catch (err) {
    console.error(`[GCP TREND] Project: ${req.query.projectId}`, err);
    const msg = err.message || 'GCP trend fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'GCP trend data unavailable' });
  }
};

// ✅✅✅ getForecast — resilient (won’t crash if budgets fail)
export const getForecast = async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  try {
    // 🔹 Forecast (critical path)
    let forecastData;
    try {
      forecastData = await getCostForecast(projectId);
    } catch (forecastErr) {
      console.warn(`[GCP FORECAST] Partial failure for ${projectId}:`, forecastErr.message);
      forecastData = {
        projectId,
        projectName: `Project ${projectId}`,
        forecast: [],
        timePeriod: { start: '', end: '' },
      };
    }

    // 🔹 Budgets (optional — don’t break if missing)
    let budgetsData = [];
    try {
      const budgets = await getBudgets(projectId);
      budgetsData = budgets.budgets || [];
    } catch (budgetsErr) {
      console.warn(`[GCP BUDGETS] Skipped for ${projectId}:`, budgetsErr.message);
    }

    // ✅ Unified response
    return res.json({
      success: true,
      forecast: forecastData.forecast,
      forecastPeriod: forecastData.timePeriod,
      budgets: budgetsData,
      projectName: forecastData.projectName,
      projectId: forecastData.projectId,
    });

  } catch (err) {
    console.error(`[GCP FORECAST API] Critical error for ${projectId}:`, err);
    const msg = err.message || 'Unexpected error';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'GCP forecast service unavailable' });
  }
};

// ✅ getAccountBudgets — standalone budgets endpoint
export const getAccountBudgets = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const data = await getBudgets(projectId);
    return res.json(data);
  } catch (err) {
    console.error(`[GCP BUDGETS API] Project: ${req.query.projectId}`, err);
    const msg = err.message || 'GCP budgets fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'GCP budget data unavailable' });
  }
};

// ✅ getResourceCount
export const getResourceCount = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const data = await getResourceCounts(projectId);
    return res.json(data);
  } catch (err) {
    console.error(`[GCP RESOURCES] Project: ${req.query.projectId}`, err);
    const msg = err.message || 'GCP resource count fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'GCP resource data unavailable' });
  }
};
