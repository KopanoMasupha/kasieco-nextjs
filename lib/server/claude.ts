/**
 * Optional Claude call. Without ANTHROPIC_API_KEY every AI feature still works
 * from the built-in rules; with it, the wording comes from Claude instead.
 */
export async function askClaude(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens = 400) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.find((c: any) => c.type === "text")?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}
