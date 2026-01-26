import api from "./axios";
import type { PageResponse } from "./types";

export type MatchingProfileDto = {
  userId: number;
  firstName?: string;
  lastName?: string;
  role?: string;

  headline?: string;
  country?: string;
  city?: string;
  profession?: string;
  faculty?: string;

  expertAreas?: string[];
  availability?: string;
  experienceLevel?: string;
  openToProjects?: boolean;
  openToMentoring?: boolean;

  avatarUrl?: string | null;
    connectionStatus?: "NONE" | "OUTGOING_PENDING" | "INCOMING_PENDING" | "CONNECTED";

};

export type MatchingSort =
  | "NAME"
  | "EXPERTISE_AREA"
  | "AVAILABILITY"
  | "OPEN_TO_PROJECTS"
  | "OPEN_TO_MENTORING"
  | "EXPERIENCE_LEVEL";

export const getMatchingProfiles = async (params: {
  page?: number;
  size?: number;
  q?: string;
  expertiseArea?: string;
  availability?: string;
  openToProjects?: boolean | null;
  openToMentoring?: boolean | null;
  experienceLevel?: string;
  sort?: MatchingSort;
  dir?: "ASC" | "DESC";
}): Promise<PageResponse<MatchingProfileDto>> => {
  const res = await api.get<PageResponse<MatchingProfileDto>>("/api/matching/profiles", {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
      q: params.q || undefined,
      expertiseArea: params.expertiseArea || undefined,
      availability: params.availability || undefined,
      openToProjects: params.openToProjects == null ? undefined : params.openToProjects,
      openToMentoring: params.openToMentoring == null ? undefined : params.openToMentoring,
      experienceLevel: params.experienceLevel || undefined,
      sort: params.sort || "NAME",
      dir: params.dir || "ASC"
    }
  });

  return res.data;
};
