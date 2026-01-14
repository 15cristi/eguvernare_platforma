import api from "./axios";
import type { PageResponse } from "./types";

export type PublicationType = "ARTICOL_JURNAL" | "LUCRARE_CONFERINTA" | "CARTE" | "CAPITOL_CARTE";

export type PublicationDto = {
  id: number;
  userId: number;

  userFirstName?: string;
  userLastName?: string;
  userRole?: string;

  type: PublicationType;

  title: string;
  venue?: string;
  year?: number;
  url?: string;

  // NEW FIELDS (match backend PublicationResponse)
  authors?: string;
  externalLink?: string;
  publishedDate?: string; // backend LocalDate -> "YYYY-MM-DD"
  keywords?: string;

  journalTitle?: string;
  volumeIssue?: string;
  pages?: string;
  doi?: string;
  publisher?: string;

  pdfPath?: string; // e.g. "/files/publications/pub_1_....pdf"
};

export type PublicationRequest = {
  type: PublicationType;

  title: string;
  venue?: string;
  year?: number;
  url?: string;

  // NEW FIELDS (match backend PublicationRequest)
  authors?: string;
  externalLink?: string;
  publishedDate?: string; // send as "YYYY-MM-DD"
  keywords?: string;

  journalTitle?: string;
  volumeIssue?: string;
  pages?: string;
  doi?: string;
  publisher?: string;

  // IMPORTANT: no pdfPath here
  // PDF is uploaded separately via multipart endpoint
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

// Upload PDF (multipart/form-data)
// Backend: POST /api/publications/me/{publicationId}/pdf  (field name: "file")
export const uploadPublicationPdf = async (publicationId: number, file: File): Promise<PublicationDto> => {
  const fd = new FormData();
  fd.append("file", file);

  const res = await api.post(`/api/publications/me/${publicationId}/pdf`, fd, {
    headers: {
           "Content-Type": "multipart/form-data"
    }
  });

  return res.data;
};



export const deletePublicationAdmin = async (id: number): Promise<void> => {
  await api.delete(`/api/publications/${id}`);
};
