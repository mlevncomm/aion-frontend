import { Navigate, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
