const DEFAULT_API_URL = 'http://localhost:3000/api';
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

class ApiClient {
  private getHeaders(customHeaders: HeadersInit = {}): Headers {
    const headers = new Headers(customHeaders);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
      const errBody = await response.json().catch(() => ({}));
      throw {
        code: errBody.code || 'AUTH_TOKEN_INVALID',
        message: errBody.message || 'Unauthorized access.',
      } as ApiError;
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw {
        code: errBody.code || 'INTERNAL_ERROR',
        message: errBody.message || 'An unexpected error occurred.',
        details: errBody.details,
      } as ApiError;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  public async get<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      method: 'GET',
      headers: this.getHeaders(options.headers),
    });
    return this.handleResponse<T>(response);
  }

  public async post<T>(path: string, body: any, options: RequestInit = {}): Promise<T> {
    let finalOptions = { ...options };
    let finalBody = body;

    if (body instanceof FormData) {
      const headers = this.getHeaders(options.headers);
      headers.delete('Content-Type'); // Let fetch set form-data boundary
      finalOptions.headers = headers;
    } else {
      finalOptions.headers = this.getHeaders(options.headers);
      finalBody = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...finalOptions,
      method: 'POST',
      body: finalBody,
    });
    return this.handleResponse<T>(response);
  }

  public async patch<T>(path: string, body: any, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      method: 'PATCH',
      headers: this.getHeaders(options.headers),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  public async put<T>(path: string, body: any, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      method: 'PUT',
      headers: this.getHeaders(options.headers),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  public async delete<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      method: 'DELETE',
      headers: this.getHeaders(options.headers),
    });
    return this.handleResponse<T>(response);
  }

  public async uploadFile(presignedUrl: string, file: File, onProgress?: (percentage: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignedUrl);
      
      xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress(percentage);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject({
            code: 'FILE_UPLOAD_FAILED',
            message: `Failed to upload file to storage. Status: ${xhr.status}`,
          } as ApiError);
        }
      };

      xhr.onerror = () => {
        reject({
          code: 'FILE_UPLOAD_FAILED',
          message: 'Network error occurred during file upload.',
        } as ApiError);
      };

      xhr.send(file);
    });
  }
}

export const api = new ApiClient();
export default api;
