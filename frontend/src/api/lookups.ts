import api from "./axios";

export type LookupCategory =
  | "CITY"
  | "FACULTY"
  | "EXPERT_AREA"
  | "COMPANY_DOMAIN";


export const suggestLookup = async (
  category: LookupCategory,
  q: string
): Promise<string[]> => {
  const res = await api.get("/api/lookups", { params: { category, q } });
  return res.data;
};

export const upsertLookup = async (category: LookupCategory, value: string) => {
  const res = await api.post("/api/lookups", { category, value });
  return res.data;
};
