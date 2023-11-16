import { randomUUID } from "crypto"
import { getEnv } from "./EnvVarManager"
import { ImageCaptionGenerator } from "./ImageCaptionGenerator"
import { SlackFetcher } from "./SlackFetcher"
import { QdrantStorage } from "./storage/QdrantStorage"


async function main() {
  const slackToken = getEnv().slackToken()
  const channelId = getEnv().slackChannelId()
  const imageCaptionGenerator = new ImageCaptionGenerator(getEnv().gcpCredentialJson())
  await imageCaptionGenerator.init()
  const indexName = randomUUID()
  console.log(indexName)
  const qdrant = new QdrantStorage(
    getEnv().qdrantUrl(),
    getEnv().qdrantApiKey(),
    indexName
  )
  await qdrant.createIndex()
  const fetcher = new SlackFetcher(
    slackToken,
    channelId,
    imageCaptionGenerator,
    qdrant,
  )
  await fetcher.fetch()
}

main()