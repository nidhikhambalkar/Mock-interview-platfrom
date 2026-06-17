import { chromium } from 'playwright';

(async () => {
  const url = 'https://frontend-ih7vw051s-nidhi-khambalkar-s-projects.vercel.app';
  const email = `e2e+${Date.now()}@weintern.com`;
  const password = 'Testpass123!';
  const fullName = 'E2E Test User';

  console.log('Starting smoke test against', url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG>', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR>', err));

  try {
    await page.goto(url + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Ensure the Sign Up tab is present before clicking
    await page.waitForSelector('text=Sign Up', { timeout: 20000 });
    const signUpTab = await page.locator('text=Sign Up');
    await signUpTab.click();

    // Fill form
    await page.fill('input[placeholder="Full Name"]', fullName);
    await page.fill('input[placeholder="Email or Mobile No."]', email);
    await page.fill('input[placeholder="Password"]', password);

    // Submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('button:has-text("Create Free Account")')
    ]);

    console.log('Navigation after signup:', page.url());

    // Wait for dashboard main indicator
    const success = await page.locator('text=Interviews Completed').first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);

    if (success) {
      console.log('Smoke test passed: Dashboard loaded successfully.');
    } else {
      console.error('Smoke test failed: Dashboard did not load in time. Current URL:', page.url());
      // capture screenshot
      const path = `./smoke-failure-${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true });
      console.error('Saved screenshot to', path);
    }

  } catch (err) {
    console.error('Error during smoke test:', err);
  } finally {
    await browser.close();
  }
})();
