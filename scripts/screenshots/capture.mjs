// 각 화면을 데스크톱·모바일 크기로 캡처합니다. 사용: node capture.mjs <baseUrl> <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [base = 'http://localhost:5173', dir = 'shots'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const views = [['battle', '자동 낚시'], ['stages', '낚시터'], ['dungeons', '던전 탐험'], ['character', '능력치 · 빌드'], ['shop', '항구 상점'], ['inventory', '장비 보관함'], ['skills', '스킬'], ['classes', '전직'], ['rebirth', '환생'], ['book', '물고기 도감'], ['help', '도움말']];
const browser = await chromium.launch();
// 데스크톱 메뉴로 화면을 연 뒤 같은 페이지를 각 크기로 캡처합니다 (모바일 메뉴 조작 없이).
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
for (const [id, name] of views) {
    try {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('.game-sidebar').getByText(name, { exact: true }).first().click({ timeout: 5000 });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${dir}/desktop-${id}.png`, fullPage: true });
        const tabs = page.locator('main [role="tab"]');
        const n = id === 'battle' ? 0 : Math.min(await tabs.count(), 6);
        for (let i = 1; i < n; i++) { const tab = tabs.nth(i); const text = (await tab.innerText()).trim().replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 20); await tab.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/desktop-${id}-tab${i}-${text}.png`, fullPage: true }); }
        if (n > 1) await tabs.nth(0).click();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${dir}/mobile-${id}.png`, fullPage: true });
    } catch (e) { console.log('SKIP', id, e.message.split('\n')[0]); }
}
await browser.close();
