// server/models/Log.js
import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Log', LogSchema);
