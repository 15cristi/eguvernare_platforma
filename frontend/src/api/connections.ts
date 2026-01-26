import api from "./axios";

export type ConnectionRequestDto = {
  id: number;
  fromUserId: number;
  fromFirstName?: string;
  fromLastName?: string;
  fromRole?: string;
  fromAvatarUrl?: string | null;
  createdAt?: string;
};

export type ConnectedProfileDto = {
  userId: number;
  firstName?: string;
  lastName?: string;
  role?: string;
  headline?: string;
  avatarUrl?: string | null;
};

export async function sendConnectionRequest(userId: number): Promise<void> {
  await api.post(`/api/connections/request/${userId}`);
}

export async function getIncomingConnectionRequests(): Promise<ConnectionRequestDto[]> {
  const res = await api.get<ConnectionRequestDto[]>("/api/connections/requests/incoming");
  return res.data;
}

export async function acceptConnectionRequest(id: number): Promise<void> {
  await api.post(`/api/connections/requests/${id}/accept`);
}

export async function rejectConnectionRequest(id: number): Promise<void> {
  await api.post(`/api/connections/requests/${id}/reject`);
}

export async function getConnections(): Promise<ConnectedProfileDto[]> {
  const res = await api.get<ConnectedProfileDto[]>("/api/connections");
  return res.data;
}
