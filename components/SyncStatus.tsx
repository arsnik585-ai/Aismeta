
import React from 'react';

interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isOnline, isSyncing }) => {
  return (
    <div className="fixed top-2 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
      {/* Network & Status Indicator */}
      <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold coding-font border backdrop-blur-xl shadow-2xl flex items-center gap-3 tracking-tighter transition-all duration-700 ${
        isSyncing || !isOnline ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
      } ${
        !isOnline ? 'bg-red-950/40 border-red-500/50 text-red-400' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
      }`}>
        <div className="relative flex h-2 w-2">
          {isSyncing && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${!isOnline ? 'bg-red-500' : 'bg-emerald-500'}`}></span>}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${!isOnline ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
        </div>
        {!isOnline ? 'NETWORK_OFFLINE :: BUFFER_MODE' : (isSyncing ? 'PROCESSING :: UPDATING_DATA' : 'smeta :: READY')}
      </div>
    </div>
  );
};

export default SyncStatus;
