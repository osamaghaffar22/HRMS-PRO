const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Login
  await page.goto('http://localhost:3000/login');
  // Wait for login to complete or do a programmatic login
  // Actually, we can just intercept the request or bypass it if not protected, but UI might redirect to /login
  // Let's see if we need to type credentials.
  try {
    await page.waitForSelector('input[placeholder="Username"]', {timeout: 2000});
    await page.type('input[placeholder="Username"]', 'admin');
    await page.type('input[placeholder="Password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  } catch(e) {}
  
  await page.goto('http://localhost:3000/employees?search=Muhammad%20Samiullah', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes("No matching registry records")) {
    console.log("TABLE TEXT: No matching registry records");
  } else if (html.includes("Samiullah")) {
    console.log("TABLE TEXT: Found the user");
  } else {
    console.log("TABLE TEXT: Something else", html.substring(0, 500));
  }
  
  await browser.close();
})();
