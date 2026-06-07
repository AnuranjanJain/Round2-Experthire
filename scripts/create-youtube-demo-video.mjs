import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import http from 'node:http'

const workspace = 'C:/Users/anura/Documents/Round2-Experthire'
const outDir = path.join(workspace, 'submission', 'youtube-demo-assets')
const outputVideo = path.join(workspace, 'submission', 'SevaGrid-Command-YouTube-Demo.mp4')
const rawVideo = path.join(outDir, 'youtube-demo-raw.webm')
const scriptPath = path.join(workspace, 'submission', 'youtube-demo-script.txt')
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ffmpegPath = findFfmpeg()

await fs.mkdir(outDir, { recursive: true })

const captures = await captureLiveWebsite()
const deckSlides = await loadDeckSlides()
const audioPath = await makeNarration()
const rawDataUrl = await renderVideo(captures, deckSlides, audioPath)
await fs.writeFile(rawVideo, Buffer.from(rawDataUrl.split(',')[1], 'base64'))

const ff = spawnSync(ffmpegPath, [
  '-y',
  '-i',
  rawVideo,
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '21',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-b:a',
  '160k',
  '-movflags',
  '+faststart',
  outputVideo,
], { encoding: 'utf8' })

if (ff.status !== 0) {
  throw new Error(`ffmpeg conversion failed\n${ff.stdout}\n${ff.stderr}`)
}

const stat = await fs.stat(outputVideo)
console.log(JSON.stringify({ outputVideo, bytes: stat.size }, null, 2))

function findFfmpeg() {
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "(Get-ChildItem -Recurse outputs\\video-tools\\node_modules -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName)",
  ], { cwd: workspace, encoding: 'utf8' })
  const found = result.stdout.trim()
  if (!found) throw new Error('ffmpeg not found. Run npm install --prefix outputs/video-tools @ffmpeg-installer/ffmpeg first.')
  return found
}

async function captureLiveWebsite() {
  const profile = path.join(outDir, 'chrome-capture-profile')
  const port = 9550
  const proc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' })

  try {
    const tabs = await waitForTabs(port)
    const tab = tabs.find((entry) => entry.type === 'page') || tabs[0]
    const cdp = await connect(tab.webSocketDebuggerUrl)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:3100' })
    await delay(2500)

    const shots = {}
    async function shot(name) {
      await delay(500)
      const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const file = path.join(outDir, `${name}.png`)
      await fs.writeFile(file, Buffer.from(result.result.data, 'base64'))
      shots[name] = `data:image/png;base64,${result.result.data}`
    }

    await shot('live-map')
    await clickText(cdp, 'Heat Alert')
    await shot('heat-alert')
    await clickText(cdp, 'Incident')
    await shot('incident-queue')
    await clickText(cdp, 'Volunteers')
    await shot('volunteers')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:3100' })
    await delay(1800)
    await shot('mobile')
    cdp.close()
    return shots
  } finally {
    proc.kill()
  }
}

async function clickText(cdp, text) {
  const expression = `(() => {
    const target = [...document.querySelectorAll('button, [role="button"]')].find((el) => (el.innerText || el.getAttribute('aria-label') || '').includes(${JSON.stringify(text)}));
    if (!target) return false;
    target.click();
    return true;
  })()`
  await cdp.send('Runtime.evaluate', { expression, returnByValue: true })
  await delay(750)
}

async function loadDeckSlides() {
  const dir = path.join(workspace, 'outputs', 'video-pro', 'ppt-slides')
  const names = ['slide-01.png', 'slide-05.png', 'slide-06.png', 'slide-08.png', 'slide-10.png']
  const result = {}
  for (const name of names) {
    result[name] = `data:image/png;base64,${await fs.readFile(path.join(dir, name), 'base64')}`
  }
  return result
}

