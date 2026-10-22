const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('https://code.jquery.com/jquery-3.7.1.min.js',r=>r.fulfill({path:path.resolve('FITCALC/assets/js/jquery-3.7.1.min.js'),contentType:'text/javascript'}));
 await page.goto('http://127.0.0.1:8000/weight-goal.html');
 await page.mouse.move(800,500);
 await page.waitForFunction(()=>document.querySelector('.header').classList.contains('is-idle-hidden'));
 await page.evaluate(()=>scrollTo(0,500));
 await page.waitForFunction(()=>!document.querySelector('.header').classList.contains('is-idle-hidden'));
 const top=await page.locator('#site-header').evaluate(e=>e.getBoundingClientRect().top);assert.equal(top,0);
 await page.mouse.move(500,35);await page.waitForTimeout(1300);
 assert.equal(await page.locator('.header').evaluate(e=>e.classList.contains('is-idle-hidden')),false);
 await page.mouse.move(800,500);await page.waitForFunction(()=>document.querySelector('.header').classList.contains('is-idle-hidden'));
 await page.locator('.logo').focus();assert.equal(await page.locator('.header').evaluate(e=>e.classList.contains('is-idle-hidden')),false);
 await page.waitForTimeout(1200);assert.equal(await page.locator('.header').evaluate(e=>e.classList.contains('is-idle-hidden')),false);
 console.log('PASS: sticky positioning, idle hiding, scroll reveal, mouse hover protection, keyboard focus protection.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
