import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import http from 'node:http'

const workspace = 'C:/Users/anura/Documents/Round2-Experthire'
const outDir = path.join(workspace, 'submission', 'demo-video-assets')
const outputVideo = path.join(workspace, 'submission', 'SevaGrid-Command-Demo.webm')
const scriptPath = path.join(workspace, 'submission', 'demo-video-script.txt')
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

await fs.mkdir(outDir, { recursive: true })

function runChromeScreenshot(name, width, height, url = 'http://127.0.0.1:3100') {
  const out = path.join(outDir, name)
  const result = spawnSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    url,
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`Chrome screenshot failed for ${name}\n${result.stdout}\n${result.stderr}`)
  }
  return out
}

runChromeScreenshot('01-command.png', 1920, 1080)
runChromeScreenshot('02-heat.png', 1920, 1080)
runChromeScreenshot('03-incident.png', 1920, 1080)
runChromeScreenshot('04-mobile.png', 390, 844)

const audioPath = path.join(outDir, 'narration.wav').replaceAll('/', '\\')
const text = await fs.readFile(scriptPath, 'utf8')
const escapedText = text.replace(/`/g, '``').replace(/\$/g, '`$')
const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 1
$synth.Volume = 100
$synth.SetOutputToWaveFile("${audioPath}")
$synth.Speak(@"
${escapedText}
"@)
$synth.Dispose()
`
await fs.writeFile(path.join(outDir, 'make-audio.ps1'), ps, 'utf8')
const audioResult = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(outDir, 'make-audio.ps1')], {
  encoding: 'utf8',
})
if (audioResult.status !== 0) {
  throw new Error(`Audio generation failed:\n${audioResult.stdout}\n${audioResult.stderr}`)
}

const images = await Promise.all(
  ['01-command.png', '02-heat.png', '03-incident.png', '04-mobile.png'].map(async (name) => ({
    name,
    data: `data:image/png;base64,${await fs.readFile(path.join(outDir, name), 'base64')}`,
  })),
)
const audioData = `data:audio/wav;base64,${await fs.readFile(path.join(outDir, 'narration.wav'), 'base64')}`
const rendererPath = path.join(outDir, 'demo-render.html')

await fs.writeFile(rendererPath, buildRendererHtml(images, audioData), 'utf8')
const dataUrl = await runRenderer(rendererPath)
const videoBytes = Buffer.from(dataUrl.split(',')[1], 'base64')
await fs.writeFile(outputVideo, videoBytes)

console.log(JSON.stringify({ outputVideo, bytes: videoBytes.byteLength }, null, 2))

async function runRenderer(htmlPath) {
  const port = 9444
  const userData = path.join(outDir, 'chrome-render-profile')
  const fileUrl = `file:///${htmlPath.replaceAll('\\', '/')}`
  const proc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    fileUrl,
  ], { stdio: 'ignore' })

  try {
    const tabs = await waitForTabs(port, fileUrl)
    const tab = tabs.find((entry) => entry.url === fileUrl) || tabs.find((entry) => entry.type === 'page') || tabs[0]
    const ws = new WebSocket(tab.webSocketDebuggerUrl)
    const pending = new Map()
    let id = 0
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message)
        pending.delete(message.id)
      }
    }
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = reject
    })
    const send = (method, params = {}) => {
      const msgId = ++id
      ws.send(JSON.stringify({ id: msgId, method, params }))
      return new Promise((resolve) => pending.set(msgId, resolve))
    }
    await send('Runtime.enable')
    await send('Page.enable')
    await send('Page.navigate', { url: fileUrl })
    for (let i = 0; i < 40; i += 1) {
      const ready = await send('Runtime.evaluate', {
        expression: 'typeof window.renderVideo === "function"',
        returnByValue: true,
      })
      if (ready.result.result.value === true) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    const result = await send('Runtime.evaluate', {
      expression: 'window.renderVideo()',
      awaitPromise: true,
      returnByValue: true,
    })
    ws.close()
    if (result.result.exceptionDetails) {
      throw new Error(JSON.stringify(result.result.exceptionDetails, null, 2))
    }
    return result.result.result.value
  } finally {
    proc.kill()
  }
}

async function waitForTabs(port, expectedUrl) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${port}/json`)
      if (tabs.some((tab) => tab.url === expectedUrl) || tabs.some((tab) => tab.type === 'page')) return tabs
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Timed out waiting for Chrome renderer')
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => resolve(JSON.parse(data)))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => reject(new Error('HTTP timeout')))
  })
}

function buildRendererHtml(imageAssets, audioSource) {
  return `<!doctype html>
