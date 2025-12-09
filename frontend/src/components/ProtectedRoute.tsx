import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { token } = useContext(AuthContext);

  if (!token) return <Navigate to="/" />;

  return <>{children}</>;
};

export default ProtectedRoute;
