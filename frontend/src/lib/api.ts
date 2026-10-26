const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId?: string;
    timestamp: string;
    total?: number;
    page?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('securechainflow_token');
  }

  public setAuthToken(token: string): void {
    localStorage.setItem('securechainflow_token', token);
  }

  public clearAuthToken(): void {
    localStorage.removeItem('securechainflow_token');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const body: ApiResponse<T> = await response.json();

      if (!response.ok || !body.success) {
        const errorMsg = body.error?.message || `API error (${response.status})`;
        const error = new Error(errorMsg);
        (error as any).code = body.error?.code || 'API_ERROR';
        (error as any).status = response.status;
        (error as any).details = body.error?.details;
        throw error;
      }

      return body.data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network connection error: Unable to reach SecureChainFlow API.');
      }
      throw err;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
