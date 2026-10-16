/** Reads one KEY=value line. The value is never logged. */
export function envValueFromText(text: string, name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return "";
  const line = text.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  if (!line) return "";
  let value = line.slice(name.length + 1).trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

/** Process environment first, then the supplied file texts in order. */
export function envValue(name: string, files: readonly string[]): string {
  const current = process.env[name];
  if (current) return String(current);
  for (const text of files) {
    const value = envValueFromText(text, name);
    if (value) return value;
  }
  return "";
}
