import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { email } = useAuth();
  const location = useLocation();
  if (!email) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
};


