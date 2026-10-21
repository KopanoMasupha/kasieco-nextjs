import { NextResponse } from "next/server";
import { answerQuestion, helpbotSystemPrompt } from "@/lib/helpbot";
import { askClaude } from "@/lib/server/claude";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { messages, role } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    role?: string;
  };
  const last = [...(messages || [])].reverse().find((m) => m.role === "user");
  if (!last) return NextResponse.json({ error: "No question" }, { status: 400 });

  const rules = answerQuestion(last.content);
  const fromClaude = await askClaude(helpbotSystemPrompt(role || "consumer"), messages.slice(-8), 300);

  return NextResponse.json({
    text: fromClaude ?? rules.text,
    links: rules.links,
    source: fromClaude ? "claude" : "rules",
  });
}
