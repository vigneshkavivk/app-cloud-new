// server/models/DeploymentModel.js
import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema({
  selectedTool: { type: String, required: true },
  selectedCluster: { type: String, required: true },
  resourceGroup: { type: String }, // ✅ ADD THIS LINE (optional field)
  selectedAccount: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'CloudConnection', required: true },
    accountId: { type: String, required: true },
    name: { type: String, required: true },
    awsRegion: { type: String, required: false }
  },
  selectedToken: { type: Object, required: true },
  gitHubUsername: { type: String, required: false },
  repoUrl: { type: String, required: true },
  selectedFolder: { type: String, required: false },
  namespace: { type: String, required: true },
  cloudProvider: { 
    type: String, 
    enum: ['aws', 'azure', 'gcp'],
    required: true 
  }, // ✅ Also good to enforce (optional but recommended)
  status: {
    type: String,
    enum: ['pending', 'applied', 'failed', 'deployed'],
    default: 'pending'
  },
  errorMessage: String,
  argoAppName: String,
}, {
  timestamps: true
});

const Deployment = mongoose.model('Deployment', deploymentSchema);
export default Deployment;
