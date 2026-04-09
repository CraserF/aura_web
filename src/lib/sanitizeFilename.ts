export function sanitizeFilename(name: string, maxLength: number = 60): string {
  return (
    name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, maxLength) || 'untitled'
  );
}
