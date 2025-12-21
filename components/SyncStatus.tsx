import React from 'react';

interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isOnline, isSyncing }) => {
  // Reactive check for API_KEY presence
  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY !== 'undefined';

  return (
    <div className="fixed top-2 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
      {/* Network & Sync Status Indicator */}
      <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold coding-font border backdrop-blur-xl shadow-2xl flex items-center gap-3 tracking-tighter transition-all duration-700 ${
        isSyncing || !isOnline ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
      } ${
        !isOnline ? 'bg-red-950/40 border-red-500/50 text-red-400' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
      }`}>
        <div className="relative flex h-2 w-2">
          {isSyncing && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${!isOnline ? 'bg-red-500' : 'bg-emerald-500'}`}></span>}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${!isOnline ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
        </div>
        {!isOnline ? 'NETWORK_OFFLINE :: BUFFER_MODE' : 'BUILDFLOW_AI :: SYNCHRONIZING_CORE'}
      </div>

      {/* Critical System Error: Missing API Key */}
      {!hasApiKey && (
        <div className="bg-red-600/90 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.5)] border border-white/20 backdrop-blur-md flex items-center gap-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          CRITICAL_ERROR: API_KEY_NOT_INJECTED
        </div>
      )}
    </div>
  );
};

export default SyncStatus;