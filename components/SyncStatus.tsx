
import React from 'react';

interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isOnline, isSyncing }) => {
  return (
    <div className={`fixed top-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-500 transform ${isSyncing || !isOnline ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
      <div className={`px-3 py-1 rounded-full text-[9px] font-bold coding-font border flex items-center gap-2 backdrop-blur-md shadow-lg ${
        !isOnline ? 'bg-amber-950/80 border-amber-500 text-amber-500' : 'bg-cyan-950/80 border-cyan-500 text-cyan-500'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'animate-ping' : ''} ${!isOnline ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
        {!isOnline ? 'СЕТЬ ОТКЛЮЧЕНА - РЕЖИМ БУФЕРИЗАЦИИ' : 'AI СИНХРОНИЗАЦИЯ...'}
      </div>
    </div>
  );
};

export default SyncStatus;
