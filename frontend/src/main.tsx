import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Temporary placeholder page components to verify Phase 0 routing works
const Login = () => (
  <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50 p-4">
    <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Login</h1>
      <p className="text-zinc-400 text-sm mb-6">Enter your credentials to access the data room.</p>
      <div className="h-20 flex items-center justify-center border border-dashed border-zinc-800 rounded text-xs text-zinc-500">
        Login Form Placeholder
      </div>
    </div>
  </div>
);

const Register = () => (
  <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50 p-4">
    <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Register</h1>
      <p className="text-zinc-400 text-sm mb-6">Create a new account to get started.</p>
      <div className="h-20 flex items-center justify-center border border-dashed border-zinc-800 rounded text-xs text-zinc-500">
        Registration Form Placeholder
      </div>
    </div>
  </div>
);

const RoomView = () => (
  <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
    <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-900/30">
      <span className="font-bold tracking-tight">Acme Data Room</span>
      <span className="text-xs text-zinc-500">Authenticated Session</span>
    </header>
    <main className="flex-1 p-6">
      <h1 className="text-xl font-semibold mb-4">Workspace</h1>
      <div className="h-64 flex items-center justify-center border border-dashed border-zinc-800 rounded text-xs text-zinc-500">
        Folder Browser UI Placeholder
      </div>
    </main>
  </div>
);

const PublicShare = () => (
  <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
    <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-900/30">
      <span className="font-bold tracking-tight">Acme Share</span>
      <span className="text-xs text-zinc-500">Public Access</span>
    </header>
    <main className="flex-1 p-6">
      <h1 className="text-xl font-semibold mb-4">Shared Documents</h1>
      <div className="h-64 flex items-center justify-center border border-dashed border-zinc-800 rounded text-xs text-zinc-500">
        Public Folder / File View Placeholder
      </div>
    </main>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/rooms/:roomId" element={<RoomView />} />
        <Route path="/rooms/:roomId/folders/:folderId" element={<RoomView />} />
        <Route path="/share/:token" element={<PublicShare />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
