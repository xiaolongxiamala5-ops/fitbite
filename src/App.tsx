import React, { useState } from 'react';
import { FridgeProvider } from './context/FridgeContext';
import { HomeView } from './views/HomeView';
import { DebugView } from './views/DebugView';

export const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'debug'>('home');

  return (
    <FridgeProvider>
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => setView('home')}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            backgroundColor: view === 'home' ? '#10b981' : '#f9fafb',
            color: view === 'home' ? '#fff' : '#374151',
            cursor: 'pointer'
          }}
        >
          正式首页
        </button>
        <button
          onClick={() => setView('debug')}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            backgroundColor: view === 'debug' ? '#10b981' : '#f9fafb',
            color: view === 'debug' ? '#fff' : '#374151',
            cursor: 'pointer'
          }}
        >
          验收控制台 (DebugView)
        </button>
      </div>

      {view === 'home' ? <HomeView /> : <DebugView />}
    </FridgeProvider>
  );
};

export default App;