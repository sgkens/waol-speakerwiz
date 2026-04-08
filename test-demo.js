import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('Browser log:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('Browser error:', err));

  const { exec } = await import('child_process');
  const server = exec('npx vite demo --port 3000');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 1000));
  
  try {
    await page.click('#play-btn');
    console.log("Play button clicked successfully");
  } catch (e) {
    console.log("Could not click play button", e);
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  console.log("Done testing");
  server.kill();
  await browser.close();
})();
