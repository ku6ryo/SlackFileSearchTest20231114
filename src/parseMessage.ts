import { MessageElement } from "@slack/web-api/dist/response/ConversationsRepliesResponse"

export type UnifiedAttachment = {
  name: string | null
  mimeType: string | null
  size: number | null
  url: string
}

export type ParsedMessage = {
  id: string
  text: string
  attachments: UnifiedAttachment[]
}

export function parseMessage(msg: MessageElement): ParsedMessage {
  const { text, ts, user, thread_ts, files, attachments } = msg
  if (
    text === undefined ||
    ts === undefined ||
    user === undefined
  ) {
    throw new Error("text, ts, or user is undefined")
  }
  const cleanAttachments: UnifiedAttachment[] = []
  if (attachments) {
    console.log(attachments)
    attachments.forEach((attachment) => {
      const url = attachment.original_url || attachment.from_url
      if (!url) {
        return
      }
      cleanAttachments.push({
        name: attachment.title || null,
        mimeType: null,
        size: null,
        url,
      })
    })
  }
  console.log("text: " + text)
  if (files) {
    for (const file of files) {
      const { mimetype, name } = file
      console.log("file:")
      console.log(file)
      if (file.url_private) {
        cleanAttachments.push({
          name: name || null,
          size: file.size || null,
          mimeType: mimetype || null,
          url: file.url_private
        })
      }
    }
  }
  return {
    id: thread_ts ? `${thread_ts}/${ts}` : ts,
    text,
    attachments: cleanAttachments,
  }
}

