// src/components/support/SupportTicketModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

const SupportTicketModal = ({ isOpen, onClose, onSubmit }) => {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!category || !subject || !description) {
      setError('Please fill all required fields.');
      return;
    }

    onSubmit({
      category,
      subject,
      description,
      priority
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-[#161b22]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Create Support Ticket</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 h-4 w-4">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.73 2.68l16.56-5.52a2 2 0 0 0 1.11-1.43l-9.03-7.46a2 2 0 0 0-2.83-.16z"></path>
                <line x1="22" y1="2" x2="2" y2="22"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option>Select a category</option>
              <option>Bug Report</option>
              <option>Feature Request</option>
              <option>Access Issue</option>
              <option>Billing</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about your issue, including any error messages, steps to reproduce, and what you've already tried..."
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Priority
            </label>
           <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="Low">Low - Minor issue</option>
              <option value="Medium">Medium - Issue affecting work</option>
              <option value="High">High - Blocking critical tasks</option>
              <option value="Critical">Critical - System down</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 text-white text-sm font-medium"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketModal;
