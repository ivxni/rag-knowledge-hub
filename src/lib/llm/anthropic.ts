/**
 * Anthropic (Claude) generation provider.
 * Uses Vercel AI SDK for a consistent interface across LLM providers.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import type { GenerationProvider } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export class AnthropicProvider implements GenerationProvider {
  private model: string;

  constructor(model?: string) {
    this.model = model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    const { text } = await generateText({
      model: anthropic(this.model),
      system: systemPrompt,
      prompt: userMessage,
    });

    return text;
  }

  async streamResponse(
    systemPrompt: string,
    userMessage: string
  ): Promise<ReadableStream> {
    const result = await streamText({
      model: anthropic(this.model),
      system: systemPrompt,
      prompt: userMessage,
    });

    return result.textStream as unknown as ReadableStream;
  }
}
