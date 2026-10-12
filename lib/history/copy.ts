/** English count copy. One uses the singular word. Two or more uses the plural. */
export function pluralCount(count: number, singular: string, plural = `${singular}s`): string {
  const amount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `${amount} ${amount === 1 ? singular : plural}`;
}
