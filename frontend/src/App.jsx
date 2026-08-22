import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import RoomDetail from "./pages/RoomDetail.jsx";
import ExpenseHistory from "./pages/ExpenseHistory.jsx";
import Profile from "./pages/Profile.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:id"
          element={
            <ProtectedRoute>
              <RoomDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:id/history"
          element={
            <ProtectedRoute>
              <ExpenseHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
      <InstallPrompt />
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: "font-sans text-sm rounded-xl shadow-lg border border-ink/10 dark:border-white/10 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md text-ink dark:text-white",
          style: {
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#0B8556',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#D32F2F',
              secondary: 'white',
            },
          },
        }}
      />
    </>
  );
}
