import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { RoomsPage } from "./pages/RoomsPage";
import { RoomView } from "./pages/RoomView";
import "./index.css";

const PublicShare = () => (
  <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
    <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-900/30">
      <span className="font-bold tracking-tight">Data Room Share</span>
      <span className="text-xs text-zinc-500">Public Access</span>
    </header>
    <main className="flex-1 p-6">
      <h1 className="text-xl font-semibold mb-4">Shared Documents</h1>
      <div className="h-64 flex items-center justify-center border border-dashed border-zinc-800 rounded text-xs text-zinc-500">
        Public Folder / File View — Phase 4
      </div>
    </main>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/share/:token" element={<PublicShare />} />

          {/* Protected routes */}
          <Route
            path="/rooms/:roomId/folders/:folderId"
            element={
              <ProtectedRoute>
                <RoomView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms/:roomId"
            element={
              <ProtectedRoute>
                <RoomView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <RoomsPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
