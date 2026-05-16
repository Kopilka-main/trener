import { z, ZodError } from 'zod';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Возвращает разобранное (output) значение схемы — с учётом .default()/.transform().
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new HttpError(400, 'Validation failed', err.errors);
    }
    throw err;
  }
}

export function requireRow<T>(row: T | undefined, name = 'Resource'): T {
  if (!row) throw new HttpError(404, `${name} not found`);
  return row;
}

// req с params как Record<string,string> — корректный тип для именованных параметров маршрута.
type AppRequest = Omit<Request, 'params'> & { params: Record<string, string> };

// Оборачивает async-обработчик: ошибки уходят в next().
export function asyncHandler(fn: (req: AppRequest, res: Response) => Promise<void> | void): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as unknown as AppRequest, res)).catch(next);
  };
}
