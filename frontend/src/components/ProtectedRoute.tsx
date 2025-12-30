import { useContext } from "react";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthContext } from "../context/AuthContext";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { token, loading } = useContext(AuthContext);

  
  if (loading) {
    return null; 
  }

  
  if (!token) {
    return <Navigate to="/" replace />;
  }

  
  return <>{children}</>;
};

export default ProtectedRoute;
