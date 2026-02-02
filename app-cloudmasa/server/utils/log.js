// server/utils/logger.js
import Log from '../models/Log.js';

// Pad string to specific length for alignment
const pad = (str, len) => {
  return (str + ' '.repeat(len)).slice(0, len);
};

const logAction = async (user, action, resource, status = 'Success') => {
  try {
    // Normalize user
    const safeUser = (typeof user === 'string' && user.trim() !== '')
      ? user.trim()
      : (typeof user === 'object' && user?.email)
        ? user.email
        : 'anonymous';

    // Save to MongoDB
    const logEntry = new Log({
      user: safeUser,
      action: action || 'Unknown Action',
      resource: resource || 'N/A',
      status: ['Success', 'Failed'].includes(status) ? status : 'Success',
      timestamp: new Date()
    });
    await logEntry.save();

    // ✨ EXACT UI TABLE FORMAT IN TERMINAL ✨
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }); // "4:16 PM" → "04:16 PM"

    const statusEmoji = status === 'Success' ? '✅ Success' : '❌ Failed';
    
    // Header (only once - first log)
    if (!global.logHeaderPrinted) {
      console.log('\n' + '='.repeat(120));
      console.log(
        pad('Time', 12) + 
        pad('User', 30) + 
        pad('Action', 30) + 
        pad('Resource', 35) + 
        'Status'
      );
      console.log('─'.repeat(120));
      global.logHeaderPrinted = true;
    }

    // Log row
    console.log(
      pad(timeFormatted, 12) + 
      pad(safeUser, 30) + 
      pad(action, 30) + 
      pad(resource, 35) + 
      statusEmoji
    );
    
  } catch (err) {
    console.error('❌ LOG SAVE FAILED:', err.message);
  }
};

export default logAction;
