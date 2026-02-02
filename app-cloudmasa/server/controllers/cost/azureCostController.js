// controllers/cost/azureCostController.js
import {
  getCostSummary,
  getCostTrend,
  getCostForecast,
  getResourceCounts,
  getBudgets
} from '../../services/cost/azureCostService.js';


export const getCostData = async (req, res) => {
  try {
    const { subscriptionId } = req.query;
    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });
    const data = await getCostSummary(subscriptionId);
    res.json(data);
  } catch (err) {
    console.error('[AZURE COST]', err);
    return res.status(500).json({ error: err.message || 'Azure cost fetch failed' });
  }
};

// Repeat for getTrend, getForecast, getResourceCount, getAccountBudgets
export const getTrend = async (req, res) => { /* ... */ };
export const getForecast = async (req, res) => { /* ... */ };
export const getResourceCount = async (req, res) => { /* ... */ };
export const getAccountBudgets = async (req, res) => { /* ... */ };  
