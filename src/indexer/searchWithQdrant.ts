import { getEnv } from "../EnvVarManager"
import { QdrantStorage } from "../storage/QdrantStorage"
import readline from "readline/promises"
import { FileInfo } from "../types/FileInfo"
import { queryToKeywords } from "../llm/usecases"


async function main() {
  const qdrantUrl = getEnv().qdrantUrl()
  const qdrantApiKey = getEnv().qdrantApiKey()
  const indexName = "c91a3ee7-5458-481d-9a98-a9f324e20dfc"
  const storage = new QdrantStorage(qdrantUrl, qdrantApiKey, indexName)
  console.log("index: " + indexName)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  while(true) {
    const query = await rl.question(`query: `)
    const kResult = await queryToKeywords(query)
    const keywords = kResult.content.split("\n").map((s) => s.replace(/$-/, "").trim()).filter((s) => s.length > 0)
    console.log(keywords)

    const results = [] as FileInfo[][]
    for (const keyword of keywords) {
      const result = await storage.search(keyword)
      results.push(result)
    }

    const rankingMap = new Map<string, number>()
    const dedupeMap = new Map<string, FileInfo>()
    for (const rr of results) {
      for (let i = 0; i < rr.length; i++) {
        const r = rr[i]
        dedupeMap.set(r.url, r)
        const point = rankingMap.get(r.url) || 0
        rankingMap.set(r.url, point + (rr.length - i))
      }
    }
    const ranking = Array.from(rankingMap.entries()).sort((a, b) => b[1] - a[1])
    for (const [url, p] of ranking) {
      console.log(dedupeMap.get(url))
      console.log(p)
    }
  }
}

main()