async function makeNarration() {
  const audioPath = path.join(outDir, 'youtube-narration.wav').replaceAll('/', '\\')
  const text = await fs.readFile(scriptPath, 'utf8')
  const escapedText = text.replace(/`/g, '``').replace(/\$/g, '`$')
  const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like "*Zira*" } | Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$synth.Rate = 1
$synth.Volume = 100
$synth.SetOutputToWaveFile("${audioPath}")
$synth.Speak(@"
${escapedText}
"@)
$synth.Dispose()
`
  const psPath = path.join(outDir, 'make-youtube-audio.ps1')
  await fs.writeFile(psPath, ps, 'utf8')
  const audio = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath], { encoding: 'utf8' })
  if (audio.status !== 0) {
    throw new Error(`Audio generation failed\n${audio.stdout}\n${audio.stderr}`)
  }
  return `data:audio/wav;base64,${await fs.readFile(path.join(outDir, 'youtube-narration.wav'), 'base64')}`
}

async function renderVideo(captures, slides, audioSource) {
  const rendererPath = path.join(outDir, 'youtube-render.html')
  await fs.writeFile(rendererPath, buildRendererHtml(captures, slides, audioSource), 'utf8')
  const port = 9551
  const proc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(outDir, 'chrome-render-profile')}`,
    `file:///${rendererPath.replaceAll('\\', '/')}`,
  ], { stdio: 'ignore' })
  try {
    const tabs = await waitForTabs(port)
    const tab = tabs.find((entry) => entry.type === 'page') || tabs[0]
    const cdp = await connect(tab.webSocketDebuggerUrl)
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')
    await cdp.send('Page.navigate', { url: `file:///${rendererPath.replaceAll('\\', '/')}` })
    for (let i = 0; i < 50; i += 1) {
      const ready = await cdp.send('Runtime.evaluate', { expression: 'typeof window.renderVideo === "function"', returnByValue: true })
      if (ready.result.result.value === true) break
      await delay(250)
    }
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'window.renderVideo()',
      awaitPromise: true,
      returnByValue: true,
    })
    cdp.close()
    if (result.result.exceptionDetails) throw new Error(JSON.stringify(result.result.exceptionDetails, null, 2))
    return result.result.result.value
  } finally {
    proc.kill()
  }
}

