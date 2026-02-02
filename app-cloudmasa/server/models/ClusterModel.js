// server/models/ClusterModel.js
import mongoose from 'mongoose';

const clusterSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  region: { 
    type: String, 
    required: true, 
    trim: true 
  },
  account: { 
    type: String, 
    required: true, 
    trim: true,
    // For AWS: accountId
    // For Azure: subscriptionId
    // For GCP: projectId
  },
  accountName: { 
    type: String, 
    trim: true,
    // Optional friendly name (e.g., "Dev Account")
  },
  provider: {
    type: String,
    required: true,
    enum: ['aws', 'azure', 'gcp'],
    default: 'aws',
  },
  status: { 
    type: String, 
    default: 'running', 
    enum: ['running', 'stopped', 'pending', 'unknown', 'not-found'],
  },
  version: {
    type: String,
    trim: true,
    // e.g., "1.28", "1.29"
  },
  liveNodeCount: {
    type: Number,
    default: 0,
  },
  // 🔐 AWS-specific (optional — only used during creation/connection)
  awsAccessKey: { 
    type: String, 
    required: false, 
    select: false 
  },
  awsSecretKey: { 
    type: String, 
    required: false, 
    select: false 
  },
  outputFormat: { 
    type: String, 
    default: 'json' 
  },
  kubeContext: {
    type: String,
    required: true,
    trim: true,
    // Example: "arn:aws:eks:us-east-1:123456789012:cluster/Prod-cluster"
    // For Azure: "/subscriptions/.../resourcegroups/.../providers/Microsoft.ContainerService/managedClusters/my-aks"
    // For GCP: "gke_project_us-central1_cluster"
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  collection: 'clusters',
  timestamps: false
});

clusterSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

// Indexes for fast filtering
clusterSchema.index({ name: 1, account: 1 });
clusterSchema.index({ provider: 1 });
clusterSchema.index({ account: 1 });

// Safely export
const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', clusterSchema);

export default Cluster;
