export interface Connector {
  id: string;
  name: string;
  encrypted_config: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectorData {
  name: string;
  encrypted_config: string;
}

export interface UpdateConnectorData {
  encrypted_config?: string;
}

export type ConnectorName = 'plaid' | 'cherry' | 'docusign' | 'dropboxsign' | 'clear' | string;