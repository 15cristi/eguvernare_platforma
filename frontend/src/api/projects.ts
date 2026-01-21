import api from "./axios";
import type { PageResponse } from "./types";

export type ProjectDto = {
  id: number;
  userId: number;

  userFirstName?: string;
  userLastName?: string;
  userRole?: string;

  title: string;
  acronym: string;
  abstractEn?: string;
  partners?: string[];

  coordinator?: string;
  contractNumber: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  possibleExtensionEndDate?: string | null;

  url?: string;
};

export type ProjectRequest = {
  title: string;
  acronym?: string;
  abstractEn?: string;
  coordinator?: string;
  contractNumber?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  possibleExtensionEndDate?: string;
  partners?: string[];
};


export const getMyProjects = async (): Promise<ProjectDto[]> => {
  const res = await api.get<ProjectDto[]>("/api/projects/me");
  return res.data;
};

export const getProjectsByUserId = async (userId: number): Promise<ProjectDto[]> => {
  const res = await api.get<ProjectDto[]>(`/api/projects/user/${userId}`);
  return res.data;
};

export const createProject = async (payload: ProjectRequest): Promise<ProjectDto> => {
  const res = await api.post<ProjectDto>("/api/projects/me", payload);
  return res.data;
};

export const updateProject = async (id: number, payload: ProjectRequest): Promise<ProjectDto> => {
  const res = await api.put<ProjectDto>(`/api/projects/me/${id}`, payload);
  return res.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/api/projects/me/${id}`);
};

export const getAllProjects = async (q = "", page = 0, size = 12): Promise<PageResponse<ProjectDto>> => {
  const res = await api.get<PageResponse<ProjectDto>>("/api/projects", {
    params: { q: q || undefined, page, size }
  });
  return res.data;
};

export const deleteProjectAdmin = async (id: number): Promise<void> => {
  await api.delete(`/api/projects/${id}`);
};

export const searchProjects = async (q = "", page = 0, size = 12): Promise<PageResponse<ProjectDto>> => {
  const res = await api.get<PageResponse<ProjectDto>>("/api/projects", {
    params: { q: q || undefined, page, size }
  });
  return res.data;
};

export const getProfileByUserId = async (userId: number) => {
  const res = await api.get(`/api/profile/user/${userId}`);
  return res.data;
};
