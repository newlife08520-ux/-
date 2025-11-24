import React from 'react';
import { ChatMessage } from '../types';

interface ConsoleOutputProps {
  logs: ChatMessage[];
  isLoading: boolean;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ logs, isLoading }) => {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isLoading]);

  return (
    <div className="bg-black rounded-lg border border-slate-700 shadow-inner h-[500px] flex flex-col font-mono text-sm overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <span className="text-slate-400 text-xs uppercase tracking-wider">Terminal Output</span>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 && (
          <div className="text-slate-600 italic text-center mt-20">
            Ready to test connection...
          </div>
        )}
        
        {logs.map((log, index) => (
          <div key={index} className={`flex flex-col animate-fadeIn ${log.isError ? 'text-red-400' : 'text-slate-300'}`}>
            <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
              <span className={log.role === 'user' ? 'text-blue-400' : log.role === 'model' ? 'text-green-400' : 'text-purple-400'}>
                {log.role === 'user' ? '❯ USER' : log.role === 'model' ? '❯ GEMINI' : '❯ SYSTEM'}
              </span>
              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className={`whitespace-pre-wrap pl-4 border-l-2 ${log.isError ? 'border-red-500/50' : log.role === 'user' ? 'border-blue-500/30' : 'border-green-500/30'}`}>
              {log.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col">
             <div className="flex items-center gap-2 mb-1 opacity-50 text-xs text-green-400">
                <span>❯ GEMINI</span>
            </div>
            <div className="pl-4 border-l-2 border-green-500/30 text-green-500/70 animate-pulse">
              Generating response...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};