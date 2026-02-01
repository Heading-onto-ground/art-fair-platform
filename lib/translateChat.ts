export async function translateText(text: string, target: string) {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target }),
  });

  const data = await res.json();
  return data.translated || text;
}
