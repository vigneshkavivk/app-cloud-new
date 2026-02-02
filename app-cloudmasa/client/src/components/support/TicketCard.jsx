// src/components/support/TicketCard.jsx
import React, { useState } from 'react';
import { ArrowRight, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../interceptor/api.interceptor';

const TicketCard = ({ ticket, onUpdate }) => {
  // ✅ Early return if ticket or ticketId is missing
  if (!ticket?.ticketId) {
    console.warn('Ticket missing ticketId, skipping render:', ticket);
    return null;
  }
// Add this inside your component, after `tickets` state
const getUniqueAssignees = () => {
  const assignees = new Set();
  tickets.forEach(ticket => {
    const assignee = ticket.assignedTo || 'Unassigned';
    assignees.add(assignee);
  });
  return Array.from(assignees).sort(); // Optional: sort alphabetically
};
  const navigate = useNavigate();
  const initialAssignee = ticket.assignedTo || 'Unassigned';
  const [assignedTo, setAssignedTo] = useState(initialAssignee);

  const getStatusBadge = (status) => {
    const styles = {
      Open: 'bg-red-500/20 text-red-300 border-red-500/30',
      'In Progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      Resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
      Closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    return styles[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      Critical: 'bg-red-500/20 text-red-300 border-red-500/30',
      High: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      Low: 'bg-green-500/20 text-green-300 border-green-500/30'
    };
    return styles[priority] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const handleAssign = async (e) => {
    e.stopPropagation();
    try {
      await api.put(`/api/support/tickets/${ticket.ticketId}/assign`, {
        assignedTo: assignedTo
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert('Failed to assign ticket. Please try again.');
      }
    }
  };

  const handleRowClick = () => {
    navigate(`/sidebar/support/ticket/${ticket.ticketId}`);
  };

const displayAssignee = assignedTo || 'Unassigned';
  return (
    <tr className="hover:bg-[#1e252d]/50 cursor-pointer" onClick={handleRowClick}>
      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">
        {ticket.ticketId}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div>
          <div className="font-medium">{ticket.subject}</div>
          <div className="text-gray-400 text-xs truncate max-w-xs">
            {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <User size={16} className="mr-2 text-gray-400" />
          <span className="text-sm">{ticket.requester?.name || 'Unknown'}</span>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(ticket.status)}`}>
          {ticket.status}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {displayAssignee !== 'Unassigned' ? (
            <div className="flex items-center">
              <User size={16} className="mr-2 text-gray-400" />
              <span className="text-sm">{displayAssignee}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Unassigned</span>
          )}
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
          >
            <option value="">Assign...</option>
            <option value="DevOps Lead">DevOps Lead</option>
            <option value="Support Team">Support Team 1</option>
            <option value="Support Team">Support Team 2</option>
            <option value="Unassigned">Unassigned</option>
          </select>
          <button
            onClick={handleAssign}
            className="ml-1 bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-xs"
          >
            ✓
          </button>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          {new Date(ticket.updatedAt).toLocaleString()}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/sidebar/support/ticket/${ticket.ticketId}`);
          }}
          className="text-cyan-400 hover:text-cyan-300"
        >
          <ArrowRight size={16} />
        </button>
      </td>
    </tr>
  );
};

export default TicketCard;
