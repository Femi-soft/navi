import { classifyIntent } from "@navi/ai";
import { z } from "zod";

const requestSchema = z.object({ message: z.string().min(1).max(2_000) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ code: "INVALID_REQUEST", message: "Enter a message under 2,000 characters.", retryable: true }, { status: 400 });
  return Response.json({ intent: classifyIntent(parsed.data.message), message: "I can inspect sample portfolio and opportunity data. Live account actions are disabled in this scaffold.", suggestedActions: ["Review opportunities", "Set my risk limits"] });
}
