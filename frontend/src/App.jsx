import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import Summarizer from "./pages/Summarizer";
import ProtectedRoute from "./components/ProtectedRoute";
import SummaryDetail from "./pages/SummaryDetail";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
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
          path="/summary/:id"
          element={
            <ProtectedRoute>
              <SummaryDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
export default App;