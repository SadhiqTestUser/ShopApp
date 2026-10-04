// Optional local Chrome smoke runner. Uses built-in Node APIs, not Playwright.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const size = process.argv[2] === 'mobile' ? { width: 390, height: 1100 } : { width: 1440, height: 1200 };
const mode = process.argv[3] ?? 'smoke';
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const profile = await mkdtemp(join(tmpdir(), 'shopapp-mug-chrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', 'about:blank',
  ...(process.argv.includes('--no-webgl') ? ['--disable-webgl'] : []),
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
const deadline = setTimeout(() => { chrome.kill(); console.error('Browser check timed out'); process.exitCode = 1; socket?.close(); }, 60000);
try {
  let target;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = targets.find((item) => item.type === 'page');
      if (target) break;
    } catch { /* Chrome is still starting. */ }
    await sleep(250);
  }
  if (!target) throw new Error('Could not start isolated Chrome');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const request = ++id;
    pending.set(request, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
    socket.send(JSON.stringify({ id: request, method, params }));
  });
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: size.width < 500 });
  const query = mode === 'smoke' ? 'smoke=1' : `view=${encodeURIComponent(mode)}`;
  await call('Page.navigate', { url: `http://127.0.0.1:5174/tests/mug-studio.html?${query}` });
  let status = 'pending', detail = '';
  for (let attempt = 0; attempt < 45; attempt++) {
    await sleep(500);
    const result = await call('Runtime.evaluate', {
      expression: "JSON.stringify({status:document.getElementById('test-result')?.dataset.status,detail:document.getElementById('test-result')?.textContent,ready:!!document.querySelector('canvas')})",
      returnByValue: true,
    });
    const state = JSON.parse(result.result.value ?? '{}');
    if (mode !== 'smoke' && state.ready && attempt > 8) { status = 'captured'; break; }
    status = state.status; detail = state.detail;
    if (status === 'passed' || status === 'failed') break;
  }
  await mkdir('tests/artifacts', { recursive: true });
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const suffix = process.argv.includes('--no-webgl') ? '-no-webgl' : '';
  const name = `tests/artifacts/mug-${size.width < 500 ? 'mobile' : 'desktop'}-${mode === 'smoke' ? 'smoke' : mode.replaceAll(' ', '-')}${suffix}.png`;
  await writeFile(name, Buffer.from(screenshot.data, 'base64'));
  console.log(`${size.width}px browser check: ${status}. ${detail || ''}`);
  console.log(`Screenshot: ${name}`);
  if (!['passed', 'captured'].includes(status)) process.exitCode = 1;
} finally {
  clearTimeout(deadline); socket?.close(); chrome.kill();
}