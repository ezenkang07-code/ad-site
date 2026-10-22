// Run with the local FITCALC server on port 8000 and Playwright available via NODE_PATH.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Seoul',reducedMotion:'reduce'});
 await context.route('https://code.jquery.com/jquery-3.7.1.min.js',r=>r.fulfill({path:path.resolve('FITCALC/assets/js/jquery-3.7.1.min.js'),contentType:'text/javascript'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8000/';
 const count=()=>page.locator('#wl-rows [data-delete]').count();
 async function add(date,w,n='아침 공복'){await page.fill('#wl-date',date);await page.fill('#wl-weight',String(w));await page.fill('#wl-note',n);await page.click('#wl-form [type=submit]');}
 try {
 await page.goto(base+'weight-goal.html');
 assert.equal(await page.locator('#weight-log').count(),0);assert.equal(await page.locator('script[src*="weight-log"]').count(),0);
 await page.click('#calculateWeightGoal');assert.equal(await page.locator('#weightResultContent').isVisible(),true);
 await page.locator('.nav-dropdown-toggle').click();await page.locator('.dropdown-link[data-nav-key="weightlog"]').click();
 await page.waitForSelector('#wl-rows button');assert.equal(await count(),7);assert.match(page.url(),/weight-log.html/);
 assert.equal(await page.locator('.dropdown-link.is-active').getAttribute('data-nav-key'),'weightlog');
 assert.equal(await page.locator('#calculator').count(),0);assert.equal(await page.evaluate(()=>typeof Chart),'function');
 await page.fill('#wl-target','64');assert.match(await page.textContent('#wl-goal'),/64.0/);await page.reload();assert.equal(await page.inputValue('#wl-target'),'64');
 const dates=await page.evaluate(()=>{const d=new Date();return [0,1,3,15].map(n=>{const x=new Date(d);x.setDate(x.getDate()-n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');});});
 await page.click('#wl-clear');await page.reload();assert.equal(await count(),0);
 await page.click('#wl-form [type=submit]');assert.equal(await page.getAttribute('#wl-weight','aria-invalid'),'true');
 await add(dates[0],68,'<img src=x onerror=alert(1)>');await add(dates[2],70);assert.match(await page.textContent('#wl-current'),/68.0/);assert.equal(await page.locator('#wl-rows img').count(),0);assert.equal(await page.locator('#wl-rows tr').first().locator('td').nth(2).textContent(),'—');
 await add(dates[1],69);assert.match(await page.locator('#wl-rows tr').first().locator('td').nth(2).textContent(),/-1.0/);
 page.once('dialog',d=>d.dismiss());await add(dates[0],63);assert.match(await page.textContent('#wl-current'),/68.0/);
 page.once('dialog',d=>d.accept());await add(dates[0],63);assert.equal(await count(),3);assert.match(await page.textContent('#wl-remaining'),/0.0/);
 await page.fill('#wl-target','75');assert.match(await page.textContent('#wl-remaining'),/12.0/);
 page.once('dialog',d=>d.accept());await add(dates[0],76);assert.match(await page.textContent('#wl-goal'),/달성/);
 await page.fill('#wl-target','');assert.equal(await page.textContent('#wl-remaining'),'—');await page.fill('#wl-target','65');
 await page.locator('#weight-log').screenshot({path:'FITCALC/tests/weight-log-desktop.png'});
 await page.setViewportSize({width:390,height:844});console.log(await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth,els:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,e.getBoundingClientRect().width]).slice(0,15)})));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#weight-log').screenshot({path:'FITCALC/tests/weight-log-mobile.png'});
 await page.click('.nav-toggle');assert.equal(await page.getAttribute('.nav-toggle','aria-expanded'),'true');await page.click('.nav-toggle');
 while(await count()) await page.locator('#wl-rows [data-delete]').first().click();
 await add(dates[3],72);assert.match(await page.textContent('#wl-chart-empty'),/없습니다/);await page.click('[data-days="30"]');assert.equal(await page.textContent('#wl-chart-empty'),'');await page.reload();assert.equal(await count(),1);
 await page.evaluate(()=>localStorage.setItem('fitcalc.weight-log.v1','broken'));await page.reload();assert.equal(await count(),0);assert.match(await page.textContent('#wl-storage'),/읽을 수/);
 await context.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('denied');};});await page.reload();await add(dates[0],71);assert.equal(await count(),1);assert.match(await page.textContent('#wl-storage'),/저장하지 못/);
 await page.goto(base+'index.html');assert.equal(await page.locator('.home-calculator-card a[href="weight-log.html#home"]').count(),1);
 assert.deepEqual(errors,[]);console.log('PASS: separate menu/page, goal calculator retained, home link, active menu, independent target persistence, CRUD, chronological KPIs, daily deltas, validation, safe text, periods, storage failures, mobile layout/menu, no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

