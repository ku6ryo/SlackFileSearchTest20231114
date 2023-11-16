import { getEnv } from "../EnvVarManager"
import { QdrantStorage } from "../storage/QdrantStorage"
import readline from "readline/promises"
import { FileInfo } from "../types/FileInfo"


async function main() {
  const qdrantUrl = getEnv().qdrantUrl()
  const qdrantApiKey = getEnv().qdrantApiKey()
  const indexName = "7cf72314-e8ab-4529-9622-6098d952e80e"
  const storage = new QdrantStorage(qdrantUrl, qdrantApiKey, indexName)
  console.log("index: " + indexName)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  while(true) {
    const query = await rl.question(`query: `)
    const result = await storage.search(query)
    const dedupeMap = new Map<string, boolean>()
    const deduped = [] as FileInfo[]
    for (const r of result) {
      if (!dedupeMap.has(r.url)) {
        dedupeMap.set(r.url, true)
        deduped.push(r)
      }
    }
    console.log(deduped)
  }
}

main()