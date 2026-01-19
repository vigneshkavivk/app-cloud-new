// server/models/RegisterModel.js
import mongoose from 'mongoose';

// ❌ Remove the hardcoded ALLOWED_ROLES array
// const ALLOWED_ROLES = ['super-admin', 'admin', 'user', 'developer', 'devops', 'guest', 'viewer', 'tester'];

const registerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  githubToken: { type: String }, 
  password: { type: String, required: true },
  // ✅ Remove the enum constraint - allow any string value for role
  role: {
    type: String,
    // enum: ALLOWED_ROLES, // ❌ Removed
    default: 'user'
  },
  // ✅ ADD THESE TWO FIELDS FOR ACTIVITY TRACKING
  lastActive: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now },
});

const Register = mongoose.model('Register', registerSchema);
export default Register;