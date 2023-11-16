import { getChatCompletion } from "./openai"

// あなたはファイルのコンテンツを要約する. 一行ずつ箇条書きで答えてください.
const template = `
あなたはファイルのコンテンツ内容を表すようなキーワードをJSONの配列で答えてください。
以下が例です。
{"keywords": ["kw1", "kw2", "kw3"]}

コンテンツ:
@@CONTENT@@

JSON:
`

export async function summarize(fileContent: string) {
  return await getChatCompletion([{
    role: "user",
    content: template.replace("@@CONTENT@@", fileContent),
  }])
}


const q2kTemplate = `
あなたは以下のクエリをキーワードに変換する. 一行に一つのキーワードずつ箇条書きで答えてください.

クエリ:
@@CONTENT@@

キーワード:
`


export async function queryToKeywords(query: string) {
  return await getChatCompletion([{
    role: "user",
    content: q2kTemplate.replace("@@CONTENT@@", query),
  }])
}