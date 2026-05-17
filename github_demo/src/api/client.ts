// Демо-режим: вместо запросов к серверу всё обрабатывает локальный
// бэкенд на localStorage (demo-backend.ts). Интерфейс `api` не меняется,
// поэтому все хуки в api/* работают без изменений.
import { demoRequest } from './demo-backend';

export type ApiError = { error: string; details?: unknown; status: number };

function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      resolve(demoRequest<T>(method, path, body));
    } catch (e) {
      reject(e);
    }
  });
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => call<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  delete: <T = void>(path: string) => call<T>('DELETE', path),
};
