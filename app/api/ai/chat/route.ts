import { NextResponse } from "next/server";
import { answerHelp, HELP_TOPICS } from "@/lib/helpbot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { message?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = payload.message?.trim();
  if (!message || message.length > 1000) {
    return NextResponse.json({ error: "Enter a question of 1,000 characters or fewer" }, { status: 400 });
  }
  const fallback = answerHelp(message);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ answer: fallback, source: "knowledge-base" });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 240,
        messages: [{
          role: "user",
          content: `Answer the user's KasiEco question only using these verified product facts. Be brief and plain-language. If unsupported, say the feature is not available yet. Do not invent features. Facts:\n${JSON.stringify(HELP_TOPICS)}\n\nQuestion: ${message}`,
        }],
      }),
    });
    if (!response.ok) {
      console.error("Anthropic help request failed", response.status, await response.text());
      return NextResponse.json({ answer: fallback, source: "knowledge-base" });
    }
    const data = await response.json();
    const answer = data.content?.find((item: { type?: string; text?: string }) => item.type === "text")?.text;
    if (!answer) {
      console.error("Anthropic help response contained no text");
      return NextResponse.json({ answer: fallback, source: "knowledge-base" });
    }
    return NextResponse.json({ answer: String(answer).trim(), source: "claude" });
  } catch (error) {
    console.error("Anthropic help request could not be completed", error);
    return NextResponse.json({ answer: fallback, source: "knowledge-base" });
  }
}
