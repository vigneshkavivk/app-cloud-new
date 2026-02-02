// src/components/support/TicketDetail.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, User, MessageSquare } from 'lucide-react';
import api from '../../interceptor/api.interceptor';

import { useParams } from 'react-router-dom';

const TicketDetail = () => {
  const { ticketId } = useParams(); // ✅ Correct way to get :ticketId
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch ticket from backend
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/api/support/tickets/${ticketId}`);
        setTicket(res.data.ticket);
        setReplies(res.data.ticket.comments || []);
      } catch (err) {
        console.error('Failed to fetch ticket:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      await api.put(`/api/support/tickets/${ticketId}`, {
        message: newReply
      });

      // Refresh ticket
      const res = await api.get(`/api/support/tickets/${ticketId}`);
      setTicket(res.data.ticket);
      setReplies(res.data.ticket.comments || []);
      setNewReply('');
    } catch (err) {
      console.error('Failed to submit reply:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/api/support/tickets/${ticketId}`, {
        status: newStatus
      });

      // Refresh ticket
      const res = await api.get(`/api/support/tickets/${ticketId}`);
      setTicket(res.data.ticket);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#0f172a] min-h-screen text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-10">Loading...</div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 bg-[#0f172a] min-h-screen text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-10">Ticket not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to tickets
          </button>
          <div className="flex items-center gap-2">
            <span className="font-medium text-cyan-400">{ticket.ticketId}</span>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for User">Waiting for User</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Ticket Info */}
        <div className="bg-[#1e252d] p-4 rounded-lg mb-6">
          <h1 className="text-xl font-bold mb-2">{ticket.subject}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Created {new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>Assigned to: {ticket.assignedTo?.name || 'Unassigned'}</span>
            </div>
          </div>
          <p className="text-gray-300">{ticket.description}</p>
        </div>

        {/* Conversation */}
        <div className="space-y-4 mb-6">
          {replies.map((reply) => (
            <div
              key={reply._id || reply.id}
              className={`p-4 rounded-lg ${
                reply.senderRole === 'support'
                  ? 'bg-[#1e252d] border-l-4 border-cyan-500/30'
                  : 'bg-[#1e252d] border-l-4 border-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-xs font-bold">
                  {reply.senderName?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reply.senderName}</span>
                    {reply.senderRole === 'support' && (
                      <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-xs">
                        Support
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(reply.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-300">{reply.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="bg-[#1e252d] p-4 rounded-lg">
          <form onSubmit={handleReplySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Type your reply...
              </label>
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500 resize-none"
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 text-white text-sm font-medium"
              >
                Send Reply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
