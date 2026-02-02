// app.js
import express from 'express';
import cors from 'cors';
import session from 'express-session';        // ✅ Auth support
import passport from 'passport';              // ✅ OAuth support
import { configurePassport } from './config/passportConfig.js'; // ✅ Strategy setup
import { connectToDatabase } from './config/dbConfig.js';
import errorHandler from './utils/errorHandler.js';
import authenticate from './middleware/auth.js';
import activityLogger from './middleware/activityLogger.js'; // ✅ Auto logging
import { deleteArgoCDApplication } from './controllers/deploymentController.js';

// Import routes
import indexRoutes from './routes/indexRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import awsRoutes from './routes/awsRoutes.js';
import gcpRoutes from './routes/gcpRoutes.js';
import azureRoutes from './routes/azureRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import clusterRoutes from './routes/clusterRoutes.js';
import cloudconnectRoutes from './routes/cloudconnectRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import scmRoutes from './routes/scmRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import terraformRoutes from './routes/terraformRoutes.js';
import terraform from './routes/terraform.js';
import policiesRoutes from './routes/policiesRoutes.js';
import DatabaseActivity from './models/DatabaseActivityModel.js';
import supportRoutes from './routes/supportroutes.js';
import notificationRoutes from './routes/notificationsroutes.js';
import azureTerraformRoutes from './routes/azureTerraformRoutes.js';
import logRoutes from './routes/logRoutes.js'; // ✅ New logs route

// Dynamic import for default routes
const defaultRoutes = (await import('./routes/defaultRoutes.js')).default;

const app = express();

// 🔐 CORS Configuration — DYNAMIC from .env
const allowedOrigins = [
  'http://localhost:5173',
  'http://3.216.109.221:5173',
  'http://app.cloudmasa.com:5173',
  'https://app.cloudmasa.com' // ✅ Cleaned: no trailing spaces
].filter(origin => origin && origin.trim()).map(origin => origin.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Session & Passport (must come before routes)
app.use(session({
  secret: process.env.SESSION_SECRET || 'cloudmasa-session-secret-please-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());
configurePassport(passport); // Initialize strategies

// CORS & body parsers
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Route logger (for debugging)
app.use('/api', (req, res, next) => {
  console.log(`[ROUTE] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});

// 🔥 Auto activity logging middleware
app.use(activityLogger);

// Connect to DB
connectToDatabase();

// 🔥 Demo activity store (fallback UI data)
let recentActivities = [];
setInterval(() => {
  const actions = [
    "Deployed frontend to staging",
    "Pipeline failed on main branch",
    "Cluster scaled up successfully",
    "GitHub webhook received",
    "AWS credentials rotated"
  ];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  recentActivities.unshift({
    action: randomAction,
    timestamp: new Date().toISOString(),
    status: Math.random() > 0.3 ? "success" : "failed"
  });
  if (recentActivities.length > 10) recentActivities.pop();
}, 60000);

// ✅ PUBLIC ROUTES (no auth)
app.use('/api/database', terraform);

// ✅ PROTECTED & PUBLIC ROUTES
app.use('/', indexRoutes);
app.use('/api/auth', authRoutes);                    // Public (login/signup)
app.use('/api/users', userRoutes);                   // Typically protected inside
app.use('/api/aws', authenticate, awsRoutes);        // ✅ Protected
app.use('/api/gcp', gcpRoutes);                      // May contain mixed endpoints
app.use('/api/azure', azureRoutes);                  // May contain mixed endpoints
app.use('/api/account', accountRoutes);
app.use('/api/azure/terraform', azureTerraformRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/cloud-connections', cloudconnectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/deploy', deploymentRoutes);
app.use('/api/logs', logRoutes);                     // ✅ New logs endpoint
app.delete('/deploy/:toolName', deleteArgoCDApplication);

// Remaining routes
app.use('/api/connections', connectionRoutes);
app.use('/api/github', githubRoutes);
app.use('/github', githubRoutes);
app.use('/api/scm', scmRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api', inviteRoutes);
app.use('/api/terraform', terraformRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);

// Additional dashboard endpoints (protected)
app.get('/api/get-recent-activity', authenticate, (req, res) => {
  res.json(recentActivities);
});

app.get('/api/get-clusters', authenticate, (req, res) => res.json([]));
app.get('/api/get-repos', authenticate, (req, res) => res.json([]));
app.get('/api/get-aws-accounts', authenticate, (req, res) => res.json([]));
app.get('/api/get-databases', authenticate, async (req, res) => {
  try {
    const count = await DatabaseActivity.countDocuments({
      action: 'create',
      isDeploying: false
    });
    res.json(Array(count).fill({}));
  } catch (err) {
    console.error('DB count error:', err);
    res.status(500).json([]);
  }
});

// ❗ Default route LAST
app.use('/api', defaultRoutes);

// Global error handler (MUST be last)
app.use(errorHandler);

// Export
export default app;
export { recentActivities };
