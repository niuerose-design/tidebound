// 각 화면을 데스크톱·모바일 크기로 캡처합니다. 사용: node capture.mjs <baseUrl> <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [base = 'http://localhost:5173', dir = 'shots'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const views = [['battle', '자동 낚시'], ['stages', '낚시터'], ['dungeons', '던전 탐험'], ['character', '능력치 · 빌드'], ['shop', '항구 상점'], ['inventory', '장비 보관함'], ['skills', '스킬'], ['classes', '전직'], ['rebirth', '환생'], ['book', '물고기 도감'], ['help', '도움말']];
const browser = await chromium.launch();
for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    for (const [id, name] of views) {
        try {
            if (label === 'mobile') {
                const t = page.locator('[data-sidebar="trigger"], [data-slot="sidebar-trigger"], button:has-text("Toggle Sidebar")').first();
                if (await t.count()) { await t.click(); await page.waitForTimeout(400); } else console.log('NO TRIGGER');
            }
            await page.getByText(name, { exact: true }).locator('visible=true').first().click({ timeout: 5000 });
            await page.waitForTimeout(900);
            await page.screenshot({ path: `${dir}/${label}-${id}.png`, fullPage: true });
            // 탭이 있는 화면은 각 탭도 캡처
            const tabs = page.locator('main [role="tab"]');
            const n = Math.min(await tabs.count(), 6);
            for (let i = 1; i < n; i++) { const tab = tabs.nth(i); const text = (await tab.innerText()).trim().replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 20); if (id === 'battle') break; await tab.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/${label}-${id}-tab${i}-${text}.png`, fullPage: true }); }
            if (n > 1 && id !== 'battle') await tabs.nth(0).click();
        } catch (e) { console.log('SKIP', label, id, e.message.split('\n')[0]); }
    }
    await page.close();
}
await browser.close();
