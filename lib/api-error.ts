import type { AxiosError } from 'axios';

// Turns an error from an API call into one short sentence for the screen.
// NestJS answers errors with { statusCode, message, error }, where "message" is
// either a sentence or a list of validation messages.

type ApiErrorBody = { message?: string | string[] };

export function getErrorMessage(error: unknown): string {
  const axiosError = error as Partial<AxiosError<ApiErrorBody>> | null;
  if (axiosError && axiosError.isAxiosError) {
    const response = axiosError.response;
    if (response === undefined || response === null) {
      return 'Cannot reach the server. Check that brain_server is running, then try again.';
    }
    const message = response.data?.message;
    if (Array.isArray(message) && message.length > 0) {
      return message.join('; ');
    }
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
    return `The server answered with an error (${response.status}).`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
