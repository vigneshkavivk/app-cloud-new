// src/components/support/SupportPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 ADD THIS
import SupportTicketModal from './SupportTicketModal';
import api from '../../interceptor/api.interceptor';

const SupportPage = () => {
  const navigate = useNavigate(); // 👈 ADD THIS
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTickets = async () => {
      try {
        const res = await api.get('/api/support/tickets');
        setTickets(res.data.tickets || []);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserTickets();
  }, []);

  const handleTicketSubmit = async (data) => {
    try {
      const res = await api.post('/api/support/tickets', data);
      alert('✅ Ticket submitted!');
      setIsModalOpen(false);
      const updatedRes = await api.get('/api/support/tickets');
      setTickets(updatedRes.data.tickets || []);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      alert('Failed to submit ticket');
    }
  };

  const getStatusCount = (status) => {
    return tickets.filter(t => t.status === status).length;
  };

  const handleTicketClick = (ticketId) => {
    navigate(`/sidebar/support/ticket/${ticketId}`);
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

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Support</h1>
            <p className="text-gray-400">View and manage your support tickets</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90"
          >
            + New Ticket
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1e252d] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500/20 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10l2 2h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"></path>
                  <line x1="9" y1="9" x2="9" y2="9"></line>
                  <line x1="9" y1="13" x2="9" y2="13"></line>
                  <line x1="9" y1="17" x2="9" y2="17"></line>
                  <line x1="15" y1="9" x2="15" y2="9"></line>
                  <line x1="15" y1="13" x2="15" y2="13"></line>
                  <line x1="15" y1="17" x2="15" y2="17"></line>
                </svg>
              </div>
              <span className="text-xl font-bold">{tickets.length}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">All Tickets</p>
          </div>
          <div className="bg-[#1e252d] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 8v4l3 3"></path>
                </svg>
              </div>
              <span className="text-xl font-bold">{getStatusCount('Open')}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Open</p>
          </div>
          <div className="bg-[#1e252d] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-5.93"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span className="text-xl font-bold">{getStatusCount('Resolved')}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Resolved</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full bg-[#1e252d] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Ticket List */}
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-[#1e252d] p-4 rounded-lg border border-gray-700 hover:border-cyan-500/30 transition cursor-pointer"
              onClick={() => handleTicketClick(ticket.ticketId)} // ✅ FIXED
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-cyan-400">{ticket.ticketId}</span>
                  <h3 className="font-semibold">{ticket.subject}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    ticket.status === 'Open'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : ticket.status === 'In Progress'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {ticket.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    ticket.priority === 'Critical'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : ticket.priority === 'High'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
              </p>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {ticket.comments?.length || 0} messages
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        <SupportTicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleTicketSubmit}
        />
      </div>
    </div>
    </div>
  );
};

export default SupportPage;
