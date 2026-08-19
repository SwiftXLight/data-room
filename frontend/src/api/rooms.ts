import api from "../api/client";

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomResponse extends Room {
  rootFolderId: string | null;
}

export interface RoomDetail extends CreateRoomResponse {}

export const roomsApi = {
  list: (): Promise<Room[]> => api.get<Room[]>("/rooms"),

  get: (roomId: string): Promise<RoomDetail> =>
    api.get<RoomDetail>(`/rooms/${roomId}`),

  create: (name: string): Promise<CreateRoomResponse> =>
    api.post<CreateRoomResponse>("/rooms", { name }),
};
