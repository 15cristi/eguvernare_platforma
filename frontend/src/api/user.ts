import api from "./axios";



export const updateMyRole = async (role: string) => {
  const res = await api.put("/api/user/me/role", { role });
  return res.data;
};



export type UserSearchDto = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
};

export const searchUsers = async (q: string): Promise<UserSearchDto[]> => {
  const res = await api.get("/api/users/search", {
    params: { q }
  });
  return res.data;
};
