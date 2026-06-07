import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const workspace = 'C:/Users/anura/Documents/Round2-Experthire/outputs/video-pro/ppt-render'
const pptxPath = 'C:/Users/anura/Documents/Round2-Experthire/submission/SevaGrid-Command-Hackathon-Deck.pptx'
const outDir = 'C:/Users/anura/Documents/Round2-Experthire/outputs/video-pro/ppt-slides'

await fs.mkdir(workspace, { recursive: true })
await fs.mkdir(outDir, { recursive: true })
await fs.writeFile(path.join(workspace, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2))

const packageDir = 'C:/Users/anura/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool'
const target = path.join(workspace, 'node_modules', '@oai', 'artifact-tool')
await fs.mkdir(path.dirname(target), { recursive: true })
try {
  await fs.symlink(packageDir, target, 'junction')
} catch {
  // Existing symlink is fine.
}

const artifact = await import(pathToFileURL(path.join(packageDir, 'dist', 'artifact_tool.mjs')).href)
const { FileBlob, PresentationFile } = artifact
const presentation = await PresentationFile.importPptx(await FileBlob.load(pptxPath))
const count = presentation.slides.count

for (let index = 0; index < count; index += 1) {
  const slide = presentation.slides.getItem(index)
  const png = await presentation.export({ slide, format: 'png', scale: 1 })
  const buffer = Buffer.from(await png.arrayBuffer())
  await fs.writeFile(path.join(outDir, `slide-${String(index + 1).padStart(2, '0')}.png`), buffer)
}

console.log(JSON.stringify({ count, outDir }, null, 2))
