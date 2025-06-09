import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import Summarizer from "./pages/Summarizer";
import SummaryDetail from "./pages/SummaryDetail";

import MindmapGenerator from "./pages/MindmapGenerator";
import MindmapDetail from "./pages/MindmapDetail";

import TestModeUpload from "./pages/TestModeUpload";
import TestPaperDetail from "./pages/TestPaperDetail";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/summarizer"
          element={
            <ProtectedRoute>
              <Summarizer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/summary/:uid/:id"
          element={
            <ProtectedRoute>
              <SummaryDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mindmapgenerator"
          element={
            <ProtectedRoute>
              <MindmapGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mindmap/:uid/:id"
          element={
            <ProtectedRoute>
              <MindmapDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/testmodeupload"
          element={
            <ProtectedRoute>
              <TestModeUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/testpaperdetail/:uid/:id"
          element={
            <ProtectedRoute>
              <TestPaperDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
export default App;