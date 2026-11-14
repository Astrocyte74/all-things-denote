import { test, expect, chromium, type Page } from '@playwright/test';
import QRCode from 'qrcode';
import { writeFile } from 'node:fs/promises';

const API = 'http://127.0.0.1:8788';
let pageErrors: string[];
test.beforeEach(({ page }) => { pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message)); });
test.afterEach(() => { expect(pageErrors).toEqual([]); });
type CameraHarness = {
  calls: MediaStreamConstraints[]; stops: number; deny: boolean; pending: boolean;
  frame?: HTMLImageElement; resolvePending?: () => void;
};

// Replace the hardware only. The production decoder reads real QR pixels.
async function camera(page: Page) {
  await page.evaluate(() => {
    const state: CameraHarness = { calls: [], stops: 0, deny: false, pending: false };
    (window as unknown as { cameraHarness: CameraHarness }).cameraHarness = state;
    // WebKit can recreate the mediaDevices wrapper; patch its stable prototype.
    Object.defineProperty(Object.getPrototypeOf(navigator.mediaDevices), 'getUserMedia', { configurable: true, value: async (constraints: MediaStreamConstraints) => {
      state.calls.push(constraints);
      if (state.deny) throw new DOMException('Denied for test', 'NotAllowedError');
      const track = Object.assign(new EventTarget(), { stop: () => { state.stops++; } });
      const stream = new MediaStream();
      Object.defineProperties(stream, { getTracks: { value: () => [track] }, getVideoTracks: { value: () => [track] } });
      if (state.pending) await new Promise<void>(resolve => { state.resolvePending = resolve; });
      return stream;
    } });
    Object.defineProperties(HTMLVideoElement.prototype, {
      videoWidth: { configurable: true, get: () => 720 }, videoHeight: { configurable: true, get: () => 720 },
      readyState: { configurable: true, get: () => 4 }, play: { configurable: true, value: async () => {} },
    });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
      if (source instanceof HTMLVideoElement) {
        this.fillStyle = '#fff'; this.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (state.frame) draw.call(this, state.frame, 0, 0, this.canvas.width, this.canvas.height);
      } else Reflect.apply(draw, this, [source, ...args]);
    } as typeof draw;
  });
}

async function frame(page: Page, value: string) {
  const data = await QRCode.toDataURL(value, { width: 720, margin: 4, color: { dark: '#2E2459', light: '#FFFDF7' } });
  await page.evaluate(async data => {
    const image = new Image(); image.src = data; await image.decode();
    (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.frame = image;
  }, data);
}
const stopped = (page: Page) => page.evaluate(() => (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.stops);

async function joinPage(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Join an event', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Join an event', level: 1 })).toBeVisible();
}

