// src/components/workflow/CreateStep.jsx
import React from 'react';
import { ChevronLeft, CheckCircle, Terminal, Loader2, BarChart, XCircle } from 'lucide-react';

const CreateStep = ({
  isCreated,
  selectedProvider,
  formData,
  selectedModules,
  estimatedCost,
  deploymentLogs,
  loading,
  onDeploy,
  onReset,
  onBack,
}) => {
  // 🔴 Detect FAILED state: not created + not loading + has error logs
  const deploymentFailed = !isCreated && !loading && deploymentLogs.length > 0 && 
    deploymentLogs.some(log => 
      log.includes('Error') || 
      log.includes('[ERROR]') || 
      log.includes('An argument named') ||
      log.includes('Unsupported argument') ||
      log.includes('╷') // Terraform error separator
    );

  // 🟢 SUCCESS STATE — GREEN (only if truly created & no errors)
  if (isCreated && !deploymentFailed) {
    return (
      <>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Successfully Created!</h2>
        <p className="text-gray-300 mb-6">
          Your {selectedProvider?.toUpperCase() || 'Cloud'} resources have been provisioned.
        </p>

        <div className="mb-6 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-left flex items-center">
              <Terminal className="mr-2 text-orange-400" /> Deployment Logs
            </h3>
          </div>
          <div className="bg-[#1E2633] p-3 rounded-lg border border-[#3a5b9b] text-left h-40 overflow-y-auto">
            {deploymentLogs.length > 0 ? (
              deploymentLogs.map((log, index) => (
                <div key={index} className="text-xs mb-1 font-mono">
                  {log.includes("Apply complete") || log.includes("successfully") ? (
                    <span className="text-green-400">{log}</span>
                  ) : log.includes("Error") || log.includes("[ERROR]") || 
                     log.includes("Unsupported argument") || log.includes("╷") ? (
                    <span className="text-red-400 font-bold">{log}</span>
                  ) : (
                    <span className="text-gray-300">{log}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No logs captured.</div>
            )}
          </div>
        </div>

        <button
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-md transition"
          onClick={onReset}
        >
          Start New Deployment
        </button>
      </>
    );
  }

  // 🔴 FAILURE STATE — RED BANNER
  if (deploymentFailed) {
    return (
      <>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300 flex items-start">
          <XCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={24} />
          <div>
            <h2 className="text-xl font-bold mb-1">Deployment Failed</h2>
            <p>Please check the logs below for details and try again.</p>
          </div>
        </div>

        <div className="mb-6 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-left flex items-center">
              <Terminal className="mr-2 text-orange-400" /> Deployment Logs
            </h3>
          </div>
          <div className="bg-[#1E2633] p-3 rounded-lg border border-[#3a5b9b] text-left h-40 overflow-y-auto">
            {deploymentLogs.length > 0 ? (
              deploymentLogs.map((log, index) => (
                <div key={index} className="text-xs mb-1 font-mono">
                  {log.includes("Error") || log.includes("[ERROR]") || 
                   log.includes("Unsupported argument") || log.includes("╷") ? (
                    <span className="text-red-400 font-bold">{log}</span>
                  ) : (
                    <span className="text-gray-300">{log}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No logs captured.</div>
            )}
          </div>
        </div>

        <button
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-md transition"
          onClick={onReset}
        >
          Start New Deployment
        </button>
      </>
    );
  }

  // 🟡 INITIAL / LOADING STATE
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Ready to Create</h2>
      <p className="text-gray-300 mb-6">
        Review your configuration and click Create to provision your resources.
      </p>

      <button
        onClick={onBack}
        className="flex items-center py-2 px-4 bg-[#1E2633] hover:bg-[#3a5b9b] text-white rounded-md transition"
      >
        <ChevronLeft size={16} className="mr-2" />
        Back
      </button>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center">
            <BarChart className="mr-2 text-orange-400" size={18} /> Deployment Summary
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-[#3a5b9b]">
            <span className="text-gray-400">Provider</span>
            <span>{selectedProvider?.toUpperCase() || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#3a5b9b]">
            <span className="text-gray-400">Region</span>
            <span>{formData?.region || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#3a5b9b]">
            <span className="text-gray-400">Modules</span>
            <span>{selectedModules?.length || 0}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-400">Est. Monthly Cost</span>
            <span className="text-green-400">
              ${typeof estimatedCost === 'number' ? estimatedCost.toFixed(2) : '—'}
            </span>
          </div>
        </div>
      </div>

      <button
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-md transition flex items-center mx-auto"
        onClick={onDeploy}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} /> Deploying...
          </>
        ) : (
          <>Create Resources</>
        )}
      </button>
    </>
  );
};

export default CreateStep;
