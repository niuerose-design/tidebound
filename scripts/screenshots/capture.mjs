// 각 화면을 데스크톱·모바일 크기로 캡처합니다. 사용: node capture.mjs <baseUrl> <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [base = 'http://localhost:5173', dir = 'shots'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
// 왼쪽 메뉴의 현재 이름(v27.87 기준). 메뉴 하나에 윗줄 탭이 여럿이면 아래 루프가 탭마다 따로 찍습니다.
const views = [['battle', '자동 사냥'], ['stages', '사냥터·던전'], ['altar', '제단'], ['character', '능력치 · 치장'], ['shop', '상점'], ['inventory', '장비 보관함'], ['skills', '스킬 · 전직'], ['rebirth', '환생 · 분신'], ['book', '도감 · 업적'], ['help', '도움말 · 업데이트']];
const browser = await chromium.launch();
// 데스크톱 메뉴로 화면을 연 뒤 같은 페이지를 각 크기로 캡처합니다 (모바일 메뉴 조작 없이).
// 로그인 화면을 먼저 찍고, 시드한 세션 쿠키로 들어갑니다.
const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await guest.goto(base, { waitUntil: 'networkidle' }); await guest.waitForTimeout(1500);
await guest.screenshot({ path: `${dir}/desktop-login.png`, fullPage: true }); await guest.setViewportSize({ width: 390, height: 844 }); await guest.screenshot({ path: `${dir}/mobile-login.png`, fullPage: true }); await guest.close();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.addCookies([{ name: 'tb_session', value: 'a'.repeat(64), url: base }]);
const page = await context.newPage();
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
