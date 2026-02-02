import React, { useState, useEffect } from "react";
import api from "../../interceptor/api.interceptor";

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get("/api/logs");
        setLogs(res.data || []);
      } catch (err) {
        console.error("Failed to load logs:", err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 card-glow">
      <h3 className="text-lg font-semibold text-peacock-400 mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 1a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h.5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H8V7a2 2 0 0 0 2-2v-.5a2 2 0 0 0-2-2H8z"/>
        </svg>
        Recent Activity Logs
      </h3>

      <div className="overflow-auto max-h-60">
        {logs.length === 0 ? (
          <p className="text-gray-400 italic">No logs captured.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-2 px-2">Time</th>
                <th className="py-2 px-2">User</th>
                <th className="py-2 px-2">Action</th>
                <th className="py-2 px-2">Resource</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-900/30">
                  <td className="py-2 px-2 text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-300">{log.user}</td>
                  <td className="py-2 px-2 text-xs font-medium text-peacock-300">{log.action}</td>
                  <td className="py-2 px-2 text-xs text-gray-400">{log.resource}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      log.status === 'Success' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {log.status === 'Success' ? '✅ Success' : '❌ Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
