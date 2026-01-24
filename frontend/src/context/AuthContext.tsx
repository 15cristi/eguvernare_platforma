import { createContext, useEffect, useState } from "react";
import { connectWs, disconnectWs } from "../realtime/wsClient";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loading: true,
  setToken: () => {},
  setUser: () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 LOAD FROM LOCALSTORAGE
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) setTokenState(storedToken);
    if (storedUser) setUserState(JSON.parse(storedUser));

    setLoading(false);
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) localStorage.setItem("token", newToken);
    else localStorage.removeItem("token");
  };


  useEffect(() => {
  // conectăm WS când avem token, îl închidem când nu mai avem
  if (token) connectWs(token);
  else disconnectWs();

  // la unmount, închidem
  return () => disconnectWs();
}, [token]);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) localStorage.setItem("user", JSON.stringify(newUser));
    else localStorage.removeItem("user");
  };

  const logout = () => {
    setTokenState(null);
    setUserState(null);
    localStorage.clear();
    disconnectWs();
  };

  return (
    <AuthContext.Provider
      value={{ token, user, loading, setToken, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
