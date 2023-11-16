import { getEnv } from "../EnvVarManager"
import OpenAI from "openai"

export function buildClient() {
  return new OpenAI({
    apiKey: getEnv().openaiApiKey(),
  })
}

enum Model {
  EmbeddingAdaV2 = "text-embedding-ada-002",
  Gpt35Turbo = "gpt-3.5-turbo",
  Gpt35Turbo16K = "gpt-3.5-turbo-16k-0613",
  Gpt35Turbo1106 = "gpt-3.5-turbo-1106",
}

export async function getEmbedding(text: string) {
  const openai = buildClient()
  const { data, usage } = await openai.embeddings.create({
    model: Model.EmbeddingAdaV2, 
    input: text,
  })
  return {
    vector: data[0].embedding,
    cost: usage.total_tokens * 0.0001 / 1000
  }
}

export async function getChatCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[], config?: {
  topP?: number,
  temparature?: number,
  functions?: OpenAI.Chat.ChatCompletionCreateParams.Function[],
}) {
  const openai = buildClient()
  const modelName = Model.Gpt35Turbo16K
  const { choices, usage } = await openai.chat.completions.create({
    model: modelName, 
    messages: messages,
    temperature: config ? config.temparature : undefined,
    top_p: config ? config.topP : undefined,
    functions: config ? config.functions : undefined,
  })
  if (!usage) {
    throw new Error("usage is null")
  }
  if (choices.length === 0 || !choices[0].message) {
    throw new Error("choices is empty")
  }
  return {
    content: choices[0].message.content || "",
    cost: usage.prompt_tokens * 0.001 / 1000 + usage.completion_tokens * 0.002 / 1000,
    functionCall: choices[0].message.function_call || null,
  }
}

export async function getChatCompletionJson(messages: OpenAI.Chat.ChatCompletionMessage[], config?: {
  topP?: number,
  temparature?: number,
  functions?: OpenAI.Chat.ChatCompletionCreateParams.Function[],
}) {
  const openai = buildClient()
  const modelName = Model.Gpt35Turbo1106
  const { choices, usage } = await openai.chat.completions.create({
    model: modelName, 
    messages: messages,
    temperature: config ? config.temparature : undefined,
    top_p: config ? config.topP : undefined,
    functions: config ? config.functions : undefined,
  }, {
  
  })
  if (!usage) {
    throw new Error("usage is null")
  }
  if (choices.length === 0 || !choices[0].message) {
    throw new Error("choices is empty")
  }
  return {
    content: choices[0].message.content || "",
    cost: usage.prompt_tokens * 0.001 / 1000 + usage.completion_tokens * 0.002 / 1000,
    functionCall: choices[0].message.function_call || null,
  }
}