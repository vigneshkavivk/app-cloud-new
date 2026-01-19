// src/components/workflow/ModuleSelector.jsx
import React, { useRef, useEffect } from 'react';
import { DollarSign } from 'lucide-react';

// ✅ Import ALL provider-specific ModuleConfigForm components
import AwsModuleConfigForm from './aws/ModuleConfigForm';
import GcpModuleConfigForm from './gcp/ModuleConfigForm';
import AzureModuleConfigForm from './azure/ModuleConfigForm';

import { modules } from './constants';
import {
  Server, Database, Network, FileText, HardDrive, Code,
  Terminal, Globe, Lock, BarChart, Shield, Table, Eye
} from 'lucide-react';

const getModuleIcon = (moduleId, selectedProvider) => {
  switch (moduleId) {
    case "ec2": return <Server className="text-orange-400" />;
    case "eks": return <Database className="text-blue-400" />;
    case "vpc": return <Network className="text-green-400" />;
    case "dynamodb": return <Table className="text-amber-400" />;
    case "s3": case "ecr": return <HardDrive className="text-yellow-400" />;
    case "lambda": return <Code className="text-purple-400" />;
    case "sns": return <Terminal className="text-pink-400" />;
    case "cloudfront": return <Globe className="text-teal-400" />;
    case "iam": return <Lock className="text-gray-400" />;
    case "cloudwatch": return <BarChart className="text-purple-400" />;
    case "lb": return <Network className="text-red-400" />;
    case "route53": return <Globe className="text-indigo-400" />;
    case "kms": return <Shield className="text-emerald-400" />;
    case "cloudtrail": return <Eye className="text-teal-400" />;
    case "efs": return <FileText className="text-yellow-400" />;

    // ✅ Add Azure module icons
    case "vm": return <Server className="text-orange-400" />;
    case "aks": return <Database className="text-blue-400" />;
    case "vnet": return <Network className="text-green-400" />;
    case "blob": return <HardDrive className="text-yellow-400" />;

    default: return null;
  }
};

const ModuleSelector = ({
  selectedProvider,
  searchQuery,
  setSearchQuery,
  selectedModules,
  toggleModule,
  moduleConfig,
  setModuleConfig,
  vpcs,
  awsAccountId,
  availableModules = [], 
}) => {
  const filteredModules = availableModules.filter((module) =>
    module.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const configSectionRef = useRef(null);

  useEffect(() => {
    if (selectedModules.length > 0 && configSectionRef.current) {
      configSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedModules]);

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Select Modules</h2>
      <p className="text-sm text-gray-300 mb-4">
        Choose the cloud resources you want to deploy. Each module represents a set of related resources.
      </p>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-2 text-white"
        />
      </div>

      {/* ✅ EXACT CARD UI FROM YOUR SCREENSHOT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 pr-2">
        {filteredModules?.map((module) => (
          <div
            key={module.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedModules.length > 0 && selectedModules[0] === module.id
                ? "border-orange-500 bg-[#1E2633]"
                : "border-[#3a5b9b] hover:border-orange-300"
            }`}
            onClick={() => toggleModule(module.id)}
          >
            <div className="flex items-start mb-3">
              <div className="mr-3 mt-1">
                {getModuleIcon(module.id, selectedProvider)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg">{module.name}</h3>
                <div className="flex items-center mt-1 text-xs text-green-400">
                  <DollarSign className="mr-1" size={14} />
                  {(() => {
                    const prices = Object.values(module.price).filter(p => p > 0);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    return `from $${minPrice}/hr`;
                  })()}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-3">{module.description}</p>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Requirements:</p>
              <div className="flex flex-wrap gap-1">
                {module.requirements.map((req, idx) => (
                  <span key={idx} className="text-xs bg-[#1E2633] px-2 py-1 rounded">
                    {req}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ DYNAMIC CONFIG FORM — works for AWS, GCP, Azure */}
      {selectedModules.length > 0 && (
        <div ref={configSectionRef} className="mt-6">
          <h3 className="text-lg font-medium mb-3">Module Configuration</h3>
          {selectedModules.map((moduleId) => {
            let ConfigComponent;
            switch (selectedProvider) {
              case 'aws':
                ConfigComponent = AwsModuleConfigForm;
                break;
              case 'gcp':
                ConfigComponent = GcpModuleConfigForm;
                break;
              case 'azure':
                ConfigComponent = AzureModuleConfigForm;
                break;
              default:
                return null;
            }

            return (
              <div key={moduleId}>
                <ConfigComponent
                  provider={selectedProvider}
                  moduleId={moduleId}
                  config={{
                    ...moduleConfig[moduleId],
                    // Pass AWS-specific ID only for AWS (others ignore it — safe)
                    ...(selectedProvider === 'aws' && { awsAccountId }),
                  }}
                  onConfigChange={(updatedConfig) =>
                    setModuleConfig({ ...moduleConfig, [moduleId]: updatedConfig })
                  }
                  vpcs={vpcs}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModuleSelector;
