import libre from "libreoffice-convert"

export async function convertPptToPdf(pptBuf: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    libre.convert(pptBuf, ".pdf", undefined, (err, buf) => {
      if (err) {
        reject(err)
        return
      }
      resolve(buf)
    })
  })
}