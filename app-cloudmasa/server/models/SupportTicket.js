// server/models/SupportTicket.js
import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true,
    index: true,
    select: true 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Bug Report', 'Feature Request', 'Access Issue', 'Billing', 'Deployment', 'Monitoring', 'Database', 'Security', 'Other'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'],
    default: 'Open'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  assignedTo: {
    type: String,
    enum: ['Unassigned', 'DevOps Lead', 'Support Team'],
    default: 'Unassigned'
  },
  requester: {
    name: { type: String, required: true },
    avatar: { type: String, required: true }
  },
  comments: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['user', 'support', 'admin'], required: true },
    message: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
