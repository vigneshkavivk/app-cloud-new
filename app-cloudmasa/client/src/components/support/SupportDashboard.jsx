// src/components/support/SupportDashboard.jsx
import React, { useState, useEffect } from 'react';
import TicketCard from './TicketCard';
import api from '../../interceptor/api.interceptor'; // adjust path
import { useNavigate } from 'react-router-dom';

const SupportDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // Fetch tickets from backend
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api.get('/api/support/tickets/all');
        setTickets(res.data.tickets || []);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

 const filteredTickets = tickets.filter(ticket => {
  // Skip invalid tickets
  if (!ticket) return false;

  const subject = ticket.subject || '';
  const requesterName = ticket.requester?.name || '';
  const ticketId = ticket.ticketId || '';

  const matchesSearch =
    subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticketId.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
  const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
  
const matchesAssignee = filterAssignee === 'all' || 
                       (filterAssignee === 'Unassigned' && !ticket.assignedTo) || 
                       ticket.assignedTo === filterAssignee;  return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
});
const SupportDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.role !== 'support') {
      alert('Access denied');
      navigate('/sidebar'); // or /support
    }
  }, [navigate]);

  return (
    <div className="p-6 bg-[#0f172a] text-white">
      <h1 className="text-2xl font-bold">Support Dashboard</h1>
      {/* Your dashboard UI */}
    </div>
  );
};
  const getStatusCount = (status) => {
    return tickets.filter(t => t.status === status).length;
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#0f172a] min-h-screen text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-10">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:ml-64">
    <div className="p-6 bg-[#0f172a] min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">Support Dashboard</h1>
            <p className="text-gray-400">Manage and respond to support tickets</p>
          </div>
          
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <p className="text-sm text-gray-400 mt-1">Total Tickets</p>
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
              <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-5.93"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span className="text-xl font-bold">{getStatusCount('In Progress')}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">In Progress</p>
          </div>
          <div className="bg-[#1e252d] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500/20 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-5.93"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span className="text-xl font-bold">{getStatusCount('Critical')}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Critical</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1e252d] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white bg-[#1e252d]"
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white bg-[#1e252d]"
            >
              <option value="all">All Priority</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white bg-[#1e252d]"
            >
              <option value="all">All Assignees</option>
              <option value="Unassigned">Unassigned</option>
              
            </select>
          </div>
        </div>

        {/* Ticket List */}
        <div className="bg-[#1e252d] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1e252d] border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Requester</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredTickets.map((ticket) => (
                  <TicketCard key={ticket._id} ticket={ticket} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default SupportDashboard;
