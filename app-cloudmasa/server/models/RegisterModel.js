// server/models/RegisterModel.js
import mongoose from 'mongoose';

const registerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },

  // OAuth fields
  googleId: { type: String, sparse: true }, // Optional; for Google SSO
  githubToken: { type: String },            // Optional; for GitHub integration
  provider: { 
    type: String, 
    enum: ['email', 'google', 'github'],   // Optional: restrict to known providers
    default: 'email' 
  },

  // Password (required only for non-OAuth accounts)
  password: {
    type: String,
    required: function () {
      return this.provider === 'email';
    }
  },

  // Role system (flexible, no enum)
  role: { 
    type: String, 
    default: 'user' 
  },

  // Activity tracking
  lastActive: { type: Date, default: null },
  isActive: { type: Boolean, default: false },

  // Timestamp
  createdAt: { type: Date, default: Date.now }
});

// Ensure uniqueness for OAuth IDs (optional but recommended)
registerSchema.index({ googleId: 1 }, { sparse: true, unique: true });

const Register = mongoose.model('Register', registerSchema);
export default Register;
