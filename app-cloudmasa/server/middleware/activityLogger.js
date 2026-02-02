// server/middleware/activityLogger.js
import Log from '../models/Log.js';

const activityLogger = (req, res, next) => {
  // ❌ SKIP ALL AWS ROUTES (We'll log manually in controllers)
  if (req.originalUrl.startsWith('/api/aws')) {
    return next();
  }

  // Skip logging the logs endpoint itself
  if (req.originalUrl.includes('/api/logs')) {
    return next();
  }

  const originalSend = res.send;
  res.send = function (data) {
    if (!res._logged) {
      const status = this.statusCode;
      const isSuccess = status < 400;
      const userEmail = req.user?.email || 'anonymous';
      const action = req.method;
      const resource = req.originalUrl;
      const logStatus = isSuccess ? 'Success' : 'Failed';

      // Only log non-AWS routes here
      new Log({ user: userEmail, action, resource, status: logStatus })
        .save()
        .catch(err => {
          console.error('❌ Log save error:', err.message);
        });

      res._logged = true;
    }
    return originalSend.call(this, data);
  };

  next();
};

export default activityLogger;
