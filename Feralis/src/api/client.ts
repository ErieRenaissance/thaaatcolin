import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, AuthResponse, LoginCredentials, MFAVerification } from '@/types';

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  // ============================================================================
  // INTERCEPTORS
  // ============================================================================

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            
            if (newAccessToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post<AuthResponse>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        this.setTokens(accessToken, newRefreshToken);

        return accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private handleAuthError(): void {
    this.clearTokens();
    window.location.href = '/login';
  }

  // ============================================================================
  // AUTH ENDPOINTS
  // ============================================================================

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/v1/auth/login', credentials);
    
    if (!response.data.requiresMFA) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  }

  async verifyMFA(verification: MFAVerification): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/v1/auth/mfa/verify', verification);
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/v1/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/v1/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/api/v1/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.client.post('/api/v1/auth/reset-password', { token, password });
  }

  // ============================================================================
  // DASHBOARD ENDPOINTS
  // ============================================================================

  async getDashboard(organizationId: string) {
    const response = await this.client.get(`/api/v1/dashboard-enhancements/dashboard/${organizationId}`);
    return response.data;
  }

  async getOEEDashboard(organizationId: string) {
    const response = await this.client.get(`/api/v1/dashboard-enhancements/oee/${organizationId}`);
    return response.data;
  }

  async getProductionHeartbeat(organizationId: string) {
    const response = await this.client.get(`/api/v1/dashboard-enhancements/heartbeat/${organizationId}`);
    return response.data;
  }

  async getBottleneckAnalysis(organizationId: string) {
    const response = await this.client.get(`/api/v1/dashboard-enhancements/bottlenecks/${organizationId}`);
    return response.data;
  }

  async getFinancialPerformance(organizationId: string, period?: string) {
    const response = await this.client.get(`/api/v1/dashboard-enhancements/financial/${organizationId}`, {
      params: { period },
    });
    return response.data;
  }

  async getAlerts(organizationId: string, filters?: any) {
    const response = await this.client.get(`/api/v1/dashboard-enhancements/alerts/${organizationId}`, {
      params: filters,
    });
    return response.data;
  }

  // ============================================================================
  // PORTAL ENDPOINTS
  // ============================================================================

  async getPortalDashboard() {
    const response = await this.client.get('/api/v1/portal/dashboard');
    return response.data;
  }

  async getPortalOrders(filters?: any) {
    const response = await this.client.get('/api/v1/portal/orders', { params: filters });
    return response.data;
  }

  async getPortalQuotes(filters?: any) {
    const response = await this.client.get('/api/v1/portal/quotes', { params: filters });
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.post(`/api/v1/portal/notifications/${notificationId}/read`);
    return response.data;
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  async getAnalyticsSummary(organizationId: string, period?: string) {
    const response = await this.client.get(`/api/v1/analytics/summary/${organizationId}`, {
      params: { period },
    });
    return response.data;
  }

  async getKPIs(organizationId: string) {
    const response = await this.client.get(`/api/v1/analytics/kpis/${organizationId}`);
    return response.data;
  }

  // ============================================================================
  // GENERIC HTTP METHODS
  // ============================================================================

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
