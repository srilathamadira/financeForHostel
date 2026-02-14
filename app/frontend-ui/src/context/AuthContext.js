import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // attach token on reload
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // ================= FETCH USER =================

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch (err) {
      console.error("Fetch user failed:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // ================= LOGIN (USERNAME) =================

  const login = async (username, password) => {
    const res = await axios.post(`${API}/auth/login`, {
      username,
      password,
    });

    const { access_token, user: userData } = res.data;

    setToken(access_token);
    setUser(userData);

    localStorage.setItem("token", access_token);
    axios.defaults.headers.common.Authorization = `Bearer ${access_token}`;

    return res.data;
  };

  // ================= LOGOUT =================

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
  };

  // ================= PROVIDER =================

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
