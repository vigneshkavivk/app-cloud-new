// ✅ server/controllers/supportcontroller.js
import mongoose from 'mongoose';
import SupportTicket from '../models/SupportTicket.js';
import { sendSupportTicketEmail } from '../services/emailService.js';

export const createTicket = async (req, res) => {
  try {
    const { type, subject, description } = req.body;

    // ✅ Schema-safe userId handling
    let userId = null;
    if (req.user?.id) {
      // Handle both string & ObjectId
      userId = mongoose.Types.ObjectId.isValid(req.user.id)
        ? new mongoose.Types.ObjectId(req.user.id)
        : null;
    }

    const username = req.user?.name || 'Guest';

    if (!type || !subject || !description) {
      return res.status(400).json({ error: 'Missing required fields: type, subject, description' });
    }

    const ticket = new SupportTicket({
      userId,
      username,
      type,
      subject,
      description,
      status: 'Open',
    });

    await ticket.save();

    // ✅ Send email (non-blocking)
    sendSupportTicketEmail(ticket).catch(err => {
      console.warn('📧 Email delivery failed (ticket still saved):', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Ticket submitted successfully',
      ticketId: ticket._id,
    });
  } catch (err) {
    console.error('🚨 Ticket creation error:', err);
    if (err.name === 'CastError' && err.path === 'userId') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
};
