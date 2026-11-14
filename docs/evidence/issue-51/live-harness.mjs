import { chromium, webkit } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const out=process.env.AUDIT_OUTPUT;
if(!out || !process.env.AUDIT_BASE_URL)throw new Error('Set AUDIT_OUTPUT to a fresh evidence directory and AUDIT_BASE_URL to the built preview');
const records=[],errors=[];
for(const engine of ['chromium','webkit']){
const browser=await ({chromium,webkit}[engine]).launch({args:engine==='chromium'?['--use-mock-keychain']:[]});
try{
for(const locale of ['en','it'])for(const [w,h] of [[390,664],[1440,900],[1920,1080]]){
const context=await browser.newContext({viewport:{width:w,height:h}}),page=await context.newPage();page.on('pageerror',e=>errors.push({engine,locale,w,error:e.message}));
await page.goto(`${process.env.AUDIT_BASE_URL}/?lang=${locale}#contact`);await page.locator('.hud__readout').waitFor();
await page.locator('.scene-staged[data-visual-ready]').waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);
const pause=page.locator('.motion-control');let pauseResult=null;if(await pause.count()){
 pauseResult=await pause.evaluate(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{box:{x:r.x,y:r.y,w:r.width,h:r.height},centerTarget:document.elementFromPoint(x,y)?.outerHTML?.slice(0,350)};});
 try{await pause.click({timeout:1200});pauseResult.pointerClick=true;}catch(e){pauseResult.pointerClick=false;pauseResult.blocker=e.message.slice(0,650);await pause.focus();await page.keyboard.press('Enter');}
 pauseResult.afterLabel=await pause.getAttribute('aria-label');
}
const link=page.locator('.contact-link[href^="mailto:"]');
const measure=()=>page.evaluate(()=>{const e=document.querySelector('.contact-link[href^="mailto:"]'),s=e.querySelector('strong'),r=document.createRange();r.selectNodeContents(s);const a=getComputedStyle(e);return{lines:new Set([...r.getClientRects()].map(r=>Math.round(r.top))).size,width:s.getBoundingClientRect().width,height:e.getBoundingClientRect().height,paddingLeft:a.paddingLeft,paddingRight:a.paddingRight,focusVisible:e.matches(':focus-visible'),background:a.backgroundColor,foreground:a.color,stageReady:document.querySelector('.scene-staged').hasAttribute('data-visual-ready')};});
await link.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.waitForTimeout(450);const normal=await measure();
if(engine==='chromium'&&w===1920)await page.locator('.contact-links').screenshot({path:`${out}/email-${locale}-${w}-normal.jpg`,type:'jpeg',quality:85});
await link.hover();await page.waitForTimeout(450);const hover=await measure();
if(engine==='chromium'&&w===1920)await page.locator('.contact-links').screenshot({path:`${out}/email-${locale}-${w}-hover.jpg`,type:'jpeg',quality:85});
await page.mouse.move(0,0);await page.keyboard.press('Tab');await link.focus();await page.waitForTimeout(450);const focus=await measure();
if(engine==='chromium'&&w===1920)await page.locator('.contact-links').screenshot({path:`${out}/email-${locale}-${w}-focus.jpg`,type:'jpeg',quality:85});
const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
const li=page.locator('.capability-list li').first();await li.scrollIntoViewIfNeeded();await page.waitForTimeout(450);
const liGeom=()=>li.evaluate(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return{h:b.height,w:b.width,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,tag:e.tagName,role:e.getAttribute('role'),tabindex:e.getAttribute('tabindex'),text:e.innerText};});
const liNormal=await liGeom();await li.hover();await page.waitForTimeout(450);const liHover=await liGeom();
const status=await page.locator('.case-index__status').first().evaluate(e=>({display:getComputedStyle(e).display,text:e.textContent}));
await page.locator('.case-index__item').nth(1).click();await page.locator('.case-drawer').waitFor();await page.waitForTimeout(800);
const drawer=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
await page.keyboard.press('Escape');
if(engine==='chromium'&&w!==1920){for(const id of ['identity','work']){await page.locator(`#${id}`).scrollIntoViewIfNeeded();await page.waitForTimeout(400);await page.screenshot({path:`${out}/live-${id}-${locale}-${w}.jpg`,type:'jpeg',quality:78});}}
records.push({engine,locale,w,h,pauseResult,normal,hover,focus,capability:{normal:liNormal,hover:liHover},status,axe:{violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:axe.passes.length,incomplete:axe.incomplete.map(v=>v.id)},drawerAxe:{violations:drawer.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:drawer.passes.length}});
await fs.writeFile(`${out}/live-checks.json`,JSON.stringify({method:'Real renderer ready; normal motion; pause using real control; settled 450ms; desktop mouse context including phone-sized viewports; axe snapshot page + Twin drawer',records,errors},null,2));await context.close();console.log(engine,locale,w);
}
}finally{await browser.close();}
}
