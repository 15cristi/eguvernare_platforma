import api from "./axios";

export type AuthorDto = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
};

export type CommentDto = {
  id: number;
  author: AuthorDto;
  content: string;
  createdAt: string;
};

export type PostDto = {
  id: number;
  author: AuthorDto;
  content: string;
  imageUrl?: string | null;   // <-- adaugat
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  latestComments: CommentDto[];
};

export async function getAnnouncementsFeed(page = 0, size = 10): Promise<PostDto[]> {
  const res = await api.get("/api/announcements/feed", { params: { page, size } });
  return res.data;
}

export async function createAnnouncement(content: string, imageUrl?: string | null): Promise<PostDto> {
  const res = await api.post("/api/announcements", { content, imageUrl: imageUrl || null });
  return res.data;
}

export async function toggleAnnouncementLike(postId: number): Promise<PostDto> {
  const res = await api.post(`/api/announcements/${postId}/like`);
  return res.data;
}

export async function addAnnouncementComment(postId: number, content: string): Promise<CommentDto> {
  const res = await api.post(`/api/announcements/${postId}/comments`, { content });
  return res.data;
}
