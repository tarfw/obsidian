import { Data } from 'effect';

export class HarnessError extends Data.TaggedError('HarnessError')<{
  readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503;
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const badRequest = (message: string) => new HarnessError({ status: 400, message });
export const unauthorized = () => new HarnessError({ status: 401, message: 'Authentication is required.' });
export const forbidden = () => new HarnessError({ status: 403, message: 'You do not have access to this workspace.' });
export const notFound = (message: string) => new HarnessError({ status: 404, message });
export const conflict = (message: string) => new HarnessError({ status: 409, message });
export const unavailable = (message: string, cause?: unknown) => new HarnessError({ status: 503, message, cause });
