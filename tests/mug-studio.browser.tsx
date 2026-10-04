// Isolated browser fixture: no Firebase, accounts, user data or network writes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MugEditorStudio from '../src/components/mug/MugEditorStudio';
import { getDesign, type MugDesign } from '../src/lib/mugs';
import { initConfig, defaultPhotoState } from '../src/components/mug/mugState';
import { switchMugDesign } from '../src/components/mug/mugEditing';
import '../src/index.css';

const photo = document.createElement('canvas');
photo.width = 900; photo.height = 1100;
const painter = photo.getContext('2d')!;
const sky = painter.createLinearGradient(0, 0, 0, 1100);
sky.addColorStop(0, '#bddddf'); sky.addColorStop(0.6, '#f7e6cf'); sky.addColorStop(1, '#477e6c');
painter.fillStyle = sky; painter.fillRect(0, 0, 900, 1100);
painter.fillStyle = '#fff5d2'; painter.beginPath(); painter.arc(660, 270, 110, 0, Math.PI * 2); painter.fill();
for (let i = 0; i < 4; i++) {
  painter.fillStyle = ['#a2b8ac', '#739c91', '#457f74', '#285b54'][i];
  painter.beginPath(); painter.moveTo(0, 560 + i * 120);
  painter.bezierCurveTo(250, 260 + i * 190, 570, 900 - i * 30, 900, 550 + i * 150);
  painter.lineTo(900, 1100); painter.lineTo(0, 1100); painter.fill();
}
const photoUrl = photo.toDataURL('image/png');
let cartCount = 0;

export function Fixture() {
  const [design, setDesign] = useState(getDesign('photo-caption'));
  const [config, setConfig] = useState(() => {
    const next = initConfig(design, 'regular', '#ffffff', 'round');
    const id = Object.keys(next.photos)[0];
    next.photos[id] = { ...defaultPhotoState(), url: photoUrl, width: 900, height: 1100 };
    Object.values(next.texts)[0].text = 'Find your happy';
    Object.values(next.texts)[1].text = 'little moments, big memories';
    return next;
  });
  function changeDesign(next: MugDesign) {
    setConfig(switchMugDesign(config, design, next)); setDesign(next);
  }
  return <main className="min-h-screen bg-slate-50 px-4 sm:px-8 py-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold tracking-widest text-teal-600 uppercase">The personal touch</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Personalized photo mug</h1><p className="mt-2 text-sm text-slate-500">Your photos. Your words. Their new favourite mug.</p><MugEditorStudio key={design.id} design={design} config={config} onConfigChange={setConfig} onDesignChange={changeDesign} onBack={() => {}} onAddToCart={() => { cartCount++; }} adding={false} added={false} cartError={null} saveWarning={false} /></div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function check(condition: unknown, message: string) { if (!condition) throw new Error(message); }
function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === label);
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}
async function run() {
  await sleep(1200);
  const params = new URLSearchParams(location.search);
  if (params.get('view')) button(params.get('view')!).click();
  if (!params.has('smoke')) return;
  const result = document.getElementById('test-result')!;
  try {
    check(document.querySelectorAll('canvas').length >= 4, 'Angle previews and flat wrap render');
    check(document.documentElement.scrollWidth <= window.innerWidth, 'No horizontal overflow');
    for (const name of ['Left', 'Front', 'Right', 'Flat wrap', 'All angles']) {
      button(name).click(); await sleep(100);
      check(button(name).getAttribute('aria-pressed') === 'true', `${name} is selected`);
    }
    button('Text').click(); await sleep(50);
    const text = document.querySelector<HTMLInputElement>('[aria-label="Your personalized text"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(text, 'A special memory');
    text.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
    check(text.value === 'A special memory', 'Text input works');
    button('Photos').click(); await sleep(50);
    const upload = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const invalid = new DataTransfer(); invalid.items.add(new File(['invalid'], 'bad.txt', { type: 'text/plain' }));
    upload.files = invalid.files; upload.dispatchEvent(new Event('change', { bubbles: true })); await sleep(100);
    check(document.querySelector('[role="alert"]')?.textContent?.includes('JPG'), 'Invalid uploads show an error');
    const valid = new DataTransfer(); valid.items.add(new File([await (await fetch(photoUrl)).blob()], 'photo.png', { type: 'image/png' }));
    upload.files = valid.files; upload.dispatchEvent(new Event('change', { bubbles: true })); await sleep(300);
    check(!document.querySelector('[role="alert"]'), 'Valid upload clears the error');
    button('Add to Cart').click(); check(cartCount === 1, 'Complete design can be added');
    button('Templates').click(); await sleep(100); button('With Love').click(); await sleep(300);
    check(document.body.textContent?.includes('With Love · Regular Mug'), 'Template switching works');
    check(document.querySelector('img[alt="Uploaded photo"]'), 'Template switch retains the photo');
    button('3D view').click(); await sleep(2000);
    const webglCanvas = document.querySelector<HTMLCanvasElement>('[aria-label^="Interactive 3D"] canvas');
    const webgl = !!webglCanvas?.getContext('webgl2');
    check(webgl || document.body.textContent?.includes('3D is unavailable'), '3D loads or gracefully falls back');
    result.dataset.webgl = webgl ? 'active' : 'fallback';
    button('Reset photo adjustments').click();
    button('All angles').click(); await sleep(100);
    result.dataset.status = 'passed'; result.textContent = `Browser interaction checks passed; WebGL ${webgl ? 'active' : 'fallback'}`;
  } catch (error) {
    result.dataset.status = 'failed'; result.textContent = error instanceof Error ? error.message : 'Unknown failure';
  }
}
void run();