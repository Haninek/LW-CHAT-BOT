import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '@/state/useAppStore'

class ApiClient {
  private getConfig() {
    return useAppStore.getState().apiConfig
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string; timestamp: string }> {
    const config = this.getConfig()
    const url = `${config.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    const method = (options.method || 'GET').toUpperCase()
    const hasIdempotencyHeader = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'idempotency-key'
    )

    // Add API key if available
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    // Add idempotency key for POST requests if enabled
    if (config.idempotencyEnabled && method === 'POST' && !hasIdempotencyHeader) {
      headers['Idempotency-Key'] = uuidv4()
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // Health endpoints
  async getHealth() {
    return this.request<{ status: string; uptime: number; timestamp: string }>('/api/healthz')
  }

  async getReadiness() {
    return this.request<{ 
      ready: boolean
      checks: Record<string, boolean>
    }>('/api/readyz')
  }

  // Bank analysis
  async uploadBankStatements(params: { merchantId: string; dealId: string; files: File[]; idem?: string }) {
    const { merchantId, dealId, files, idem } = params
    if (files.length !== 3) throw new Error("Exactly 3 PDF statements are required.")

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    const config = this.getConfig()
    const url = `${config.baseUrl}/api/documents/bank/upload?merchant_id=${encodeURIComponent(merchantId)}&deal_id=${encodeURIComponent(dealId)}`
    
    const headers: Record<string, string> = {}
    
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }
    
    if (idem || config.idempotencyEnabled) {
      headers['Idempotency-Key'] = idem ?? uuidv4()
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })

    return this.handleJSON(response)
  }

  async parseStatements(params: { merchantId: string; dealId: string; idem?: string }) {
    const { merchantId, dealId, idem } = params
    const endpoint = `/api/statements/parse?merchant_id=${encodeURIComponent(merchantId)}&deal_id=${encodeURIComponent(dealId)}`

    const options: RequestInit = {
      method: 'POST',
      body: JSON.stringify({})
    }

    if (idem) {
      options.headers = {
        'Idempotency-Key': idem
      }
    }

    return this.request(endpoint, options)
  }

  async createMerchant(params: {
    legalName: string
    dba?: string
    phone?: string
    email?: string
    ein?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    idem?: string
  }) {
    const { legalName, dba, phone, email, ein, address, city, state, zip, idem } = params

    const payload = {
      legal_name: legalName,
      dba,
      phone,
      email,
      ein,
      address,
      city,
      state,
      zip,
    }

    const options: RequestInit = {
      method: 'POST',
      body: JSON.stringify(payload)
    }

    if (idem) {
      options.headers = {
        'Idempotency-Key': idem
      }
    }

    return this.request('/api/merchants/create', options)
  }

  async startDeal(params: { merchantId: string; fundingAmount?: number; idem?: string }) {
    const { merchantId, fundingAmount, idem } = params
    const payload: Record<string, unknown> = {
      merchant_id: merchantId
    }

    if (typeof fundingAmount === 'number') {
      payload.funding_amount = fundingAmount
    }

    const options: RequestInit = {
      method: 'POST',
      body: JSON.stringify(payload)
    }

    if (idem) {
      options.headers = {
        'Idempotency-Key': idem
      }
    }

    return this.request('/api/deals/start', options)
  }

  private async handleJSON(res: Response) {
    const text = await res.text()
    try {
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) {
        const msg = (json && (json.detail || json.error)) || res.statusText || "Request failed"
        throw new Error(`${res.status} ${msg}`)
      }
      return json
    } catch (e) {
      if (!res.ok) throw new Error(`${res.status} ${text || res.statusText}`)
      throw e
    }
  }

  // Offers
  async generateOffers(metrics: any, overrides?: any) {
    return this.request('/api/offers/simple', {
      method: 'POST',
      body: JSON.stringify({ metrics, overrides }),
    })
  }

  // Plaid
  async createLinkToken() {
    return this.request('/api/plaid/link-token', {
      method: 'POST',
    })
  }

  // Connectors
  async getConnectors() {
    return this.request('/api/connectors')
  }

  async saveConnector(config: any) {
    return this.request('/api/connectors', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async validateConnector(id: string) {
    return this.request(`/api/connectors/${id}/validate`, {
      method: 'POST',
    })
  }

  // Background checks
  async startBackgroundCheck(person: any) {
    return this.request('/api/background/check', {
      method: 'POST',
      body: JSON.stringify({ person }),
    })
  }

  async getBackgroundJob(jobId: string) {
    return this.request(`/api/background/jobs/${jobId}`)
  }

  async getClientBackgroundJobs(clientId: string) {
    return this.request(`/api/background/client/${clientId}/jobs`)
  }

  // Monthly analysis
  async getMonthlyRows(dealId: string) {
    const endpoint = `/api/statements/monthly?deal_id=${encodeURIComponent(dealId)}`
    return this.request<{ ok: boolean; rows: any[] }>(endpoint)
  }

  getMonthlyCsvUrl(dealId: string) {
    const cfg = this.getConfig()
    const base = cfg.baseUrl || ''
    return `${base}/api/statements/monthly.csv?deal_id=${encodeURIComponent(dealId)}`
  }

  // E-signature
  async sendSignatureRequest(request: any) {
    return this.request('/api/sign/send', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Events
  async getEvents(params?: { since?: string; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.since) query.set('since', params.since)
    if (params?.limit) query.set('limit', params.limit.toString())
    
    const endpoint = `/api/events${query.toString() ? `?${query.toString()}` : ''}`
    return this.request(endpoint)
  }

  // Merchant resolution (for Rules + Intake Simulator)
  async resolveMerchant(phone?: string, email?: string) {
    const params = new URLSearchParams()
    if (phone) params.append('phone', phone)
    if (email) params.append('email', email)
    
    const queryString = params.toString()
    const endpoint = `/api/merchants/resolve${queryString ? `?${queryString}` : ''}`
    
    try {
      return await this.request(endpoint, { method: 'GET' })
    } catch (error) {
      // If backend doesn't support merchant resolution, return mock data
      const sampleMerchants = []  // Mock data removed
      console.warn('Merchant resolution not available, using mock data')
      
      if (phone || email) {
        // Return existing merchant with some data
        return { success: true, data: sampleMerchants[1], timestamp: new Date().toISOString() }
      } else {
        // Return new merchant
        return { success: true, data: sampleMerchants[0], timestamp: new Date().toISOString() }
      }
    }
  }

  // Rules (if backend supports it)
  async saveRules(rules: any[]) {
    try {
      return await this.request('/api/rules', {
        method: 'POST',
        body: JSON.stringify({ rules }),
      })
    } catch (error) {
      // Backend might not support rules endpoint, that's okay
      console.warn('Rules endpoint not available, using localStorage only')
      return { success: true, data: rules, timestamp: new Date().toISOString() }
    }
  }

  // Monthly statement analysis
  async getMonthlyRows(dealId: string) {
    const endpoint = `/api/statements/monthly?deal_id=${encodeURIComponent(dealId)}`
    return this.request<{ ok: boolean; rows: any[] }>(endpoint)
  }

  getMonthlyCsvUrl(dealId: string) {
    const cfg = this.getConfig()
    const base = cfg.baseUrl || ''
    return `${base}/api/statements/monthly.csv?deal_id=${encodeURIComponent(dealId)}`
  }

  async getTransactions(dealId: string) {
    const endpoint = `/api/statements/transactions?deal_id=${encodeURIComponent(dealId)}`
    return this.request(endpoint)
  }
}

export const apiClient = new ApiClient()

// Export as both apiClient and api for compatibility
export const api = apiClient