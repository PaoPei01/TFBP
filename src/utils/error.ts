export function errorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  if (!message) return fallback;

  const technicalPatterns = [
    'function',
    'rpc',
    'relation',
    'column',
    'constraint',
    'invalid input syntax',
    'violates',
    'permission denied',
    'row-level security',
    'schema cache',
    'pgrst',
    'postgres',
    'sql',
  ];
  const lowerMessage = message.toLowerCase();
  if (technicalPatterns.some((pattern) => lowerMessage.includes(pattern))) {
    return fallback;
  }

  return message;
}
