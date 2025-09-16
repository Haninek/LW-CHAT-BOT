export interface Client {
  id: string;
  phone: string;
  email?: string | null;
  consent_opted_in: boolean;
  consent_revoked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  phone: string;
  email?: string | null;
  consent_opted_in?: boolean;
}

export interface UpdateClientData {
  email?: string | null;
  consent_opted_in?: boolean;
  consent_revoked_at?: string | null;
}