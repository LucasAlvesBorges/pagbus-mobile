export const formatBusLineName = (
  name?: string | null,
  fallback = ''
): string => {
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.toUpperCase();
  }
  return fallback;
};

