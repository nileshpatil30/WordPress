import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" });
for (const url of ["https://www.homedepot.com/", "https://www.lowes.com/", "https://www.menards.com/"]) {
  try {
    const r = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    console.log(`${url} -> HTTP ${r?.status()}  title="${(await p.title()).slice(0,60)}"`);
  } catch (e) {
    console.log(`${url} -> FAILED: ${String(e).split("\n")[0].slice(0,110)}`);
  }
}
await b.close();
