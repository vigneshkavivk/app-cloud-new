// server/controllers/supportController.js
import SupportTicket from '../models/SupportTicket.js';
import { sendSupportTicketEmail } from '../services/emailService.js';

const generateTicketId = async () => {
  const count = await SupportTicket.countDocuments();
  return `TKT-${String(count + 1).padStart(3, '0')}`;
};

export const createTicket = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { category, subject, description, priority = 'Medium' } = req.body;
    const userId = req.user.id;
    const username = req.user.name;

    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ticketId = await generateTicketId();

    // ✅ FIX: Explicitly include assignedTo
    const ticket = new SupportTicket({
      ticketId,
      userId,
      username,
      category,
      subject,
      description,
      priority,
      assignedTo: 'Unassigned', // 👈 THIS IS THE KEY LINE
      requester: {
        name: username,
        avatar: req.user.avatar || `https://i.pravatar.cc/30?img=${Math.floor(Math.random() * 10)}`
      }
    });

    await ticket.save();

    try {
      await sendSupportTicketEmail(ticket);
    } catch (emailError) {
      console.warn('⚠️ Ticket created but email failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      ticket: {
        id: ticket.ticketId,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo // optional: include in response
      }
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};
export const getUserTickets = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ tickets });
  } catch (err) {
    console.error('Get user tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({}).sort({ createdAt: -1 });
    res.status(200).json({ tickets });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    // Note: assignedTo is now a string — no populate needed
    const ticket = await SupportTicket.findOne({ ticketId: id })
      .populate('comments.senderId', 'name');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.status(200).json({ ticket });
  } catch (err) {
    console.error('Get ticket by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, message } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await SupportTicket.findOne({ ticketId: id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (status) {
      ticket.status = status;
    }

    // ✅ Handle string-based assignment
    if (assignedTo !== undefined) {
      const allowedValues = ['Unassigned', 'DevOps Lead', 'Support Team'];
      if (!allowedValues.includes(assignedTo)) {
        return res.status(400).json({ error: 'Invalid assignee value' });
      }
      ticket.assignedTo = assignedTo;
    }

    if (message) {
      ticket.comments.push({
        senderId: userId,
        senderName: req.user.name,
        senderRole: userRole === 'support' || userRole === 'admin' ? 'support' : 'user',
        message
      });
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    console.error('Update ticket error:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};
