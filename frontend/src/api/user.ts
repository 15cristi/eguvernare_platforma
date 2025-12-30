import api from "./axios";

export const updateMyRole = async (role: string) => {
  const res = await api.put("/api/user/me/role", { role });
  return res.data;
};