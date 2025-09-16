export interface Agreement {
  id: string;
  client_id: string;
  provider: 'docusign' | 'dropboxsign';
  envelope_id: string;
  status: 'sent' | 'completed' | 'declined' | 'error';
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAgreementData {
  client_id: string;
  provider: 'docusign' | 'dropboxsign';
  envelope_id: string;
  status?: 'sent' | 'completed' | 'declined' | 'error';
}

export interface UpdateAgreementData {
  status?: 'sent' | 'completed' | 'declined' | 'error';
  completed_at?: string | null;
}