// src/models/AzureSyncModel.js
import mongoose from 'mongoose';

const AzureSyncSchema = new mongoose.Schema({
  cloudConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CloudConnection', required: true },
  lastSyncedAt: Date,
  resourceCount: Number,
  status: { type: String, enum: ['idle', 'syncing', 'failed'], default: 'idle' }
}, { timestamps: true });

export default mongoose.model('AzureSync', AzureSyncSchema);
