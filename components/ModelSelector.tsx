import React from 'react';
import { AVAILABLE_MODELS } from '../constants';
import { ModelConfig } from '../types';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModelId, onSelectModel }) => {
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedModel.id);
    // In a real app we'd show a toast here
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg mb-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <i className="fas fa-server text-indigo-400"></i> Model Configuration
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Select Model</label>
          <div className="grid gap-3">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => onSelectModel(model.id)}
                className={`text-left p-3 rounded-md border transition-all duration-200 flex flex-col ${
                  selectedModelId === model.id
                    ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700'
                }`}
              >
                <span className={`font-semibold ${selectedModelId === model.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                  {model.name}
                </span>
                <span className="text-xs text-slate-400 mt-1">{model.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="bg-slate-900 rounded-md p-4 border border-slate-700">
            <label className="block text-xs font-uppercase text-slate-500 tracking-wider mb-2">
              Internal Model ID (Use this in your code)
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded border border-emerald-900/50">
                {selectedModelId}
              </code>
              <button 
                onClick={copyToClipboard}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 transition-colors"
                title="Copy ID"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
            <div className="mt-3 text-sm text-slate-400">
              <p><i className="fas fa-info-circle text-blue-400 mr-1"></i> If you are getting connection errors in your own software, ensure you are using exactly <strong>{selectedModelId}</strong> as the model name.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
