import api from "./axios"; 

export type AttachmentDto = {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type MessageDto = {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  attachments?: AttachmentDto[];
};

export type ConversationListItem = {
  conversationId: number;
  otherUserId: number;
  otherName: string;
  otherRole: string;
  otherAvatarUrl?: string | null;
  lastMessagePreview: string;
};

export const listConversations = async () => {
  const res = await api.get("/api/messages/conversations");
  return res.data as ConversationListItem[];
};

export const getLatestMessages = async (conversationId: number, limit: number) => {
  const res = await api.get(`/api/messages/conversations/${conversationId}/messages`, {
    params: { limit }
  });
  return res.data as MessageDto[];
};

// ✅ NOU: trimite multipart (text + pdf optional)
export const sendMessageMultipart = async (conversationId: number, content: string, file?: File | null) => {
  const fd = new FormData();
  if (content?.trim()) fd.append("content", content.trim());
  if (file) fd.append("file", file);

  const res = await api.post(`/api/messages/conversations/${conversationId}/messages`, fd);
  return res.data as MessageDto;
};


export const downloadAttachment = async (attachmentId: number) => {
  const res = await api.get(`/api/messages/attachments/${attachmentId}`, {
    responseType: "blob"
  });
  return res.data as Blob;
};

export const deleteConversationForMe = async (conversationId: number) => {
  await api.delete(`/api/messages/conversations/${conversationId}`);
};



export const getOrCreateDirectConversation = async (otherUserId: number) => {
  const res = await api.post(`/api/messages/conversations/direct/${otherUserId}`);
  return res.data as { conversationId: number };
};

