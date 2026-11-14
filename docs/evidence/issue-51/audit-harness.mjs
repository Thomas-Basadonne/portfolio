import { chromium, webkit } from '@playwright/test';
import fs from 'node:fs/promises';
const out=process.env.AUDIT_OUTPUT;
if(!out || !process.env.AUDIT_BASE_URL)throw new Error('Set AUDIT_OUTPUT to a fresh evidence directory and AUDIT_BASE_URL to the built preview');
await fs.mkdir(out,{recursive:true});
const matrix=[[320,568],[375,548],[390,664],[600,900],[760,1000],[761,1000],[800,1100],[1024,1366],[1080,1400],[1081,1400],[760,430],[1024,768],[1280,800],[1440,900],[1920,1080]];
const records=[], errors=[], screenshots=[];
function geometry(){
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
 const style=e=>{const s=getComputedStyle(e);return Object.fromEntries(['fontSize','lineHeight','fontFamily','letterSpacing','paddingLeft','paddingRight','gridTemplateColumns','transitionProperty','transitionDuration','outlineColor','outlineStyle','outlineWidth','color','backgroundColor','whiteSpace','overflowWrap'].map(k=>[k,s[k]]));};
 const link=document.querySelector('.contact-link[href^="mailto:"]'),strong=link.querySelector('strong');
 const r=document.createRange();r.selectNodeContents(strong);
 const rects=[...r.getClientRects()].filter(r=>r.width>0).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height}));
 const columns=[...document.querySelectorAll('.story-section__content')].map(e=>({class:e.className,box:box(e)}));
 const nodes=[...document.querySelectorAll('h1,h2,.reading-panel>p,.capability-list p,.capability-list small,.case-index__title em,.trace-list p,.site-footer,.chapter-kicker')].map(e=>({tag:e.tagName,text:e.innerText,box:box(e),style:style(e)}));
 return {viewport:[innerWidth,innerHeight],staged:document.querySelector('.scene-staged').hasAttribute('data-scene-layout'),lang:document.documentElement.lang,title:document.title,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),link:box(link),strong:box(strong),style:style(link),strongStyle:style(strong),textRects:rects,lines:new Set(rects.map(r=>Math.round(r.y))).size,focused:document.activeElement===link,focusVisible:link.matches(':focus-visible'),hover:link.matches(':hover'),scrollWidth:document.documentElement.scrollWidth,columns,nodes};
}
for(const [engine,launcher] of Object.entries({chromium,webkit})){
 const browser=await launcher.launch({headless:true,args:engine==='chromium'?['--use-mock-keychain']:[]});
 try{
 for(const layout of ['staged','fallback']) for(const locale of ['en','it']) for(const font of ['web','fallback']){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push({engine,layout,locale,font,error:e.message}));
  await page.route(/ExperienceCanvas-.*\.js/,r=>r.fulfill({contentType:'text/javascript',body:'await new Promise(() => {});'}));
  await page.addInitScript(({layout})=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){if(type.startsWith('webgl'))return layout==='staged'?{}:null;return Reflect.apply(original,this,[type,...rest]);};},{layout});
  if(font==='fallback')await page.route(/manrope-.*\.woff2/,r=>r.abort());
  await page.goto(`${process.env.AUDIT_BASE_URL}/?lang=${locale}#contact`);
  await page.locator('.hud__readout').waitFor();await page.evaluate(()=>document.fonts.ready);
  for(const [w,h] of matrix){
   await page.setViewportSize({width:w,height:h});await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
   await page.locator('.contact-link[href^="mailto:"]').scrollIntoViewIfNeeded();await page.waitForTimeout(40);
   const normal=await page.evaluate(geometry);
   await page.locator('.contact-link[href^="mailto:"]').hover();await page.waitForTimeout(40);const hover=await page.evaluate(geometry);
   await page.mouse.move(0,0);await page.keyboard.press('Tab');await page.locator('.contact-link[href^="mailto:"]').focus();await page.waitForTimeout(40);const focus=await page.evaluate(geometry);
   records.push({engine,layout,locale,font,w,h,normal,hover,focus});
   if(engine==='chromium'&&layout==='staged'&&font==='web'&&[[1440,900],[390,664],[1024,768]].some(v=>v[0]===w&&v[1]===h)){
    for(const [state,g] of [['focus',focus],['normal',normal],['hover',hover]]){
     await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
     if(state==='hover')await page.locator('.contact-link[href^="mailto:"]').hover();
     if(state==='focus'){await page.keyboard.press('Tab');await page.locator('.contact-link[href^="mailto:"]').focus();}
     await page.locator('.contact-links').screenshot({path:`${out}/email-${locale}-${w}-${state}.jpg`,type:'jpeg',quality:82});
    }
    for(const id of ['identity','about','capabilities','work','experience','contact']){
      await page.locator(`#${id} .story-section__content`).scrollIntoViewIfNeeded();
      if(id==='identity')await page.screenshot({path:`${out}/${id}-${locale}-${w}.jpg`,type:'jpeg',quality:75});
      else await page.locator(`#${id} .story-section__content`).screenshot({path:`${out}/${id}-${locale}-${w}.jpg`,type:'jpeg',quality:75});
    }
    await page.locator('.case-index__item').nth(1).click();await page.locator('.case-drawer[role="dialog"]').waitFor();
    await page.locator('.case-drawer[role="dialog"]').screenshot({path:`${out}/drawer-${locale}-${w}.jpg`,type:'jpeg',quality:75});await page.keyboard.press('Escape');
    screenshots.push({locale,w,h,layout:'held staged, renderer not started'});
   }
  }
  await fs.writeFile(`${out}/measurements.json`,JSON.stringify({baseline:'d909b1b',method:'Held CSS layout; no WebGL renderer; reduced-motion; real mouse hover and keyboard-modality focus',records,errors,screenshots},null,2));
  await context.close();console.log(engine,layout,locale,font,records.length);
 }
 }finally{await browser.close();}
}
console.log(JSON.stringify({records:records.length,errors,wrapOnHover:records.filter(r=>r.hover.lines>r.normal.lines).map(({engine,layout,locale,font,w,h,normal,hover,focus})=>({engine,layout,locale,font,w,h,normal:normal.lines,hover:hover.lines,focus:focus.lines,normalHeight:normal.link.h,hoverHeight:hover.link.h}))},null,2));
