export type SlackMessage = {
  message: string
  files: FileDescription[]
}

export type FileDescription = {
  name: string
  url: string
  mimeType: string
  keywords: string[]
  // For each page
  fragments: FileFragment[]
}

export type FileFragment = {
  summary: string
  keywords: string[]
}