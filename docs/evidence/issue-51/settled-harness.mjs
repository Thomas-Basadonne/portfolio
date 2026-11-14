import { chromium,webkit } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const out=process.env.AUDIT_OUTPUT,records=[];
if(!out || !process.env.AUDIT_BASE_URL)throw new Error('Set AUDIT_OUTPUT to a fresh evidence directory and AUDIT_BASE_URL to the built preview');
for(const engine of ['chromium','webkit']){
const browser=await ({chromium,webkit}[engine]).launch({args:engine==='chromium'?['--use-mock-keychain']:[]});
try{for(const locale of ['en','it'])for(const [w,h] of [[390,664],[1440,900]]){
const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:w===390,isMobile:w===390}),page=await context.newPage();
await page.goto(`${process.env.AUDIT_BASE_URL}/?lang=${locale}#contact`);await page.locator('.scene-staged[data-visual-ready]').waitFor({timeout:30000});
await page.locator('.contact-links').scrollIntoViewIfNeeded();await page.waitForTimeout(1600);
const snapshot=()=>page.evaluate(()=>[...document.querySelectorAll('.chapter-nav a')].map(e=>{const s=getComputedStyle(e),em=e.querySelector('em');return{class:e.className,color:s.color,bg:s.backgroundColor,emColor:getComputedStyle(em).color,emOpacity:getComputedStyle(em).opacity};}));
const before=await snapshot();const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();const after=await snapshot();
const pause=await page.locator('.motion-control').evaluate(e=>{const r=e.getBoundingClientRect();const points=[];for(let dy=2;dy<r.height;dy+=4)for(let dx=2;dx<r.width;dx+=4){const p=document.elementFromPoint(r.x+dx,r.y+dy);points.push({dx,dy,hit:!!p&&(p===e||e.contains(p))});}return{box:{x:r.x,y:r.y,w:r.width,h:r.height},points,identity:document.querySelector('.hud__identity').getBoundingClientRect().toJSON(),touch:matchMedia('(pointer:coarse)').matches};});
let tap;try{if(w===390)await page.locator('.motion-control').tap({timeout:1000});else await page.locator('.motion-control').click({timeout:1000});tap={success:true,label:await page.locator('.motion-control').getAttribute('aria-label')};}catch(e){tap={success:false,reason:e.message.slice(0,700)};}
if(w===390&&engine==='chromium')await page.screenshot({path:`${out}/touch-pause-${locale}-${w}.jpg`,type:'jpeg',quality:85});
records.push({engine,locale,w,h,stable:JSON.stringify(before)===JSON.stringify(after),before,after,violations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),pause,tap});await context.close();
}}finally{await browser.close();}
}
await fs.writeFile(`${out}/settled-checks.json`,JSON.stringify({method:'1600ms after contact scroll; actual renderer; touch emulation on phones; nav style stability around axe',records},null,2));
console.log(JSON.stringify(records.map(r=>({engine:r.engine,locale:r.locale,w:r.w,stable:r.stable,violations:r.violations,pauseHit:r.pause.points.filter(p=>p.hit).length,points:r.pause.points.length,tap:r.tap.success})),null,2));