<html>
<body style="margin:0;background:#05080c;overflow:hidden">
<canvas id="c" width="1280" height="720"></canvas>
<script>
window.assets = ${JSON.stringify(imageAssets)};
window.audioSource = ${JSON.stringify(audioSource)};
window.renderVideo = async function renderVideo() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  const imgs = await Promise.all(window.assets.map((asset) => loadImage(asset.data)));
  const audio = new Audio(window.audioSource);
  audio.preload = 'auto';
  await new Promise((resolve) => {
    audio.onloadedmetadata = resolve;
    audio.load();
  });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(audio);
  const destination = audioCtx.createMediaStreamDestination();
  source.connect(destination);

  const stream = canvas.captureStream(24);
  const mixed = new MediaStream([...stream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(mixed, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 1800000 });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const done = new Promise((resolve) => {
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    };
  });
  const scenes = [
    { start: 0, end: 18, img: 0, title: 'SevaGrid Command', subtitle: 'Real-time volunteer deployment for Mahakumbh operations' },
    { start: 18, end: 39, img: 0, title: 'The Problem', subtitle: 'Skills, location, workload, and incidents must be decided together' },
    { start: 39, end: 62, img: 0, title: 'Map-First Operations', subtitle: 'Every sector node carries risk, coverage, and deployment status' },
    { start: 62, end: 88, img: 1, title: 'Scenario-Aware Optimization', subtitle: 'Crowd pressure, heat, and live demand reshape the plan instantly' },
    { start: 88, end: 113, img: 2, title: 'Incident Response', subtitle: 'New incidents update zone risk and dispatch priorities' },
    { start: 113, end: 137, img: 0, title: 'Explainable AI Dispatch', subtitle: 'Recommendations balance skill fit, proximity, language, fatigue, and fairness' },
    { start: 137, end: 158, img: 3, title: 'Responsive Command Surface', subtitle: 'Desktop command center with stabilized mobile access' },
    { start: 158, end: 999, img: 0, title: 'Submission Ready', subtitle: 'Live on Vercel, source on GitHub, checks documented' },
  ];
  function coverImage(img, x, y, w, h, zoom = 1) {
    const scale = Math.max(w / img.width, h / img.height) * zoom;
    const iw = img.width * scale;
    const ih = img.height * scale;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function panel(x, y, w, h, alpha = 0.78) {
    ctx.fillStyle = 'rgba(8,12,18,' + alpha + ')';
    roundRect(x, y, w, h, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
  }
  function drawGrid() {
    ctx.fillStyle = '#05080c';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(170,211,198,0.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function writeText(value, x, y, size, color, weight = 700, maxWidth = 900) {
    ctx.font = weight + ' ' + size + 'px Inter, Arial, sans-serif';
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    const words = value.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += size * 1.25;
      } else {
        line = next;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }
  function drawFrame() {
    const t = audio.currentTime;
    const scene = scenes.find((s) => t >= s.start && t < s.end) || scenes[scenes.length - 1];
    const local = Math.max(0, Math.min(1, (t - scene.start) / (scene.end - scene.start)));
    drawGrid();
    coverImage(imgs[scene.img], 54, 82, 1172, 560, 1 + local * 0.025);
    ctx.fillStyle = 'rgba(5,8,12,0.38)';
    ctx.fillRect(0, 0, W, H);
    panel(56, 466, 890, 160, 0.84);
    ctx.fillStyle = '#2dd483';
    ctx.fillRect(84, 496, 38, 3);
    writeText(scene.title, 84, 518, 42, '#f2f7f4', 850, 790);
    writeText(scene.subtitle, 86, 578, 22, '#c1d4cd', 500, 760);
    panel(980, 502, 210, 92, 0.72);
    writeText('LIVE DEMO', 1010, 526, 14, '#91a09b', 850, 160);
    writeText('SevaGrid Command', 1010, 552, 18, '#2dd483', 850, 160);
    const progress = audio.duration ? t / audio.duration : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(56, 666, 1168, 6);
    ctx.fillStyle = '#2dd483';
    ctx.fillRect(56, 666, 1168 * progress, 6);
    if (!audio.ended) requestAnimationFrame(drawFrame);
  }
  recorder.start(1000);
  await audioCtx.resume();
  await audio.play();
  drawFrame();
  await new Promise((resolve) => { audio.onended = resolve; });
  recorder.stop();
  return done;
}
</script>
</body>
</html>`
}
