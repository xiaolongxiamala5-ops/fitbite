import React, { useState } from 'react';
import './index.css';
import { FridgeProvider } from './context/FridgeContext';
import { HomeView } from './views/HomeView';
import { DebugView } from './views/DebugView';

export const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'debug'>('home');

  return (
    <FridgeProvider>
      {/* 极简悬浮调试切换器（不阻碍主界面阅读） */}
      <nav className="dev-floating-nav" aria-label="视图切换">
        <button
          onClick={() => setView('home')}
          className={`dev-nav-btn ${view === 'home' ? 'active' : ''}`}
        >
          📱 首页
        </button>
        <button
          onClick={() => setView('debug')}
          className={`dev-nav-btn ${view === 'debug' ? 'active' : ''}`}
        >
          ⚙️ 验收
        </button>
      </nav>

      {view === 'home' ? (
        <div className="ios-viewport-container">
          <main className="ios-app-canvas">
            <HomeView />
          </main>
        </div>
      ) : (
        <div className="debug-container">
          <DebugView />
        </div>
      )}
    </FridgeProvider>
  );
};

export default App;