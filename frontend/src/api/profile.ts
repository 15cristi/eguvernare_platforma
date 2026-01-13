import api from "./axios";

/**
 * Tipul REAL al profilului, identic cu DB + backend
 */
export interface ProfileUpdatePayload {
  headline?: string;
  bio?: string;
  country?: string;
  city?: string;

  affiliation?: string;
  profession?: string;
  university?: string;

  faculty?: string;

  expertAreas?: string[];

  expertise?: { area: string; description: string }[];

  resources?: { title: string; description: string; url: string }[];

  companyName?: string;
  companyDescription?: string;
  companyDomains?: string[];

  availability?: "FULL_TIME" | "PART_TIME" | "WEEKENDS";
  experienceLevel?: "JUNIOR" | "MID" | "SENIOR";
  openToProjects?: boolean;
  openToMentoring?: boolean;
  linkedinUrl?: string;
  githubUrl?: string;
  website?: string;
}

export const getMyProfile = async () => {
  const res = await api.get("/api/profile/me");
  return res.data;
};

export const getProfileByUserId = async (userId: number) => {
  const res = await api.get(`/api/profile/${userId}`);
  return res.data;
};

export const updateMyProfile = async (profile: ProfileUpdatePayload) => {
  const res = await api.put("/api/profile/me", profile);
  return res.data;
};

export const saveAvatarUrl = async (avatarUrl: string) => {
  const res = await api.put("/api/profile/me/avatar", { avatarUrl });
  return res.data;
};
