import api from "./axios";

export const getExpertAreas = async (): Promise<string[]> => {
  const res = await api.get("/api/metadata/expert-areas");
  return res.data;
};

export const getCompanyDomains = async (): Promise<string[]> => {
  const res = await api.get("/api/metadata/company-domains");
  return res.data;
};
