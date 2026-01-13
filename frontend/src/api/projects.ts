import api from "./axios";
import type { PageResponse } from "./types";

export type ProjectDto = {
  id: number;
  userId: number;

  userFirstName?: string;
  userLastName?: string;
  userRole?: string;

  title: string;
  description?: string;
  url?: string;
};


export type ProjectRequest = {
  title: string;
  description?: string;
  url?: string;
};

export const getMyProjects = async (): Promise<ProjectDto[]> => {
  const res = await api.get("/api/projects/me");
  return res.data;
};

export const getProjectsByUserId = async (userId: number): Promise<ProjectDto[]> => {
  const res = await api.get(`/api/projects/user/${userId}`);
  return res.data;
};

export const createProject = async (payload: ProjectRequest): Promise<ProjectDto> => {
  const res = await api.post("/api/projects/me", payload);
  return res.data;
};

export const updateProject = async (id: number, payload: ProjectRequest): Promise<ProjectDto> => {
  const res = await api.put(`/api/projects/me/${id}`, payload);
  return res.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/api/projects/me/${id}`);
};

export const getAllProjects = async (q: string, page = 0, size = 20): Promise<PageResponse<ProjectDto>> => {
  const res = await api.get("/api/projects", { params: { q, page, size } });
  return res.data;
};
