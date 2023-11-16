import { getChatCompletion } from "./openai"

// あなたはファイルのコンテンツを要約する. 一行ずつ箇条書きで答えてください.
const template = `
あなたはファイルのコンテンツ内容を表すようなキーワードを羅列して下さい. 一行にひとつづつキーワードを書いてください.

コンテンツ:
@@CONTENT@@

キーワード:
`

export async function summarize(fileContent: string) {
  return await getChatCompletion([{
    role: "user",
    content: template.replace("@@CONTENT@@", fileContent),
  }])
}