test('join and create have focused instructions with an explicit switch', async ({ page }, info) => {
  await joinPage(page);
  await expect(page.getByRole('button', { name: 'Scan QR code', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Event name', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create event & show QR' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('join-phone.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Start an event instead' }).click();
  await expect(page.getByRole('heading', { name: 'Start an event', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pick a game', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan QR code', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Or paste the link they sent' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('create-phone.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Join an event instead' }).click();
  await expect(page.getByRole('button', { name: 'Scan QR code', exact: true })).toBeVisible();
});

test('camera decodes a real invite QR, rejects unrelated/private codes, and stops before opening', async ({ page, baseURL }, info) => {
  const response = await page.request.post(`${API}/events`, { data: { title: 'Camera invite test', packId: 'christmas' }, headers: { 'CF-Connecting-IP': `camera-${crypto.randomUUID()}` } });
  expect(response.status()).toBe(201);
  const event = await response.json();
  const invite = `${baseURL}#event=${event.access.eventId}&join=${event.snapshot.joinToken}`;
  await joinPage(page); await camera(page);
  await frame(page, 'https://unrelated.example/private');
  expect(await page.evaluate(() => (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.calls.length)).toBe(0);
  const posts: string[] = []; page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.getByRole('button', { name: 'Scan QR code', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Scan your event QR code' })).toBeVisible();
  await expect(page.getByText('That isn’t a team-invite code for this app.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.calls[0])).toMatchObject({ audio: false, video: { facingMode: { ideal: 'environment' } } });
  expect(page.url()).toContain('review=home');
  await frame(page, `${baseURL}#event=${event.access.eventId}&leader=${event.access.token}`);
  // Wait for the camera to actually consume this frame, rather than a fixed delay.
  await page.evaluate(() => {
    const state = (window as unknown as { cameraHarness: CameraHarness }).cameraHarness;
    const image = state.frame!; let reads = 0;
    Object.defineProperty(state, 'frame', { configurable: true, get: () => { reads++; return image; } });
    (window as unknown as { privateFrameReads: () => number }).privateFrameReads = () => reads;
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { privateFrameReads: () => number }).privateFrameReads())).toBeGreaterThan(0);
  expect(page.url()).toContain('review=home');
  await page.evaluate(() => { const state = (window as unknown as { cameraHarness: CameraHarness }).cameraHarness; Object.defineProperty(state, 'frame', { configurable: true, writable: true, value: undefined }); });
  await page.screenshot({ path: info.outputPath('scanner-phone.png'), animations: 'disabled' });
  await frame(page, invite);
  await expect(page.getByRole('heading', { name: 'Camera invite test', exact: true })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Team names', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await stopped(page)).toBe(1);
  expect(posts).toEqual([]);
  expect(page.url()).toBe(invite);
});

test('denied camera access has a retry and a working paste-link fallback', async ({ page }) => {
  await joinPage(page); await camera(page);
  await page.evaluate(() => { (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.deny = true; });
  await page.getByRole('button', { name: 'Scan QR code', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Camera access wasn’t allowed');
  await page.evaluate(() => { (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.deny = false; });
  await page.getByRole('button', { name: 'Try camera again' }).click();
  await expect(page.getByText('Looking for your event code…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Paste a link instead', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await stopped(page)).toBe(1);
  await expect(page.getByRole('button', { name: 'Scan QR code', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Or paste the link they sent' }).fill('https://unrelated.example');
  await page.getByRole('button', { name: 'Open link', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('doesn’t look like a group event link');
});

test('closing, leaving the page and late permissions release camera tracks', async ({ page }) => {
  await joinPage(page); await camera(page);
  await page.getByRole('button', { name: 'Scan QR code', exact: true }).click();
  await expect(page.getByText('Looking for your event code…', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.getByText('Camera paused while you were away.', { exact: false })).toBeVisible();
  expect(await stopped(page)).toBe(1);
  await page.getByRole('button', { name: 'Try camera again' }).click();
  await expect(page.getByText('Looking for your event code…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close QR scanner', exact: true }).click();
  expect(await stopped(page)).toBe(2);
  await page.evaluate(() => { (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.pending = true; });
  await page.getByRole('button', { name: 'Scan QR code', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { cameraHarness: CameraHarness }).cameraHarness.resolvePending))).toBe(true);
  await page.getByRole('button', { name: 'Close QR scanner', exact: true }).click();
  await page.evaluate(() => (window as unknown as { cameraHarness: CameraHarness }).cameraHarness.resolvePending!());
  await expect.poll(() => stopped(page)).toBe(3);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('native camera video frames decode and stop without a hardware mock', async ({baseURL}, info) => {
  test.skip(info.project.name !== 'chromium-review', 'Chromium supplies a synthetic camera device through a video file.');
  const invite = `${baseURL}#event=00000000-0000-4000-8000-000000000123&join=${'a'.repeat(43)}`;
  const qr = QRCode.create(invite, {errorCorrectionLevel:'M'}).modules;
  const side = 720, step = Math.floor(side / (qr.size + 8)), offset = Math.floor((side - step * qr.size) / 2);
  const y = Buffer.alloc(side * side, 235);
  for (let row = 0; row < qr.size; row++) for (let col = 0; col < qr.size; col++) {
    if (qr.get(row, col)) for (let dy = 0; dy < step; dy++) y.fill(16, (offset + row * step + dy) * side + offset + col * step, (offset + row * step + dy) * side + offset + (col + 1) * step);
  }
  const file = info.outputPath('camera.y4m');
  await writeFile(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${side} H${side} F5:1 Ip A1:1 C420jpeg\nFRAME\n`), y, Buffer.alloc(side * side / 2, 128)]));
  const browser = await chromium.launch({args:['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${file}`]});
  try {
    const context = await browser.newContext({baseURL, viewport:{width:390,height:844}});
    const page = await context.newPage(); page.on('pageerror', error => pageErrors.push(error.message));
    await joinPage(page);
    await page.evaluate(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async constraints => {
        const stream = await original(constraints);
        (window as unknown as {scanTracks: MediaStreamTrack[]}).scanTracks = stream.getTracks();
        return stream;
      };
    });
    await page.getByRole('button',{name:'Scan QR code',exact:true}).click();
    await expect(page).toHaveURL(invite);
    // This syntactically valid fixture intentionally has no cloud event.
    await expect(page.getByRole('heading',{name:'This event has ended',exact:true})).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as {scanTracks: MediaStreamTrack[]}).scanTracks.every(track => track.readyState === 'ended'))).toBe(true);
  } finally { await browser.close(); }
});
