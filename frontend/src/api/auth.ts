import axios from "axios";

const API_URL = "http://localhost:8080/api/auth";

export const loginUser = async (email: string, password: string) => {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  return res.data;
};

export const registerUser = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  role: string
) => {
  const res = await axios.post(`${API_URL}/register`, {
    firstName,
    lastName,
    email,
    password,
    role,
  });
  return res.data;
};

export const loginWithGoogle = async (googleToken: string) => {
  const res = await axios.post(`${API_URL}/google`, {
    token: googleToken,
  });
  return res.data;
};
