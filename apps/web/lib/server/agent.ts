import { createHash } from "node:crypto";
import {
  agentAnswerJsonSchema,
  buildAgentInput,
  buildAgentInstructions,
  parseAgentAnswer,
  type AgentAnswer,
  type AgentContext,
  type AgentHistoryItem,
  type AgentIntent,
} from "@navi/ai";
import type { AgentConfig } from "./config";

type OpenAiResponse = {
  status?: string;
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function responseText(response: OpenAiResponse) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("") ?? "";
}

function providerRequest(config: AgentConfig, input: {
  message: string;
  history: AgentHistoryItem[];
  intent: AgentIntent;
  context: AgentContext;
  sessionAddress: string;
}) {
  if (config.provider === "groq") {
    return {
      model:config.model,
      messages:[
        { role:"system", content:buildAgentInstructions() },
        { role:"user", content:buildAgentInput(input) },
      ],
      max_completion_tokens:800,
      store:false,
      response_format:{
        type:"json_schema",
        json_schema:{ name:"navi_agent_answer", strict:true, schema:agentAnswerJsonSchema },
      },
    };
  }
  return {
    model:config.model,
    instructions:buildAgentInstructions(),
    input:buildAgentInput(input),
    max_output_tokens:800,
    store:false,
    safety_identifier:createHash("sha256").update(input.sessionAddress.toLowerCase()).digest("hex"),
    text:{
      format:{ type:"json_schema", name:"navi_agent_answer", strict:true, schema:agentAnswerJsonSchema },
    },
  };
}

export async function requestAgentAnswer(input: {
  config: AgentConfig;
  message: string;
  history: AgentHistoryItem[];
  intent: AgentIntent;
  context: AgentContext;
  sessionAddress: string;
  fetcher?: typeof fetch;
}): Promise<AgentAnswer> {
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(input.config.apiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(providerRequest(input.config, input)),
    cache: "no-store",
    signal: AbortSignal.timeout(input.config.timeoutMs),
  });

  if (!response.ok) {
    let providerCode = "unknown";
    try {
      const errorPayload = await response.json() as { error?: { code?: string } };
      if (typeof errorPayload.error?.code === "string" && /^[a-z0-9_]+$/i.test(errorPayload.error.code)) providerCode = errorPayload.error.code;
    } catch { /* keep provider diagnostics bounded */ }
    throw new Error(`LLM_PROVIDER_ERROR:${input.config.provider}:${response.status}:${providerCode}`);
  }
  const payload = await response.json() as OpenAiResponse | GroqResponse;
  if (input.config.provider === "openai" && "status" in payload && payload.status && payload.status !== "completed") throw new Error("LLM_RESPONSE_INCOMPLETE");
  const text = input.config.provider === "groq"
    ? (payload as GroqResponse).choices?.[0]?.message?.content ?? ""
    : responseText(payload as OpenAiResponse);
  if (!text) throw new Error("LLM_RESPONSE_EMPTY");
  return parseAgentAnswer(text);
}
