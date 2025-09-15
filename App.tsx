import React from 'react';
import ChatWidget from './components/ChatWidget';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 font-sans">
       <div className="w-full max-w-2xl h-[90vh] max-h-[700px]">
         <ChatWidget />
       </div>
    </div>
  );
};

export default App;