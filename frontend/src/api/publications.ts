import api from "./axios";
import type { PageResponse } from "./types";

export type PublicationDto = {
  id: number;
  userId: number;

  userFirstName?: string;
  userLastName?: string;
  userRole?: string;

  title: string;
  venue?: string;
  year?: number;
  url?: string;
};


export type PublicationRequest = {
  title: string;
  venue?: string;
  year?: number;
  url?: string;
};

export const getMyPublications = async (): Promise<PublicationDto[]> => {
  const res = await api.get("/api/publications/me");
  return res.data;
};

export const getPublicationsByUserId = async (userId: number): Promise<PublicationDto[]> => {
  const res = await api.get(`/api/publications/user/${userId}`);
  return res.data;
};

export const createPublication = async (payload: PublicationRequest): Promise<PublicationDto> => {
  const res = await api.post("/api/publications/me", payload);
  return res.data;
};

export const updatePublication = async (id: number, payload: PublicationRequest): Promise<PublicationDto> => {
  const res = await api.put(`/api/publications/me/${id}`, payload);
  return res.data;
};

export const deletePublication = async (id: number): Promise<void> => {
  await api.delete(`/api/publications/me/${id}`);
};

export const getAllPublications = async (q: string, page = 0, size = 20): Promise<PageResponse<PublicationDto>> => {
  const res = await api.get("/api/publications", { params: { q, page, size } });
  return res.data;
};
