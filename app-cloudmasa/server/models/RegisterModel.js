// server/models/RegisterModel.js
import mongoose from 'mongoose';

const registerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true
  },

  // OAuth identifiers
  googleId: { 
    type: String, 
    sparse: true 
  },
  githubToken: { 
    type: String 
  },

  // Authentication provider
  provider: { 
    type: String, 
    enum: ['email', 'google', 'github'], 
    default: 'email' 
  },

  // Password (required only for email/password accounts)
  password: {
    type: String,
    required: function () {
      return this.provider === 'email';
    }
  },
phone: { type: String, default: '' },

  // Role (flexible string — no enum to allow custom roles like 'devops', 'viewer', etc.)
  role: { 
    type: String, 
    default: 'user' 
  },

  // Activity tracking
  lastActive: { 
    type: Date, 
    default: null 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  },

  // Timestamp
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 🔒 Ensure uniqueness for OAuth IDs (only if present)
registerSchema.index({ googleId: 1 }, { sparse: true, unique: true });
// Note: githubToken is typically not used as a unique ID; GitHub login usually uses user ID.
// If you later store `githubId`, add: registerSchema.index({ githubId: 1 }, { sparse: true, unique: true });

const Register = mongoose.model('Register', registerSchema);
export default Register;