function buildRendererHtml(captures, slides, audioSource) {
  return `<!doctype html><html><body style="margin:0;background:#05080c;overflow:hidden">
<canvas id="c" width="1280" height="720"></canvas>
<script>
window.captures=${JSON.stringify(captures)};
window.slides=${JSON.stringify(slides)};
window.audioSource=${JSON.stringify(audioSource)};
window.renderVideo = async function() {
  const canvas=document.getElementById('c');
  const ctx=canvas.getContext('2d');
  const W=1280,H=720;
  const load=(src)=>new Promise((res,rej)=>{const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=src;});
  const imgs={};
  for (const [k,v] of Object.entries({...window.captures,...window.slides})) imgs[k]=await load(v);
  const audio=new Audio(window.audioSource);
  audio.preload='auto';
  await new Promise((resolve)=>{audio.onloadedmetadata=resolve; audio.load();});
  const audioCtx=new AudioContext();
  const source=audioCtx.createMediaElementSource(audio);
  const dest=audioCtx.createMediaStreamDestination();
  source.connect(dest);
  const stream=canvas.captureStream(30);
  const mixed=new MediaStream([...stream.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const recorder=new MediaRecorder(mixed,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:5500000});
  const chunks=[];
  recorder.ondataavailable=(event)=>{ if(event.data.size) chunks.push(event.data); };
  const done=new Promise((resolve)=>{ recorder.onstop=()=>{ const blob=new Blob(chunks,{type:'video/webm'}); const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.readAsDataURL(blob); }; });
  const scenes=[
    {s:0,e:14,type:'slide',img:'slide-01.png',title:'Opening Vision',sub:'A map-first command center for Mahakumbh volunteer deployment'},
    {s:14,e:34,type:'live',img:'live-map',title:'Live Map Is The Product',sub:'Risk, coverage, routes, and incidents are spatially connected',zoom:[0.08,0.08,0.72,0.64],cursor:[[1100,130],[690,520],[460,640]]},
    {s:34,e:53,type:'live',img:'heat-alert',title:'Scenario Controls',sub:'Modes and pressure sliders reshape deployment demand',zoom:[0.04,0.02,0.62,0.20],cursor:[[260,48],[540,48],[820,48]]},
    {s:53,e:72,type:'live',img:'incident-queue',title:'Incident Response',sub:'New tickets move into the queue and alter sector urgency',zoom:[0.70,0.08,0.27,0.62],cursor:[[1410,48],[1650,180],[1690,385]]},
    {s:72,e:91,type:'slide',img:'slide-05.png',title:'Theme Fit',sub:'Recruit, manage, allocate, monitor, and optimize volunteers'},
    {s:91,e:113,type:'slide',img:'slide-06.png',title:'Explainable Optimizer',sub:'Skill fit, location, fatigue, workload, and fairness drive recommendations'},
    {s:113,e:134,type:'live',img:'volunteers',title:'Volunteer Suggestions',sub:'Operators see responders and reserve pool without leaving the map',zoom:[0.70,0.08,0.27,0.64],cursor:[[1580,130],[1510,310],[1550,550]]},
    {s:134,e:153,type:'slide',img:'slide-08.png',title:'Architecture And Security',sub:'Next.js, typed data, deterministic optimizer, HTTPS, security headers'},
    {s:153,e:173,type:'live',img:'mobile',title:'Mobile Field Review',sub:'Stabilized small-screen layout for supervisors and field review',mobile:true,cursor:[[230,52],[202,260],[280,650]]},
    {s:173,e:999,type:'slide',img:'slide-10.png',title:'Roadmap And Submission',sub:'GIS routing, dispatch channels, auth roles, check-ins, forecasting'},
  ];
  function rect(x,y,w,h,r=20){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function cover(img,x,y,w,h,zoom=1,crop){let sx=0,sy=0,sw=img.width,sh=img.height;if(crop){sx=crop[0]*img.width;sy=crop[1]*img.height;sw=crop[2]*img.width;sh=crop[3]*img.height;} const scale=Math.max(w/sw,h/sh)*zoom; const iw=sw*scale,ih=sh*scale;ctx.drawImage(img,sx,sy,sw,sh,x+(w-iw)/2,y+(h-ih)/2,iw,ih);}
  function text(t,x,y,size,color,weight=800,max=760){ctx.font=weight+' '+size+'px Inter, Arial, sans-serif';ctx.fillStyle=color;ctx.textBaseline='top';const words=t.split(' ');let line='',yy=y;for(const word of words){const n=line?line+' '+word:word;if(ctx.measureText(n).width>max&&line){ctx.fillText(line,x,yy);line=word;yy+=size*1.22}else line=n;} if(line)ctx.fillText(line,x,yy);}
  function panel(x,y,w,h,a=.78){ctx.fillStyle='rgba(8,12,18,'+a+')';rect(x,y,w,h,22);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.stroke();}
  function cursor(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#f2f7f4';ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,34);ctx.lineTo(9,26);ctx.lineTo(16,42);ctx.lineTo(24,38);ctx.lineTo(17,22);ctx.lineTo(30,22);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  function drawBg(){ctx.fillStyle='#05080c';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(170,211,198,.08)';for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
  function draw(){const t=audio.currentTime;const scene=scenes.find(s=>t>=s.s&&t<s.e)||scenes.at(-1);const p=Math.max(0,Math.min(1,(t-scene.s)/(scene.e-scene.s)));drawBg();if(scene.type==='slide'){cover(imgs[scene.img],0,0,W,H,1.02+p*.02);ctx.fillStyle='rgba(5,8,12,.18)';ctx.fillRect(0,0,W,H);}else if(scene.mobile){panel(420,44,430,620,.45);cover(imgs[scene.img],448,62,360,584,1.02);ctx.strokeStyle='rgba(45,212,131,.42)';ctx.lineWidth=2;ctx.strokeRect(448,62,360,584);}else{cover(imgs[scene.img],42,54,1196,604,1.01+p*.02,scene.zoom);ctx.strokeStyle='rgba(45,212,131,.34)';ctx.lineWidth=2;ctx.strokeRect(42,54,1196,604);}ctx.fillStyle='rgba(5,8,12,.25)';ctx.fillRect(0,0,W,H);panel(56,486,890,132,.84);ctx.fillStyle='#2dd483';ctx.fillRect(84,514,42,3);text(scene.title,84,534,38,'#f2f7f4',850,790);text(scene.sub,86,586,20,'#c1d4cd',500,780);panel(978,512,220,76,.74);text('PRESENTATION DEMO',1004,532,13,'#91a09b',850,170);text('Live website + deck',1004,556,17,'#2dd483',850,170);if(scene.cursor){const pts=scene.cursor;const seg=Math.min(pts.length-2,Math.floor(p*(pts.length-1)));const local=(p*(pts.length-1))-seg;const a=pts[seg],b=pts[seg+1]||pts[seg];cursor(a[0]+(b[0]-a[0])*local,a[1]+(b[1]-a[1])*local,1.1);}ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(56,672,1168,6);ctx.fillStyle='#2dd483';ctx.fillRect(56,672,1168*(audio.duration?t/audio.duration:0),6);if(!audio.ended)requestAnimationFrame(draw);}
  recorder.start(1000);
  await audioCtx.resume();
  await audio.play();
  draw();
  await new Promise(r=>audio.onended=r);
  recorder.stop();
  return done;
}
</script></body></html>`
}

async function waitForTabs(port) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${port}/json`)
      if (tabs.some((tab) => tab.type === 'page')) return tabs
    } catch {
      // retry
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for Chrome on port ${port}`)
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

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
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
  return {
    send(method, params = {}) {
      const msgId = ++id
      ws.send(JSON.stringify({ id: msgId, method, params }))
      return new Promise((resolve) => pending.set(msgId, resolve))
    },
    close() {
      ws.close()
    },
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
