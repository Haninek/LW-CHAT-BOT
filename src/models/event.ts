export interface Event {
  id: string;
  type: string; // e.g., 'sign.completed', 'sign.declined', etc.
  client_id: string;
  data: string; // JSON string
  created_at: string;
}

export interface CreateEventData {
  type: string;
  client_id: string;
  data: object;
}