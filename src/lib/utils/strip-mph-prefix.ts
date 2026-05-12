export function stripMphPrefix(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(/^MPH United\s*\/\s*/i, '').trim();
}
