/**
 * Centralized API Client for JW Meeting Assistant
 * Connects to FastAPI Modular Monolith backend via Tailscale Private Network
 */

import { BackendHealthResponse } from '@/types/api';

export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://100.100.100.100:8000/api/v1';

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;
  public tamilMessage: string;

  constructor(
    message: string,
    tamilMessage: string,
    status: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.tamilMessage = tamilMessage;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed') {
    super(
      message,
      'சர்வர் இணைப்பை அணுக முடியவில்லை. உங்கள் Tailscale VPN அல்லது இணைய இணைப்பை சரிபார்க்கவும்.',
      0,
      'NETWORK_UNREACHABLE'
    );
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      'கோரிக்கை காலாவதியானது (Request Timed Out). சர்வர் பதிலளிக்க அதிக நேரம் எடுத்தது.',
      408,
      'REQUEST_TIMEOUT'
    );
    this.name = 'TimeoutError';
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiClient {
  private baseUrl: string;

  constructor(initialBaseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = this.normalizeUrl(initialBaseUrl);
  }

  public setBaseUrl(url: string): void {
    if (url && url.trim()) {
      this.baseUrl = this.normalizeUrl(url.trim());
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private normalizeUrl(url: string): string {
    let clean = url.trim().replace(/\/+$/, '');
    // Ensure /api/v1 suffix if omitted
    if (!clean.endsWith('/api/v1') && !clean.includes('/api/')) {
      clean = `${clean}/api/v1`;
    }
    return clean;
  }

  /**
   * Performs an HTTP request with timeout and error handling.
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeoutMs = 15000,
      params,
      headers: customHeaders,
      ...fetchOptions
    } = options;

    // Construct full URL with optional query parameters
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let fullUrl = `${this.baseUrl}${cleanEndpoint}`;

    if (params) {
      const queryParts: string[] = [];
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          queryParts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`
          );
        }
      }
      if (queryParts.length > 0) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParts.join('&');
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(fullUrl, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...customHeaders,
        },
      });

      clearTimeout(timeoutId);

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const responseText = await response.text();
      let responseData: any = null;
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
      }

      if (!response.ok) {
        const errorDetail =
          responseData?.detail?.message ||
          responseData?.detail ||
          responseData?.message ||
          response.statusText ||
          'Unknown server error';

        const errorCode = responseData?.detail?.code || `HTTP_${response.status}`;

        let tamilMsg = 'சர்வரில் பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.';
        if (response.status === 404) {
          tamilMsg = 'கோரப்பட்ட தகவல் அல்லது பதிவு கிடைக்கவில்லை.';
        } else if (response.status === 400 || response.status === 422) {
          tamilMsg = 'அனுப்பப்பட்ட விவரங்களில் பிழை உள்ளது.';
        } else if (response.status >= 500) {
          tamilMsg = 'சர்வர் உள் பிழை. சர்வர் பதிவுகளை சரிபார்க்கவும்.';
        }

        throw new ApiError(
          String(errorDetail),
          tamilMsg,
          response.status,
          errorCode,
          responseData?.detail?.details
        );
      }

      return responseData as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new TimeoutError(timeoutMs);
      }

      // Fetch network failure (DNS failure, connection refused, offline)
      throw new NetworkError(err.message || 'Failed to reach server');
    }
  }

  public async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params,
      ...options,
    });
  }

  public async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public async put<T>(
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public async delete<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  /**
   * Verifies health connectivity with the backend.
   * Useful for the Settings screen and auto-detecting Tailscale node availability.
   */
  public async checkHealth(): Promise<{
    isOnline: boolean;
    latencyMs?: number;
    service?: string;
    version?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const result = await this.get<BackendHealthResponse>('/health', undefined, {
        timeoutMs: 6000,
      });
      const latencyMs = Date.now() - startTime;
      return {
        isOnline: result.status === 'healthy',
        latencyMs,
        service: result.service,
        version: result.version,
      };
    } catch (err: any) {
      return {
        isOnline: false,
        error: err.tamilMessage || err.message || 'இணைக்க முடியவில்லை',
      };
    }
  }
}

// Global API Client Singleton
export const apiClient = new ApiClient();
