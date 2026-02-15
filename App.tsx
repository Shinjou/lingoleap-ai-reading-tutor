
import React, { useState } from 'react';
import { AppView, Story, ReadingAttempt } from './types';
import StoryLibrary, { MOCK_STORIES } from './components/StoryLibrary';
import LiveTutor from './components/LiveTutor';
import AssessmentReport from './components/AssessmentReport';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [lastAttempt, setLastAttempt] = useState<ReadingAttempt | null>(null);

  const handleStartReading = (story: Story) => {
    setSelectedStory(story);
    setView(AppView.TUTOR);
  };

  const handleFinishReading = (attempt: ReadingAttempt) => {
    setLastAttempt(attempt);
    setView(AppView.REPORT);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-slate-300 font-sans overflow-hidden">
      {/* VS Code Style Header */}
      <header className="bg-[#161b22] border-b border-[#30363d] h-12 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppView.HOME)}>
            <div className="bg-indigo-600 w-6 h-6 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="text-sm font-bold text-slate-200">LingoLeap / Taiwan Reading Tutor</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex gap-4 text-xs font-medium">
            <button onClick={() => setView(AppView.HOME)} className={view === AppView.HOME ? 'text-white' : 'hover:text-white'}>首頁</button>
            <button onClick={() => setView(AppView.LIBRARY)} className={view === AppView.LIBRARY ? 'text-white' : 'hover:text-white'}>圖書館</button>
          </nav>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700"></div>
            <span className="text-[10px] text-slate-500">Lv.12</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {view === AppView.HOME && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <h1 className="text-5xl font-black text-white">AI 朗讀助教</h1>
            <p className="text-slate-400 max-w-md">準備好開始今天的朗讀挑戰了嗎？</p>
            <button 
              onClick={() => setView(AppView.LIBRARY)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-bold shadow-2xl transition-all"
            >
              進入圖書館
            </button>
          </div>
        )}

        {view === AppView.LIBRARY && (
          <div className="p-8 max-w-7xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-white mb-8">選擇讀本</h2>
            <StoryLibrary onStartReading={handleStartReading} />
          </div>
        )}

        {view === AppView.TUTOR && selectedStory && (
          <LiveTutor 
            story={selectedStory}
            allStories={MOCK_STORIES}
            onFinish={handleFinishReading} 
            onCancel={() => setView(AppView.LIBRARY)}
            onSelectStory={setSelectedStory}
          />
        )}

        {view === AppView.REPORT && (
          <div className="p-8 max-w-4xl mx-auto w-full">
             <AssessmentReport attempt={lastAttempt} onRetry={() => setView(AppView.LIBRARY)} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
