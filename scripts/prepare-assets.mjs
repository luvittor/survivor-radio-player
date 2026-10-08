import { access, copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const publicDir = path.join(root, 'public')

await mkdir(publicDir, { recursive: true })

for (const file of ['icon.png', 'live.png']) {
  const source = path.join(root, file)
  await access(source)
  await copyFile(source, path.join(publicDir, file))
}

await sharp(path.join(root, 'icon.png')).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'))
await sharp(path.join(root, 'icon.png')).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'))
await sharp(path.join(root, 'icon.png'))
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#08111d' })
  .png()
  .toFile(path.join(publicDir, 'icon-maskable-512.png'))
