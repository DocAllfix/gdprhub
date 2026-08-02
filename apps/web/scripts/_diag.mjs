import { chromium } from "playwright";
const S = process.argv[2];
const B="http://127.0.0.1:3100";
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1512,height:950},locale:"it-IT",deviceScaleFactor:1});
await ctx.request.post(`${B}/api/auth/sign-in/email`,{data:{email:"collaudo1@compliancedesk.it",password:"3g29f-tk8de-ipjsd"}});
const p=await ctx.newPage();
p.on("pageerror",e=>console.log("[pageerror]",e.message.slice(0,200)));
for (const [rotta, nome] of [["/cruscotto","cruscotto"],["/portafoglio","portafoglio"],["/scadenzario","scadenzario"]]) {
  await p.goto(`${B}${rotta}`,{waitUntil:"networkidle"});
  await p.waitForTimeout(700);
  await p.screenshot({path:`${S}/${nome}.png`});
  console.log(nome, "ok");
}
// barra collassata
await p.goto(`${B}/cruscotto`,{waitUntil:"networkidle"});
await p.locator('[data-tour="collassa"]').click();
await p.waitForTimeout(700);
await p.screenshot({path:`${S}/cruscotto-collassata.png`});
console.log("collassata:", await p.locator('[data-tour="collassa"]').getAttribute("aria-pressed"));
await b.close();
