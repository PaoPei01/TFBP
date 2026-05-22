import { getFriendlyErrorMessage } from '../lib/errorMessages';

export function errorMessage(error: unknown, fallback: string) {
  const language = /[\u0E00-\u0E7F]/.test(fallback) ? 'th' : 'en';
  return getFriendlyErrorMessage(error, language, undefined, fallback);
}
