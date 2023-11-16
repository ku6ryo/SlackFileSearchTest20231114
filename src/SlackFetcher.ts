import { WebClient } from "@slack/web-api"
import { ParsedMessage, parseMessage } from "./parseMessage"
import { ImageCaptionGenerator } from "./ImageCaptionGenerator"
import axios from "axios"
import { getWebpageContentText } from "./getWebPageContentText"
import { MimeType } from "./constants"
import { convertPptToPdf } from "./utils/convertOfficeToPdf"
import * as pdfjs from "pdfjs-dist"
import { summarize } from "./llm/usecases"
import { SearchStorage } from "./storage/SearchStorage"
import sharp from "sharp"

export class SlackFetcher {
  slack: WebClient

  constructor(
    private token: string,
    private channelId: string,
    private imageCaptionGenerator: ImageCaptionGenerator,
    private qdrant: SearchStorage,
  ) {
    this.slack = new WebClient(this.token)
  }

  async fetch() {
    let cursor: string | null = null
    let hasMore = true

    while (hasMore) {
      const result = await this.slack.conversations.history({
        channel: this.channelId,
        cursor: cursor || undefined,
      })
      const { messages, has_more, response_metadata } = result
      if (response_metadata === undefined) {
        throw new Error("response_metadata is undefined")
      }
      if (messages === undefined) {
        continue
      }
      const filtered = messages.filter((msg) => {
        return msg.type === "message" && msg.subtype === undefined
      })
      hasMore = !!has_more
      cursor = response_metadata.next_cursor || null
      for (const msg of filtered) {
        if (msg.ts) {
          await this.indexReplies(
            this.channelId,
            msg.ts
          )
        }
      }
    }
    console.log("Completed without error")
  }

  async indexReplies(
    channelId: string,
    ts: string
  ) {
    let cursor: string | null = null;
    let hasMore = true
    while (hasMore) {
      const result = await this.slack.conversations.replies({
        channel: channelId,
        ts: ts,
        cursor: cursor || undefined,
      })
      const { messages, has_more, response_metadata } = result
      if (response_metadata === undefined) {
        throw new Error("response_metadata is undefined")
      }
      if (messages === undefined) {
        throw new Error("messages is undefined")
      }
      const filtered = messages.filter((msg) => {
        return msg.type === "message"
      })
      for (const msg of filtered) {
        const { text, ts, user, thread_ts } = msg
        if (
          text === undefined ||
          ts === undefined ||
          user === undefined
        ) {
          continue
        }
        await this.indexMessage(channelId, thread_ts || ts, ts)
      }
      hasMore = !!has_more
      cursor = response_metadata.next_cursor || null
    }
  }

  async indexMessage(channelId: string, threadTs: string, ts?: string) {
    const result = await this.slack.conversations.replies({
      channel: channelId,
      ts: ts || threadTs,
      latest: ts || threadTs,
      limit: 1,
    })
    const { messages, response_metadata } = result
    if (response_metadata === undefined) {
      throw new Error("response_metadata is undefined")
    }
    if (messages === undefined) {
      throw new Error("messages is undefined")
    }
    const filtered = messages.filter((msg) => {
      return msg.type === "message"
    })
    if (filtered.length === 0) {
      return
    }
    const msg = filtered[0]
    const parsedMessage = parseMessage(msg)
    await this.indexParsedMessage(parsedMessage)
  }

  async indexParsedMessage(parsedMessage: ParsedMessage) {
    for (const att of parsedMessage.attachments) {
      if (!att.mimeType || !att.size || att.size > 50_000_000) {
        continue
      }
      try {
        if (att.mimeType === MimeType.Jpeg || att.mimeType === MimeType.Png) {
          await this.indexImage(att.name || "", att.url)
        } else if (att.mimeType === MimeType.Svg) {
          await this.indexSvg(att.name || "", att.url)
        } else if (att.mimeType === MimeType.Pptx || att.mimeType === MimeType.Ppt) {
          await this.indexPpt(att.name || "", att.url)
        } else if (att.mimeType === MimeType.Pdf) {
          await this.indexPdf(att.name || "", att.url)
        } else {
          await this.indexWebPage(att.url)
        }
      } catch (e) {
        // ignore
        console.log(e)
      }
    }
  }

  async indexWebPage(url: string) {
    const { title, text } = await getWebpageContentText(url, 1000)
     const summary = await summarize(text)
     const lines = summary.content.split("\n")
     await this.qdrant.index(lines.map((line) => ({
       text: line,
       name: title,
       url,
     })))
  }

  async donwloadBinary(url: string): Promise<ArrayBuffer> {
    const { data } = await axios.get<ArrayBuffer>(
      url,
      {
        headers: {
          "Authorization": "Bearer " + this.token
        },
        responseType: "arraybuffer"
      }
    )
    return data
  }


  async indexImage(name: string, url: string) {
    const imgData = await this.donwloadBinary(url)
    await this.indexImageBinary(name, Buffer.from(imgData), url)
  }

  async indexImageBinary(name: string, img: Buffer, url: string) {
    const captions = await this.imageCaptionGenerator.generateCaptions(img)
    if (captions.length > 0) {
      await this.qdrant.index([{
        text: captions[0],
        name,
        url,
      }])
    }
  }

  async indexSvg(name: string, url: string) {
    const data = await this.donwloadBinary(url)
    const jpgBuf = await sharp(data).jpeg().toBuffer()
    await this.indexImageBinary(name, jpgBuf, url)
  }

   async indexPpt(name: string, url: string) {
     const data = await this.donwloadBinary(url)
     const pptBuf = Buffer.from(data)
     const pdfBuf = await convertPptToPdf(pptBuf)
     await this.indexPdfBinary(name, new Uint8Array(pdfBuf), url)
   }

   async indexPdf(name: string, url: string) {
     const data = await this.donwloadBinary(url)
     await this.indexPdfBinary(name, new Uint8Array(data), url)
   }

   async indexPdfBinary(name: string, pdf: Uint8Array, url: string) {
     const doc = await pdfjs.getDocument({ data: pdf }).promise
     const totalPages = doc.numPages
     const title = await new Promise<string>(async (resolve) => {
       const { info } = await doc.getMetadata()
       if ("Title" in info && typeof info.Title === "string") {
         resolve(info.Title)
       } else {
         resolve("")
       }
     })
     if (totalPages === 0) {
       throw new Error("PDF has no pages")
     }
     const page = await doc.getPage(1)
     const content = await page.getTextContent()
     const text = (() => {
       let text = ""
       for (const item of content.items) {
         if ("str" in item) {
           text += item.str + (item.hasEOL ? "\n" : "")
         }
       }
       return text
     })()
     console.log(name, text, title)
     console.log("############# SUMMARY #############")
     const summary = await summarize(text)
     const lines = summary.content.split("\n")
     await this.qdrant.index(lines.map((line) => ({
       text: line,
       name,
       url,
     })))
   }
}