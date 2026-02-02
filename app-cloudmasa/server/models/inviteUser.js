import mongoose from 'mongoose';
import crypto from 'crypto';

const inviteUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  workspace: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true 
  },
  invitedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'expired', 'revoked', 'failed'], 
    default: 'pending' 
  },
  inviteToken: { 
    type: String, 
    unique: true,
    required: true 
  },
  used: { 
    type: Boolean, 
    default: false 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
});

// ✅ CORRECT: pre('validate') hook - NO next() parameter
inviteUserSchema.pre('validate', function() {
  if (!this.inviteToken) {
    this.inviteToken = crypto.randomBytes(32).toString('hex');
  }
});

export default mongoose.model('InviteUser', inviteUserSchema);

