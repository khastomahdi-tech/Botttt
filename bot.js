const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function tg(method,body,env){if(body&&typeof body==='object')for(const k of Object.keys(body))if(body[k]===null)delete body[k];const call=async b=>{for(let i=0;i<5;i++){try{const r=await fetch('https://api.telegram.org/bot'+env.BOT_TOKEN+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});if(r.status===429||r.status>=500){await sleep(400*(i+1));continue}const j=await r.json().catch(()=>null);if(j)return j}catch(e){}await sleep(400*(i+1))}return {ok:false,description:'Telegram API response error'}};let x=await call(body);if(x&&!x.ok&&body&&body.reply_markup&&body.reply_markup.inline_keyboard){const kb=body.reply_markup.inline_keyboard.map(row=>row.map(btn=>{const o={...btn};delete o.style;return o}));x=await call({...body,reply_markup:{inline_keyboard:kb}})}return x}
const esc=s=>String(s??'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
const B=(text,callback_data=null,url=null,style=null)=>{let st=style;if(!st){const x=String(callback_data||''),t=String(text||'');if(/^(del|ban|pud|close)/.test(x)||/حذف|بن |مسدود|خاموش/.test(t))st='danger';else if(/^(menu|help|guide|admin|users|panels|panel|pusers|u|admin_|userpanels|profile|status|settings|health)/.test(x)||/بازگشت|منو|اطلاعات|وضعیت|مدیریت/.test(t))st='primary';else st='success';}const o={text:String(text),style:st};if(url)o.url=String(url);else if(callback_data)o.callback_data=String(callback_data);return o};
const KB=rows=>({inline_keyboard:rows.filter(Boolean)}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CF_TOKEN_URL='https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22page%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&name=Vex-Panel-Token&accountId=*&zoneId=all';
async function dbInit(env){await env.BOT_DB.batch([env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS cf_accts(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT NOT NULL,label TEXT,account_name TEXT,account_id TEXT NOT NULL,token_enc TEXT NOT NULL,status TEXT,err TEXT,created INTEGER)'),env.BOT_DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS cf_accts_chat_acc ON cf_accts(chat_id,account_id)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS panel_main(id INTEGER PRIMARY KEY CHECK(id=1),repo_url TEXT,file_url TEXT,sha256 TEXT,updated INTEGER)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS panel_sources(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,repo_url TEXT NOT NULL,file_url TEXT NOT NULL,sha256 TEXT NOT NULL,created INTEGER NOT NULL)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS vex_panels(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT NOT NULL,name TEXT,account_db_id INTEGER,pages_project TEXT,d1_id TEXT,url TEXT,created INTEGER,active INTEGER DEFAULT 1)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS users(chat_id TEXT PRIMARY KEY,username TEXT,first_name TEXT,created INTEGER,last_seen INTEGER,banned INTEGER DEFAULT 0)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS state(chat_id TEXT PRIMARY KEY,step TEXT DEFAULT "",data TEXT DEFAULT "",updated INTEGER)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT,action TEXT,detail TEXT,ts INTEGER)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT)'),env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS temp_emails(chat_id TEXT PRIMARY KEY,address TEXT,account_id TEXT,token TEXT,password TEXT,created INTEGER,provider TEXT)'),env.BOT_DB.prepare("INSERT OR IGNORE INTO settings(k,v) VALUES('bot_enabled','1')")]);try{await env.BOT_DB.prepare('ALTER TABLE temp_emails ADD COLUMN provider TEXT').run()}catch(e){}}
async function acctKey(env){const s=String(env.ACCT_SECRET||'');if(!s)throw new Error('ACCT_SECRET تنظیم نشده است');const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return crypto.subtle.importKey('raw',b,{name:'AES-GCM'},false,['encrypt','decrypt']);}
function acctB64(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s);}
function acctUnB64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function acctEnc(env,plain){const k=await acctKey(env);const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(String(plain)));return acctB64(iv)+'.'+acctB64(ct);}
async function acctDec(env,enc){const p=String(enc||'').split('.');const k=await acctKey(env);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:acctUnB64(p[0])},k,acctUnB64(p[1]));return new TextDecoder().decode(pt);}
async function cfAccountsList(token){const r=await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=50',{headers:{Authorization:'Bearer '+token}});const j=await r.json().catch(()=>null);if(!j||!j.success||!Array.isArray(j.result))return {ok:false,error:'فهرست حساب‌های Cloudflare خوانده نشد.'};return {ok:true,list:j.result.map(a=>({id:String(a.id||''),name:String(a.name||'')}))};}
async function cfAccountName(token,accountId){try{const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(accountId),{headers:{Authorization:'Bearer '+token}});const j=await r.json().catch(()=>null);return (j&&j.success&&j.result&&j.result.name)?String(j.result.name):'';}catch(e){return '';}}
async function isLocalAcct(env,chat,id){try{await dbInit(env);const r=await env.BOT_DB.prepare('SELECT id FROM cf_accts WHERE id=? AND chat_id=?').bind(Number(id)||0,String(chat)).first();return !!r;}catch(e){return false;}}
async function localAddToken(env,chat,token,accIn){
  await dbInit(env);
  if(!String(env.ACCT_SECRET||''))return {ok:false,error:'کلید رمزنگاری ربات (ACCT_SECRET) تنظیم نشده. ربات را از پنل نصب/آپدیت کن.'};
  const tok=String(token||'').trim();
  if(!tok)return {ok:false,error:'توکن خالی است.'};
  let accId=String(accIn||'').trim(),accName='';
  if(!accId){
    const l=await cfAccountsList(tok);
    if(!l.ok)return {ok:false,error:l.error};
    if(!l.list.length)return {ok:false,error:'این توکن به هیچ حساب Cloudflare دسترسی ندارد.'};
    if(l.list.length>1)return {ok:false,need_account:true};
    accId=l.list[0].id;accName=l.list[0].name;
  }else{
    if(!/^[a-f0-9]{32}$/i.test(accId))return {ok:false,error:'Account ID نامعتبر است.'};
    const v=await cfVerifyAccount(tok,accId);
    if(!v.ok)return {ok:false,error:v.error};
    accName=await cfAccountName(tok,accId);
  }
  const dup=await env.BOT_DB.prepare('SELECT id FROM cf_accts WHERE chat_id=? AND account_id=?').bind(String(chat),accId).first();
  if(dup)return {ok:false,duplicate:true};
  const enc=await acctEnc(env,tok);
  const label=accName||accId.slice(0,8);
  await env.BOT_DB.prepare('INSERT INTO cf_accts(chat_id,label,account_name,account_id,token_enc,status,err,created) VALUES(?,?,?,?,?,?,?,?)').bind(String(chat),label,accName,accId,enc,'ok','',Date.now()).run();
  return {ok:true,label};
}
const LOCAL_ACTS=new Set(['add_token','accounts','account_info','delete_accounts','delete_account','new_panel','panels','ps_list','main_update','welcome_get','welcome_set','support','bot_cfg_get','bot_cfg_set','force_channels','force_channel_add','force_channel_toggle','force_channel_delete','tut_get','tut_set','tut_clear','ps_add','ps_del','ps_refresh','my_panels','recent_panels','recent_panel_info','panel_settings','set_panel_setting','rename_panel','panel_health','toggle_panel','panel_access','delete_panel','panel_password','service_users','service_user_info','service_user_toggle','service_user_delete']);
const PANEL_D1_SCHEMA=`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,uuid TEXT UNIQUE,token TEXT UNIQUE,limit_bytes INTEGER DEFAULT 0,used INTEGER DEFAULT 0,expire INTEGER DEFAULT 0,active INTEGER DEFAULT 1,created INTEGER,last INTEGER DEFAULT 0,cfgs TEXT DEFAULT "[]");CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE IF NOT EXISTS sessions(t TEXT PRIMARY KEY,exp INTEGER);CREATE TABLE IF NOT EXISTS fails(ip TEXT,ts INTEGER);CREATE TABLE IF NOT EXISTS daily(day TEXT PRIMARY KEY,conns INTEGER DEFAULT 0,bytes INTEGER DEFAULT 0)`;
const CF_D1_LIMIT=10;
function randHex(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sha256Hex(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s)));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function cfTransient(j){
  if(!j)return true;
  const st=Number(j._st||0);
  if(st===429||st>=500)return true;
  const m=String(cfxErr(j)||'').toLowerCase();
  if(!m||m==='خطای نامشخص')return true;
  if(/rate.?limit|too many requests/i.test(m))return true;
  if(/already exist|already taken|exist/i.test(m))return false;
  if(/auth|permission|forbidden|not found|invalid|quota|limit|exceed|illegal|malformed/i.test(m))return false;
  return /1101|1102|1027|exception|internal|bad gateway|unavailable|temporar|timed? ?out|try again|connection|network|reset/i.test(m);
}
async function cfx(token,method,path,body,retry){
  const max=(typeof retry==='number')?retry:8;
  let j=null;
  for(let i=0;i<=max;i++){
    const h={Authorization:'Bearer '+token};
    let payload=undefined;
    if(body instanceof FormData){payload=body;}
    else if(body!==undefined&&body!==null){h['Content-Type']='application/json';payload=JSON.stringify(body);}
    try{const r=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:h,body:payload});const jj=await r.json().catch(()=>null);j=(jj&&typeof jj==='object')?jj:{success:false,errors:[{message:'پاسخ نامعتبر از Cloudflare (HTTP '+r.status+')'}]};j._st=r.status;}
    catch(e){j={success:false,errors:[{message:'ارتباط با Cloudflare برقرار نشد'}]};}
    if(j&&j.success)return j;
    if(!cfTransient(j))return j;
    if(i<max)await sleep(Math.min(450*(i+1),2200));
  }
  return j;
}
function cfxErr(j){if(!j)return 'خطای نامشخص';const m=(j.errors||[]).map(e=>e&&e.message).filter(Boolean).join(' / ');return m||'خطای نامشخص';}
async function d1Count(tok,acc){let n=0;for(let page=1;page<=20;page++){const r=await cfx(tok,'GET','/accounts/'+acc+'/d1/database?per_page=100&page='+page);if(!r.success)return {ok:false,error:cfxErr(r)};const list=Array.isArray(r.result)?r.result:[];n+=list.length;if(list.length<100)break;}return {ok:true,n};}
async function d1FindByName(tok,acc,name){for(let page=1;page<=10;page++){const r=await cfx(tok,'GET','/accounts/'+acc+'/d1/database?per_page=100&page='+page);if(!r.success)break;const list=Array.isArray(r.result)?r.result:[];const f=list.find(x=>String(x.name||'')===String(name));if(f&&f.uuid)return String(f.uuid);if(list.length<100)break;}return '';}
async function d1Create(tok,acc,name){let r=await cfx(tok,'POST','/accounts/'+acc+'/d1/database',{name});let u=r.result&&r.result.uuid;if(!u&&/exist/i.test(cfxErr(r)))u=await d1FindByName(tok,acc,name);return u?{uuid:String(u),error:''}:{uuid:'',error:cfxErr(r)};}
async function d1Exec(tok,acc,d1,sql){return cfx(tok,'POST','/accounts/'+acc+'/d1/database/'+d1+'/query',{sql});}
async function d1Delete(tok,acc,d1){return cfx(tok,'DELETE','/accounts/'+acc+'/d1/database/'+d1);}
async function pagesCreateProject(tok,acc,name){const r=await cfx(tok,'POST','/accounts/'+acc+'/pages/projects',{name,production_branch:'main'});if(!r.success&&/exist/i.test(cfxErr(r)))return {success:true,_existed:true};return r;}
async function pagesLatestId(tok,acc,pj){const r=await cfx(tok,'GET','/accounts/'+acc+'/pages/projects/'+pj+'/deployments?per_page=1');return String((r.result&&r.result[0]&&r.result[0].id)||'');}
async function pagesDeploy(tok,acc,pj,src,d1Id){
  const base='/accounts/'+acc+'/pages/projects/'+pj;
  const pa=await cfx(tok,'PATCH',base,{deployment_configs:{production:{d1_databases:{DB:{id:d1Id}},env_vars:{}}}});
  if(!pa.success)return pa;
  const fd=new FormData();
  fd.append('branch','main');fd.append('manifest','{}');
  fd.append('_worker.js',new Blob([src],{type:'application/javascript+module'}),'_worker.js');
  return cfx(tok,'POST',base+'/deployments',fd);
}
async function pagesWaitNew(tok,acc,pj,prevId,maxMs=120000){
  const t0=Date.now();let last='';
  while(Date.now()-t0<maxMs){
    const r=await cfx(tok,'GET','/accounts/'+acc+'/pages/projects/'+pj+'/deployments?per_page=1');
    const d=r.result&&r.result[0];
    if(d&&String(d.id||'')!==String(prevId)){
      const st=String((d.latest_stage&&d.latest_stage.status)||''),nm=String((d.latest_stage&&d.latest_stage.name)||'');
      if(st==='failure')return 'دیپلوی Pages در Cloudflare ناموفق بود (مرحله: '+(nm||'نامشخص')+').';
      if(nm==='deploy'&&st==='success')return '';
      last=nm+' / '+st;
    }
    await new Promise(res=>setTimeout(res,4000));
  }
  return 'نسخه‌ی جدید در Pages در زمان مقرر فعال نشد'+(last?' (آخرین وضعیت: '+last+')':'')+'.';
}
function cfBadBody(t){return /error code: ?110\d|worker threw exception|internal server error/i.test(String(t||'').slice(0,8000));}
async function waitPanelLive(url,maxMs){
  const t0=Date.now();let n=0;
  while(Date.now()-t0<maxMs){
    n++;
    try{const r=await fetch(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; panel-check)','cache-control':'no-cache'}});if(r.status<500){const t=await r.text().catch(()=>'');if(!cfBadBody(t))return true;}}catch(e){}
    await sleep(Math.min(1200+n*250,3000));
  }
  return false;
}
async function workerUploadScript(tok,acc,name,src,d1Id){
  const compat=new Date().toISOString().slice(0,10);
  const fd=new FormData();
  const isModule=src.includes('export default');
  const bindings=[{type:'d1',name:'DB',id:d1Id}];
  const meta=isModule?{main_module:'_worker.js',compatibility_date:compat,bindings}:{body_part:'script',compatibility_date:compat,bindings};
  fd.append('metadata',new Blob([JSON.stringify(meta)],{type:'application/json'}),'metadata.json');
  if(isModule)fd.append('file',new Blob([src],{type:'application/javascript+module'}),'_worker.js');
  else fd.append('script',new Blob([src],{type:'application/javascript'}),'script.js');
  return cfx(tok,'PUT','/accounts/'+acc+'/workers/scripts/'+encodeURIComponent(name),fd);
}
async function workerEnableSubdomain(tok,acc,name){
  let r=await cfx(tok,'POST','/accounts/'+acc+'/workers/scripts/'+encodeURIComponent(name)+'/subdomain',{enabled:true,previews_enabled:true});
  if(!r.success&&/preview/i.test(cfxErr(r)))r=await cfx(tok,'POST','/accounts/'+acc+'/workers/scripts/'+encodeURIComponent(name)+'/subdomain',{enabled:true});
  return r;
}
async function workerSubdomainGet(tok,acc){
  const r=await cfx(tok,'GET','/accounts/'+acc+'/workers/subdomain');
  let sd=(r.success&&r.result&&r.result.subdomain)?String(r.result.subdomain).trim().toLowerCase():'';
  if(!sd){
    const cand=('vex'+randHex(5)).replace(/[^a-z0-9]/g,'');
    let cr=await cfx(tok,'PUT','/accounts/'+acc+'/workers/subdomain',{subdomain:cand});
    if(!cr.success)cr=await cfx(tok,'POST','/accounts/'+acc+'/workers/subdomain',{subdomain:cand});
    if(cr.success&&cr.result&&cr.result.subdomain)sd=String(cr.result.subdomain).trim().toLowerCase();
  }
  return sd;
}
async function workerDelete(tok,acc,name){try{await cfx(tok,'DELETE','/accounts/'+acc+'/workers/scripts/'+encodeURIComponent(String(name||'')))}catch(e){}}
async function workerNewPanel(env,chat,p,row,tok,acc,body,d1Uuid){
  const name='vexworker-'+randHex(5);
  let up=await workerUploadScript(tok,acc,name,body,d1Uuid);
  if(!up.success){try{await d1Delete(tok,acc,d1Uuid)}catch(e){}return {ok:false,error:'ساخت Worker ناموفق بود: '+cfxErr(up)};}
  await workerEnableSubdomain(tok,acc,name);
  const sd=await workerSubdomainGet(tok,acc);
  if(!sd){await workerDelete(tok,acc,name);try{await d1Delete(tok,acc,d1Uuid)}catch(e){}return {ok:false,error:'دامنه‌ی workers.dev برای این حساب فعال نیست. در داشبورد Cloudflare بخش Workers & Pages یک Subdomain بساز و دوباره تلاش کن.'};}
  const url='https://'+name+'.'+sd+'.workers.dev/';
  let live=await waitPanelLive(url,75000);
  if(!live){
    up=await workerUploadScript(tok,acc,name,body,d1Uuid);
    if(up.success){await workerEnableSubdomain(tok,acc,name);live=await waitPanelLive(url,30000);}
  }
  if(!live){await workerDelete(tok,acc,name);try{await d1Delete(tok,acc,d1Uuid)}catch(e){}return {ok:false,error:'Worker بعد از چند بار تلاش هنوز خطای 1101 می‌داد؛ منابع پاک شد. لطفاً دوباره تلاش کن یا گزینه‌ی Pages را انتخاب کن.'};}
  const nameP=String(p.name||'وکس پنل').slice(0,60);
  const ins=await env.BOT_DB.prepare('INSERT INTO vex_panels(chat_id,name,account_db_id,pages_project,d1_id,url,created,active) VALUES(?,?,?,?,?,?,?,1)').bind(String(chat),nameP,Number(row.id),name,d1Uuid,url,Date.now()).run();
  const pid=Number(ins&&ins.meta&&ins.meta.last_row_id)||0;
  return {ok:true,text:'پنل ساخته شد: '+url,panel:{id:pid,name:nameP,location:'worker',domain:url}};
}
function psValidBody(b){if(typeof b!=='string')return false;const n=new TextEncoder().encode(b).length;if(n<200||n>2097152)return false;if(b.trimStart()[0]==='<')return false;return b.includes('export default')||b.includes("addEventListener('fetch'")||b.includes('addEventListener("fetch"');}
async function psFetchFile(url){try{const r=await fetch(url,{headers:{'User-Agent':'vex-panel-bot'}});if(!r.ok)return '';const t=await r.text();return psValidBody(t)?t:'';}catch(e){return '';}}
async function psGh(url){try{const r=await fetch(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'vex-panel-bot'}});if(!r.ok)return null;const j=await r.json();return (j&&typeof j==='object')?j:null;}catch(e){return null;}}
async function psResolve(input){
  let u;try{u=new URL(String(input||'').trim());}catch(e){return {err:'لینک باید یک لینک https از github.com یا raw.githubusercontent.com باشد.'};}
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||(host!=='github.com'&&host!=='raw.githubusercontent.com'))return {err:'لینک باید یک لینک https از github.com یا raw.githubusercontent.com باشد.'};
  const parts=u.pathname.split('/').filter(Boolean);
  const seg=/^[A-Za-z0-9._-]+$/;
  if(host==='raw.githubusercontent.com'){
    if(parts.length<4||!/\.js$/i.test(u.pathname))return {err:'لینک raw باید به یک فایل .js اشاره کند.'};
    if(!(await psFetchFile(u.href)))return {err:'فایل raw دریافت نشد یا فایل پنل معتبر نیست.'};
    return {file:u.href};
  }
  if(parts.length<2)return {err:'لینک مخزن کامل نیست (مثلاً https://github.com/owner/repo).'};
  const owner=parts[0],repo=parts[1].replace(/\.git$/i,'');
  if(!seg.test(owner)||!seg.test(repo))return {err:'نام مخزن معتبر نیست.'};
  if(parts.length>=5&&parts[2]==='blob'&&/\.js$/i.test(u.pathname)){
    const ref=parts[3],fp=parts.slice(4).join('/');
    const raw='https://raw.githubusercontent.com/'+owner+'/'+repo+'/'+encodeURIComponent(ref)+'/'+fp.split('/').map(encodeURIComponent).join('/');
    if(!(await psFetchFile(raw)))return {err:'فایل از لینک GitHub دریافت نشد یا فایل پنل معتبر نیست (باید export default یا addEventListener("fetch") داشته باشد).'};
    return {file:raw};
  }
  let branch='';
  if(parts.length>=4&&parts[2]==='tree'&&seg.test(parts[3]))branch=parts[3];
  if(!branch){
    const meta=await psGh('https://api.github.com/repos/'+owner+'/'+repo);
    if(meta===null)return {err:'GitHub پاسخ نداد یا محدودیت درخواست (rate limit) خورده است. چند دقیقه بعد دوباره امتحان کن، یا لینک مستقیم فایل را بفرست (مثلاً https://github.com/owner/repo/blob/main/worker.js).'};
    if(!meta.default_branch)return {err:'مخزن پیدا نشد یا خصوصی است. مخزن باید عمومی باشد.'};
    branch=String(meta.default_branch);
  }
  const tree=await psGh('https://api.github.com/repos/'+owner+'/'+repo+'/git/trees/'+encodeURIComponent(branch)+'?recursive=1');
  if(!tree||!Array.isArray(tree.tree))return {err:'فهرست فایل‌های مخزن از GitHub گرفته نشد (احتمالاً محدودیت درخواست). چند دقیقه بعد دوباره امتحان کن.'};
  const js=tree.tree.filter(n=>n&&n.type==='blob'&&/\.js$/i.test(String(n.path||''))&&!(Number(n.size)>2097152)).map(n=>String(n.path));
  if(!js.length)return {err:'هیچ فایل .js در این مخزن پیدا نشد.'};
  const rank=f=>{const bn=f.split('/').pop().toLowerCase();if(bn==='_worker.js')return 0;if(bn==='worker.js')return 1;if(bn==='index.js')return 2;return 3+(f.split('/').length-1);};
  js.sort((a,b)=>rank(a)-rank(b));
  for(const path of js.slice(0,15)){const url='https://raw.githubusercontent.com/'+owner+'/'+repo+'/'+encodeURIComponent(branch)+'/'+path.split('/').map(encodeURIComponent).join('/');if(await psFetchFile(url))return {file:url};}
  return {err:'فایل .js پیدا شد اما هیچ‌کدام فایل پنل معتبر نبود (باید export default یا addEventListener("fetch") داشته باشد). فایل‌های .js مخزن: '+js.slice(0,5).join('، ')};
}
async function psMainUpdate(env,repo){
  const rr=await psResolve(repo);
  if(rr.err)return {ok:false,error:rr.err};
  const body=await psFetchFile(rr.file);
  if(!body)return {ok:false,error:'فایل از مخزن دریافت نشد.'};
  const hash=await sha256Hex(body);
  await env.BOT_DB.prepare('REPLACE INTO panel_main(id,repo_url,file_url,sha256,updated) VALUES(1,?,?,?,?)').bind(String(repo),rr.file,hash,Date.now()).run();
  return {ok:true,sha256:hash.slice(0,16),size:new TextEncoder().encode(body).length,file:rr.file};
}
async function localNewPanel(env,chat,p){
  const target=(String(p.target||'').toLowerCase()==='worker')?'worker':'pages';
  if(!isOwner(String(chat),env)){const lim=Number(await kvGetBot(env,'panel_limit','0'))||0;if(lim>0){const cr=await env.BOT_DB.prepare('SELECT COUNT(*) AS n FROM vex_panels WHERE chat_id=?').bind(String(chat)).first();const cur=Number(cr&&cr.n)||0;if(cur>=lim)return {ok:false,error:'سقف ساخت پنل برای حساب شما ('+lim+' پنل) پر شده است. برای افزایش سقف با پشتیبانی تماس بگیر.'};}}
  const srcId=Number(p.source||0);
  const row=await env.BOT_DB.prepare('SELECT * FROM cf_accts WHERE id=? AND chat_id=?').bind(Number(p.account_id)||0,String(chat)).first();
  if(!row)return {ok:false,error:'حساب Cloudflare پیدا نشد. حساب را دوباره انتخاب کن.'};
  let fileUrl,expHash;
  if(srcId>0){
    const sr=await env.BOT_DB.prepare('SELECT * FROM panel_sources WHERE id=?').bind(srcId).first();
    if(!sr)return {ok:false,error:'منبع پنل پیدا نشد.'};
    fileUrl=String(sr.file_url||'');expHash=String(sr.sha256||'');
  }else{
    const main=await env.BOT_DB.prepare('SELECT * FROM panel_main WHERE id=1').first();
    if(!main)return {ok:false,error:'پنل اصلی هنوز آپدیت نشده است. از ادمین «آپدیت پنل اصلی» را انجام بده.'};
    fileUrl=String(main.file_url||'');expHash=String(main.sha256||'');
  }
  const body=await psFetchFile(fileUrl);
  if(!body)return {ok:false,error:'فایل پنل از مخزن دریافت نشد. دوباره از ادمین ثبت یا به‌روز کن.'};
  if((await sha256Hex(body))!==expHash)return {ok:false,error:'فایل پنل از زمان ثبت تغییر کرده است. دوباره از ادمین ثبت یا به‌روز کن.'};
  const tok=await acctDec(env,row.token_enc);
  const acc=String(row.account_id);
  const cnt=await d1Count(tok,acc);
  if(!cnt.ok)return {ok:false,error:'فهرست دیتابیس‌های D1 خوانده نشد: '+cnt.error};
  if(cnt.n>=CF_D1_LIMIT)return {ok:false,error:'سهمیه‌ی D1 این حساب پر است (حداکثر '+CF_D1_LIMIT+' دیتابیس). در داشبورد Cloudflare یک D1 بلااستفاده را حذف کن و دوباره بساز.'};
  const d1=await d1Create(tok,acc,'demon-panel-'+randHex(4));
  if(!d1.uuid)return {ok:false,error:'ساخت دیتابیس D1 ناموفق بود: '+d1.error};
  for(const stm of PANEL_D1_SCHEMA.split(';')){
    if(!stm.trim())continue;
    const r=await d1Exec(tok,acc,d1.uuid,stm.trim());
    if(!r.success){await d1Delete(tok,acc,d1.uuid);return {ok:false,error:'ساخت جدول‌های پنل ناموفق بود: '+cfxErr(r)};}
  }
  if(target==='worker')return workerNewPanel(env,chat,p,row,tok,acc,body,d1.uuid);
  const pj='vexpanel-'+randHex(5);
  const pc=await pagesCreateProject(tok,acc,pj);
  if(!pc.success&&!pc._existed){await d1Delete(tok,acc,d1.uuid);return {ok:false,error:'ساخت پروژه Pages ناموفق بود: '+cfxErr(pc)};}
  const prevId=await pagesLatestId(tok,acc,pj);
  const dep=await pagesDeploy(tok,acc,pj,body,d1.uuid);
  if(!dep.success){await d1Delete(tok,acc,d1.uuid);return {ok:false,error:'دیپلوی Pages ناموفق بود: '+cfxErr(dep)};}
  const werr=await pagesWaitNew(tok,acc,pj,prevId);
  if(werr)return {ok:false,error:werr};
  const url='https://'+pj+'.pages.dev/';
  let live=await waitPanelLive(url,75000);
  if(!live)live=await waitPanelLive(url,30000);
  if(!live){try{await d1Delete(tok,acc,d1.uuid)}catch(e){}return {ok:false,error:'پنل بعد از چند بار بررسی هنوز خطای 1101 می‌داد؛ دیتابیس پاک شد. لطفاً دوباره تلاش کن یا گزینه‌ی Worker را انتخاب کن.'};}
  const name=String(p.name||'وکس پنل').slice(0,60);
  const ins=await env.BOT_DB.prepare('INSERT INTO vex_panels(chat_id,name,account_db_id,pages_project,d1_id,url,created,active) VALUES(?,?,?,?,?,?,?,1)').bind(String(chat),name,Number(row.id),pj,d1.uuid,url,Date.now()).run();
  const pid=Number(ins&&ins.meta&&ins.meta.last_row_id)||0;
  return {ok:true,text:'پنل ساخته شد: '+url,panel:{id:pid,name,location:'pages',domain:url}};
}
const MENU_ALLOWED=['build','panels','accounts','addcf','tempmail','ub_menu','support'];
const MENU_DEFAULT=[{k:'build',text:'🚀 ساخت پنل',style:'success',on:1},{k:'panels',text:'📦 پنل‌های من',style:'primary',on:1},{k:'accounts',text:'☁️ حساب‌های Cloudflare',style:'primary',on:1},{k:'addcf',text:'➕ افزودن Cloudflare',style:'success',on:1},{k:'tempmail',text:'📧 ایمیل موقت',style:'success',on:1},{k:'ub_menu',text:'🤖 مدیریت ربات',style:'success',on:1},{k:'support',text:'💬 ارتباط با پشتیبانی',style:'primary',on:1}];
async function kvGet(env,k,d=''){const r=await env.BOT_DB.prepare('SELECT v FROM settings WHERE k=?').bind(k).first();return (r&&r.v!=null)?String(r.v):d;}
async function kvSet(env,k,v){await env.BOT_DB.prepare('REPLACE INTO settings(k,v) VALUES(?,?)').bind(k,String(v)).run();}
function isOwnerChat(env,chat){const o=String(env.BOT_OWNER_ID||'');return o!==''&&String(chat)===o;}
async function fcList(env){let a=[];try{a=JSON.parse(await kvGet(env,'tg_force_channels','[]'));}catch(e){}if(!Array.isArray(a))a=[];return a.filter(c=>c&&String(c.id||'').trim()&&String(c.url||'').trim()).map(c=>({id:String(c.id).trim(),url:String(c.url).trim(),title:String(c.title||c.url).trim(),enabled:c.enabled?1:0}));}
const S4_ACTS=new Set(['my_panels','recent_panels','recent_panel_info','panel_settings','set_panel_setting','rename_panel','panel_health','toggle_panel','panel_access','delete_panel','panel_password','service_users','service_user_info','service_user_toggle','service_user_delete']);
async function pvRow(env,chat,id){const r=await env.BOT_DB.prepare('SELECT * FROM vex_panels WHERE id=?').bind(Number(id)||0).first();if(!r)return null;if(!isOwnerChat(env,chat)&&String(r.chat_id)!==String(chat))return null;return r;}
async function pvCtx(env,row){const a=await env.BOT_DB.prepare('SELECT * FROM cf_accts WHERE id=?').bind(Number(row.account_db_id)||0).first();if(!a)return null;const tok=await acctDec(env,a.token_enc);return {tok,acc:String(a.account_id),d1:String(row.d1_id||'')};}
async function d1Q(ctx,sql,params){const body={sql};if(params&&params.length)body.params=params;const r=await cfx(ctx.tok,'POST','/accounts/'+ctx.acc+'/d1/database/'+ctx.d1+'/query',body);const res=(r.result&&r.result[0]&&r.result[0].results)||[];return {ok:!!r.success,rows:Array.isArray(res)?res:[],error:cfxErr(r)};}
function fmtDate(sec){try{return new Date(Number(sec)*1000).toISOString().slice(0,16).replace('T',' ');}catch(e){return '-';}}
async function pvView(env,r){let u=null;try{u=await env.BOT_DB.prepare('SELECT username,first_name,banned FROM users WHERE chat_id=?').bind(String(r.chat_id)).first();}catch(e){}return {id:Number(r.id),name:String(r.name||''),location:/workers\.dev/i.test(String(r.url||''))?'worker':'pages',active:!!Number(r.active),created:Number(r.created)||0,created_text:new Date(Number(r.created)||0).toISOString().slice(0,16).replace('T',' '),domain:String(r.url||''),account_id:'',d1_id:String(r.d1_id||''),owner_chat:String(r.chat_id||''),owner_username:String((u&&u.username)||''),owner_name:String((u&&u.first_name)||''),owner_banned:Number((u&&u.banned)||0)};}
async function panelMgmt(env,chat,p){
  const owner=isOwnerChat(env,chat);
  if(p.action==='my_panels'){const rs=await env.BOT_DB.prepare('SELECT id,name,active,url,created FROM vex_panels WHERE chat_id=? ORDER BY id DESC').bind(chat).all();return {ok:true,current:String(env.BOT_VERSION||''),panels:((rs&&rs.results)||[]).map(r=>({id:Number(r.id),name:String(r.name||''),active:!!Number(r.active),domain:String(r.url||''),created:Number(r.created)||0}))};}
  if(!owner&&(p.action==='recent_panels'||p.action==='recent_panel_info'||p.action==='panel_access'))return {ok:false,error:'Owner only'};
  if(p.action==='recent_panels'){const mins=Math.max(5,Math.min(1440,Number(p.minutes)||60));const rs=await env.BOT_DB.prepare('SELECT * FROM vex_panels WHERE created>=? ORDER BY id DESC LIMIT 100').bind(Date.now()-mins*60000).all();const rows=[];for(const r of ((rs&&rs.results)||[]))rows.push(await pvView(env,r));return {ok:true,minutes:mins,panels:rows};}
  if(p.action==='recent_panel_info'){const r=await env.BOT_DB.prepare('SELECT * FROM vex_panels WHERE id=?').bind(Number(p.id)||0).first();if(!r)return {ok:false,error:'پنل پیدا نشد.'};return {ok:true,panel:await pvView(env,r)};}
  if(p.action==='panel_password')return {ok:false,error:'نمایش رمز برای پنل‌های ساخته‌شده از ربات هنوز پیاده‌سازی نشده است.'};
  if(p.action==='panel_access'){
    const r=await env.BOT_DB.prepare('SELECT * FROM vex_panels WHERE id=?').bind(Number(p.id)||0).first();if(!r)return {ok:false,error:'پنل پیدا نشد.'};
    const on=(p.on===true||String(p.on)==='1')?1:0;
    const ctx=await pvCtx(env,r);
    if(ctx){const x=await d1Q(ctx,'REPLACE INTO settings(k,v) VALUES(?,?)',['global_panel_enabled',String(on)]);if(!x.ok)return {ok:false,error:'تغییر وضعیت روی Cloudflare ناموفق بود.'};}
    await env.BOT_DB.prepare('UPDATE vex_panels SET active=? WHERE id=?').bind(on,Number(r.id)).run();
    return {ok:true,on:!!on,text:on?'دسترسی پنل باز شد ✅':'دسترسی پنل قطع شد 🔒'};
  }
  const row=await pvRow(env,chat,p.id);
  if(!row)return {ok:false,error:'پنل پیدا نشد.'};
  if(p.action==='rename_panel'){const name=String(p.name||'').trim().slice(0,60);if(!name)return {ok:false,error:'نام خالی است.'};await env.BOT_DB.prepare('UPDATE vex_panels SET name=? WHERE id=?').bind(name,Number(row.id)).run();return {ok:true};}
  if(p.action==='delete_panel'){
    const ctx=await pvCtx(env,row);
    if(ctx){
      const isWk=/workers\.dev/i.test(String(row.url||''));
      const pg=isWk?await cfx(ctx.tok,'DELETE','/accounts/'+ctx.acc+'/workers/scripts/'+encodeURIComponent(String(row.pages_project||''))):await cfx(ctx.tok,'DELETE','/accounts/'+ctx.acc+'/pages/projects/'+row.pages_project);
      if(!pg.success&&!/not.?found|does not exist|not exist/i.test(cfxErr(pg)))return {ok:false,error:(isWk?'حذف Worker':'حذف پروژه‌ی Pages')+' ناموفق بود؛ اطلاعات پنل نگه داشته شد. دوباره تلاش کن.'};
      if(row.d1_id){const dd=await cfx(ctx.tok,'DELETE','/accounts/'+ctx.acc+'/d1/database/'+row.d1_id);if(!dd.success&&!/not.?found|does not exist|not exist/i.test(cfxErr(dd)))return {ok:false,error:'حذف دیتابیس D1 ناموفق بود؛ اطلاعات پنل نگه داشته شد. دوباره تلاش کن.'};}
    }
    await env.BOT_DB.prepare('DELETE FROM vex_panels WHERE id=?').bind(Number(row.id)).run();
    return {ok:true,text:'پنل با موفقیت حذف شد ✅'};
  }
  const ctx=await pvCtx(env,row);
  if(!ctx)return {ok:false,error:'حساب Cloudflare این پنل پیدا نشد.'};
  if(p.action==='panel_settings'){
    const q=await d1Q(ctx,"SELECT k,v FROM settings WHERE k IN ('global_panel_enabled','global_servers_enabled','block_ads','max_conn')");
    const st={global_panel_enabled:'1',global_servers_enabled:'1',block_ads:'0',max_conn:'0'};
    for(const x of q.rows)st[String(x.k)]=String(x.v);
    const c=await d1Q(ctx,'SELECT COUNT(*) AS c FROM users');
    return {ok:true,settings:{panel:st.global_panel_enabled==='1',servers:st.global_servers_enabled==='1',ads:st.block_ads==='1',max_conn:Number(st.max_conn)||0,users:Number((c.rows[0]&&c.rows[0].c)||0)}};
  }
  if(p.action==='set_panel_setting'){
    const key=String(p.key||''),val=String(p.value==null?'':p.value);
    if(!['panel','servers','ads','maxconn'].includes(key))return {ok:false,error:'تنظیم نامعتبر.'};
    let x;
    if(key==='panel'){const v=val==='1'?'1':'0';x=await d1Q(ctx,'REPLACE INTO settings(k,v) VALUES(?,?)',['global_panel_enabled',v]);if(x.ok)await env.BOT_DB.prepare('UPDATE vex_panels SET active=? WHERE id=?').bind(v==='1'?1:0,Number(row.id)).run();}
    else if(key==='servers'){x=await d1Q(ctx,'REPLACE INTO settings(k,v) VALUES(?,?)',['global_servers_enabled',val==='1'?'1':'0']);}
    else if(key==='ads'){x=await d1Q(ctx,'REPLACE INTO settings(k,v) VALUES(?,?)',['block_ads',val==='1'?'1':'0']);}
    else{const mc=Math.max(0,Math.min(100,parseInt(val,10)||0));x=await d1Q(ctx,'REPLACE INTO settings(k,v) VALUES(?,?)',['max_conn',String(mc)]);}
    return x.ok?{ok:true}:{ok:false,error:'تغییر روی Cloudflare ناموفق بود: '+x.error};
  }
  if(p.action==='panel_health'){
    const c=await d1Q(ctx,'SELECT COUNT(*) AS c FROM users');
    return {ok:true,worker:String(row.url||''),d1:c.ok,active:!!Number(row.active),users:Number((c.rows[0]&&c.rows[0].c)||0)};
  }
  if(p.action==='toggle_panel'){
    const active=!Number(row.active)?1:0;
    await env.BOT_DB.prepare('UPDATE vex_panels SET active=? WHERE id=?').bind(active,Number(row.id)).run();
    await d1Q(ctx,'REPLACE INTO settings(k,v) VALUES(?,?)',['global_panel_enabled',String(active)]);
    return {ok:true,text:active?'پنل روشن شد 🟢':'پنل خاموش شد 🔴'};
  }
  if(p.action==='service_users'){const r=await d1Q(ctx,'SELECT id,name,uuid,token,limit_bytes,used,expire,active,created,last,cfgs FROM users ORDER BY id DESC LIMIT 100');return r.ok?{ok:true,users:r.rows}:{ok:false,error:r.error};}
  const uid=Number(p.user_id)||0;
  const ur=await d1Q(ctx,'SELECT * FROM users WHERE id=?',[uid]);
  const u=ur.rows[0];
  if(!u)return {ok:false,error:'کاربر پنل پیدا نشد.'};
  if(p.action==='service_user_info'){
    let cfgs=[];try{cfgs=JSON.parse(String(u.cfgs||'[]'));}catch(e){}if(!Array.isArray(cfgs))cfgs=[];
    const sub='https://'+String(row.pages_project)+'.pages.dev/sub/'+encodeURIComponent(String(u.token||''));
    return {ok:true,user:{id:Number(u.id),name:String(u.name||''),active:Number(u.active),used_text:(Number(u.used)/1073741824).toFixed(2)+' GB',expire_text:Number(u.expire)?fmtDate(u.expire):'بدون انقضا',cfgs,sub}};
  }
  if(p.action==='service_user_toggle'){const active=p.active?1:0;const x=await d1Q(ctx,'UPDATE users SET active=? WHERE id=?',[active,uid]);return x.ok?{ok:true,text:active?'سرویس روشن شد 🟢':'سرویس خاموش شد 🔴'}:{ok:false,error:x.error};}
  if(p.action==='service_user_delete'){const x=await d1Q(ctx,'DELETE FROM users WHERE id=?',[uid]);return x.ok?{ok:true,text:'سرویس حذف شد 🗑️'}:{ok:false,error:x.error};}
  return {ok:false,error:'عملیات نامعتبر'};
}
async function localApi(env,p){
  try{
    await dbInit(env);
    const chat=String(p.chat_id||'');
    if(p.action==='add_token')return await localAddToken(env,chat,p.token,p.account_id);
    if(p.action==='accounts'){const rs=await env.BOT_DB.prepare('SELECT id,label,account_name,status FROM cf_accts WHERE chat_id=? ORDER BY id DESC').bind(chat).all();const rows=(rs&&rs.results)||[];return {ok:true,accounts:rows.map(r=>({id:Number(r.id),label:String(r.label||r.account_name||''),account_name:String(r.account_name||''),status:String(r.status||'')}))};}
    if(p.action==='account_info'){const r=await env.BOT_DB.prepare('SELECT id,label,account_name,account_id,status,err,created FROM cf_accts WHERE id=? AND chat_id=?').bind(Number(p.id)||0,chat).first();if(!r)return {ok:false,error:'حساب پیدا نشد.'};return {ok:true,account:{id:Number(r.id),label:String(r.label||''),account_name:String(r.account_name||''),account_id:String(r.account_id||''),subdomain:'',status:String(r.status||''),err:String(r.err||''),created:Number(r.created)||0,panels_count:0}};}
    if(p.action==='delete_account'||p.action==='delete_accounts'){
      let ids=p.action==='delete_account'?[Number(p.id)||0]:(Array.isArray(p.ids)?p.ids.map(x=>Number(x)||0):[]);
      ids=[...new Set(ids.filter(x=>x>0))].slice(0,50);
      if(!ids.length)return {ok:false,error:'هیچ حسابی انتخاب نشده.'};
      let deleted=0;
      for(const id of ids){const r=await env.BOT_DB.prepare('DELETE FROM cf_accts WHERE id=? AND chat_id=?').bind(id,chat).run();deleted+=Number((r&&r.meta&&r.meta.changes)||0);}
      return {ok:true,deleted,skipped_count:ids.length-deleted,skipped:[]};
    }
    if(p.action==='new_panel')return await localNewPanel(env,chat,p);
    if(p.action==='panels'){const rs=await env.BOT_DB.prepare('SELECT id,name,active,url FROM vex_panels WHERE chat_id=? ORDER BY id DESC').bind(chat).all();return {ok:true,panels:((rs&&rs.results)||[]).map(r=>({id:Number(r.id),name:String(r.name||''),active:!!Number(r.active),worker:'',domain:String(r.url||'')}))};}
    if(p.action==='ps_list'){const rs=await env.BOT_DB.prepare('SELECT id,name,created FROM panel_sources ORDER BY id ASC').all();const custom=((rs&&rs.results)||[]).map(r=>({id:Number(r.id),name:String(r.name||''),created:Number(r.created)||0}));return {ok:true,sources:[{id:0,name:'Vex Panel'}].concat(custom)};}
    if(p.action==='welcome_get')return {ok:true,text:await kvGet(env,'teacher_welcome','')};
    if(p.action==='welcome_set'){if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات'};await kvSet(env,'teacher_welcome',String(p.text||'').trim().slice(0,2000));return {ok:true};}
    if(p.action==='support')return {ok:true,text:'برای پشتیبانی از لینک پشتیبانی داخل پنل DEMON استفاده کن.'};
    if(p.action==='bot_cfg_get'){let menu=[];try{menu=JSON.parse(await kvGet(env,'teacher_menu',''));}catch(e){}if(!Array.isArray(menu)||!menu.length)menu=MENU_DEFAULT;return {ok:true,menu,support_url:await kvGet(env,'teacher_support_url',''),ai_on:(await kvGet(env,'tbot_ai_on','0'))==='1',ai_prompt:await kvGet(env,'tbot_ai_prompt','')};}
    if(p.action==='bot_cfg_set'){
      if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات'};
      if(Object.prototype.hasOwnProperty.call(p,'support_url')){
        let s=String(p.support_url||'').trim();
        if(s!==''){const m1=s.match(/^@([A-Za-z0-9_]{5,64})$/),m2=s.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,64})\/?$/i);if(m1)s='https://t.me/'+m1[1];else if(m2)s='https://t.me/'+m2[1];else return {ok:false,error:'آیدی یا لینک پشتیبانی معتبر نیست (مثلاً @support یا https://t.me/support)'};}
        await kvSet(env,'teacher_support_url',s);
      }
      if(Object.prototype.hasOwnProperty.call(p,'ai_on'))await kvSet(env,'tbot_ai_on',p.ai_on?'1':'0');
      if(Object.prototype.hasOwnProperty.call(p,'ai_prompt'))await kvSet(env,'tbot_ai_prompt',String(p.ai_prompt||'').trim().slice(0,1000));
      if(Array.isArray(p.menu)){
        const seen=new Set();const clean=[];
        for(const it of p.menu){if(!it||typeof it!=='object')continue;const k=String(it.k||'');if(!MENU_ALLOWED.includes(k)||seen.has(k))continue;seen.add(k);let t=String(it.text||'').trim().slice(0,40);if(!t)t=k;let sty=String(it.style||'');if(!['','primary','success','danger'].includes(sty))sty='';clean.push({k,text:t,style:sty,on:it.on?1:0});}
        if(!clean.length)return {ok:false,error:'منو خالی است'};
        await kvSet(env,'teacher_menu',JSON.stringify(clean));
      }
      return {ok:true};
    }
    if(p.action==='force_channels'){let rows=await fcList(env);if(!isOwnerChat(env,chat))rows=rows.filter(x=>x.enabled);return {ok:true,channels:rows,count:rows.length};}
    if(p.action==='force_channel_add'||p.action==='force_channel_toggle'||p.action==='force_channel_delete'){
      if(!isOwnerChat(env,chat))return {ok:false,error:'Owner only'};
      const rows=await fcList(env);
      if(p.action==='force_channel_add'){
        const c=p.channel||{};const id=String(c.id||'').trim();const url=String(c.url||'').trim();const title=String(c.title||'').trim()||url;
        if(!/^-?\d{5,20}$/.test(id)||!/^https:\/\/t\.me\/\S+$/i.test(url))return {ok:false,error:'Chat ID یا لینک کانال نامعتبر است.'};
        if(rows.some(r=>r.id===id))return {ok:false,error:'این کانال قبلاً اضافه شده.'};
        rows.push({id,url,title,enabled:1});
      }else{
        const idx=Number(p.index);
        if(!Number.isInteger(idx)||idx<0||idx>=rows.length)return {ok:false,error:'کانال پیدا نشد.'};
        if(p.action==='force_channel_toggle')rows[idx].enabled=rows[idx].enabled?0:1;else rows.splice(idx,1);
      }
      await kvSet(env,'tg_force_channels',JSON.stringify(rows));
      return {ok:true,channels:rows};
    }
    if(p.action==='tut_get')return {ok:true,file_id:await kvGet(env,'tut_video_file_id',''),url:await kvGet(env,'tut_video_url',''),caption:await kvGet(env,'tut_video_caption','')};
    if(p.action==='tut_set'){
      if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات می‌تواند ویدئو آپلود کند'};
      const fid=String(p.file_id||'').trim();const url=String(p.url||'').trim();
      if(url){if(!/^https?:\/\/\S{5,1000}$/i.test(url))return {ok:false,error:'لینک معتبر نیست (باید با http:// یا https:// شروع شود)'};await kvSet(env,'tut_video_url',url);await kvSet(env,'tut_video_file_id','');}
      else if(fid){await kvSet(env,'tut_video_file_id',fid);await kvSet(env,'tut_video_url','');}
      else return {ok:false,error:'فایل یا لینک ویدئو لازم است'};
      await kvSet(env,'tut_video_caption',String(p.caption||'').slice(0,500));
      return {ok:true};
    }
    if(p.action==='tut_clear'){if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات'};await kvSet(env,'tut_video_file_id','');await kvSet(env,'tut_video_url','');await kvSet(env,'tut_video_caption','');return {ok:true};}
    if(p.action==='ps_add'){
      if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات'};
      const name=String(p.name||'').trim().slice(0,40);if(!name)return {ok:false,error:'نام پنل خالی است.'};
      const repo=String(p.repo_url||'').trim();
      const rr=await psResolve(repo);if(rr.err)return {ok:false,error:rr.err};
      const body=await psFetchFile(rr.file);if(!body)return {ok:false,error:'فایل از مخزن دریافت نشد.'};
      const hash=await sha256Hex(body);
      const ins=await env.BOT_DB.prepare('INSERT INTO panel_sources(name,repo_url,file_url,sha256,created) VALUES(?,?,?,?,?)').bind(name,repo,rr.file,hash,Date.now()).run();
      return {ok:true,id:Number(ins&&ins.meta&&ins.meta.last_row_id)||0,name,sha256:hash.slice(0,16),size:new TextEncoder().encode(body).length};
    }
    if(p.action==='ps_del'){
      if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات'};
      const pid=Number(p.id)||0;if(pid<=0)return {ok:false,error:'منبع معتبر نیست (منبع پیش‌فرض قابل حذف نیست).'};
      await env.BOT_DB.prepare('DELETE FROM panel_sources WHERE id=?').bind(pid).run();
      return {ok:true};
    }
    if(p.action==='ps_refresh'){
      if(!isOwnerChat(env,chat))return {ok:false,error:'فقط مالک ربات'};
      const row=await env.BOT_DB.prepare('SELECT id,repo_url FROM panel_sources WHERE id=?').bind(Number(p.id)||0).first();
      if(!row)return {ok:false,error:'منبع پیدا نشد.'};
      const rr=await psResolve(String(row.repo_url));if(rr.err)return {ok:false,error:rr.err};
      const body=await psFetchFile(rr.file);if(!body)return {ok:false,error:'فایل از مخزن دریافت نشد.'};
      const hash=await sha256Hex(body);
      await env.BOT_DB.prepare('UPDATE panel_sources SET file_url=?,sha256=? WHERE id=?').bind(rr.file,hash,Number(row.id)).run();
      return {ok:true,sha256:hash.slice(0,16),size:new TextEncoder().encode(body).length};
    }
    if(p.action==='main_update'){if(String(env.BOT_OWNER_ID||'')!==chat)return {ok:false,error:'فقط مالک ربات می‌تواند پنل اصلی را آپدیت کند.'};return await psMainUpdate(env,String(p.repo_url||''));}
    if(S4_ACTS.has(p.action))return await panelMgmt(env,chat,p);
    return {ok:false,error:'عملیات نامعتبر'};
  }catch(e){return {ok:false,error:'خطای ذخیره‌سازی حساب: '+String(e&&e.message||e).slice(0,160)};}
}
async function api(env,p){if(LOCAL_ACTS.has(p&&p.action))return localApi(env,p);const r=await fetch(String(env.PANEL_API),{method:'POST',headers:{'content-type':'application/json','x-demon-bot-secret':String(env.PANEL_API_SECRET||'')},body:JSON.stringify(p)});const t=await r.text();try{return JSON.parse(t)}catch(e){const hint=r.status===404?' — این صفحه 404 از هاست است نه از کد PHP؛ آدرس PANEL_API را بررسی کن یا فایروال هاست را برای POST به index.php?tg_api=1 باز کن.':'';return {ok:false,error:'پاسخ سرور نامعتبر ('+r.status+')'+hint+': '+t.replace(/\s+/g,' ').slice(0,180)}}}
const SUPPORT_URL='https://t.me/pahlavi18_19day';
let RT_CFG=null;
const DEFAULT_MENU=[{k:'build',text:'🚀 ساخت پنل',style:'success',on:1},{k:'panels',text:'📦 پنل‌های من',style:'primary',on:1},{k:'accounts',text:'☁️ حساب‌های Cloudflare',style:'primary',on:1},{k:'addcf',text:'➕ افزودن Cloudflare',style:'success',on:1},{k:'tempmail',text:'📧 ایمیل موقت',style:'success',on:1},{k:'ub_menu',text:'🤖 مدیریت ربات',style:'success',on:1},{k:'sub',text:'🎟 دریافت کد اشتراک',style:'success',on:1},{k:'apk',text:'📱 اپ اختصاصی',style:'success',on:1},{k:'support',text:'💬 ارتباط با پشتیبانی',style:'primary',on:1}];
const MCFG_LABEL={build:'ساخت پنل',panels:'پنل‌های من',accounts:'حساب‌های Cloudflare',addcf:'افزودن Cloudflare',tempmail:'ایمیل موقت',ub_menu:'مدیریت ربات',sub:'دریافت کد اشتراک',apk:'اپ اختصاصی',support:'ارتباط با پشتیبانی'};
function menuItems(){const m=(RT_CFG&&Array.isArray(RT_CFG.menu)&&RT_CFG.menu.length)?RT_CFG.menu:DEFAULT_MENU;if(!m.some(x=>x&&x.k==='sub')){const it={k:'sub',text:'🎟 دریافت کد اشتراک',style:'success',on:1};const ai=m.findIndex(x=>x&&x.k==='apk');if(ai>=0)m.splice(ai,0,it);else{const si=m.findIndex(x=>x&&x.k==='support');if(si>=0)m.splice(si,0,it);else m.push(it)}}if(!m.some(x=>x&&x.k==='apk')){const it={k:'apk',text:'📱 اپ اختصاصی',style:'success',on:1};const si=m.findIndex(x=>x&&x.k==='support');if(si>=0)m.splice(si,0,it);else m.push(it)}return m.filter(x=>x&&x.on)}
// ---------------- اشتراک Vex: کد ۱۶ رقمیِ ۱۰ روزه از دروازه‌ی demonvpn.shop ----------------
const VEX_GATE='https://demonvpn.shop';
async function vexSub(env,action,payload){
  let key=String(env.VEX_ADMIN_KEY||'');
  if(!key){try{key=await kvGetBot(env,'vex_admin_key','')}catch(e){}}
  if(!key)return {ok:false,error:'کلید مدیریت Vex تنظیم نشده است؛ از پشتیبانی بخواه آن را روی ربات تنظیم کند.'};
  try{
    const r=await fetch(VEX_GATE+'/admin/sub/'+action,{method:'POST',headers:{'content-type':'application/json','x-admin-key':key},body:JSON.stringify(payload||{}),signal:AbortSignal.timeout(12000)});
    const j=await r.json().catch(()=>null);
    if(!j)return {ok:false,error:'پاسخ نامعتبر از سرور Vex (HTTP '+r.status+')'};
    return j;
  }catch(e){return {ok:false,error:'اتصال به سرور Vex برقرار نشد؛ کمی بعد دوباره امتحان کن.'}}
}
function faDate(ms){try{return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms))}catch(e){try{return new Date(ms).toISOString().slice(0,10)}catch(e2){return '-'}}}
function codeFmt(c){return String(c||'').replace(/(\d{4})(?=\d)/g,'$1-')}
function subLeftTxt(expires){const d=Math.max(0,Math.round((Number(expires||0)-Date.now())/86400000));return d>=1?('حدود '+d+' روز دیگر'):'کمتر از یک روز دیگر'}
async function sendSub(chat,env,msgId){
  const out=(t,k)=>msgId?edit(chat,msgId,t,env,k):send(chat,t,env,k);
  if(msgId)try{await edit(chat,msgId,'<b>🎟 دریافت کد اشتراک</b>\n\n'+quote('در حال دریافت کد اشتراک شما…'),env,KB([[B('⏳ صبر کن…','noop','','primary')]]))}catch(e){}
  const r=await vexSub(env,'create',{chat_id:String(chat),days:10});
  if(!r.ok)return out('<b>❌ ساخت کد اشتراک انجام نشد</b>\n\n'+quote(r.error||'خطای نامشخص'),KB([[B('🔁 تلاش دوباره','sub','','success')],[B('⬅️ منوی اصلی','menu','','primary')]]));
  const txt='<b>🎟 کد اشتراک شما</b>\n\n'+
    'کد: <code>'+codeFmt(r.code)+'</code>\n'+
    'اعتبار: <b>۱۰ روز</b> — تاریخ انقضا: <b>'+faDate(r.expires)+'</b> ('+subLeftTxt(r.expires)+')\n'+
    'دستگاه‌های فعال با این کد: <b>'+Number(r.sessions||0)+'</b>\n\n'+
    quote('این کد را در اولین ورود به اپلیکیشن Vex وارد کن. هر دستگاهی که با این کد فعال شود، تا پایان اعتبار می‌تواند از برنامه استفاده کند.\n\nاگر خواستی همه‌ی دستگاه‌ها را بیرون بیندازی، دکمه‌ی «حذف تمام نشست‌ها» را بزن.');
  return out(txt,KB([[B('🗑 حذف تمام نشست‌ها','subkick','','danger')],[B('🔄 بروزرسانی','sub','','success')],[B('⬅️ منوی اصلی','menu','','primary')]]));
}
async function subKick(chat,env,msgId){
  const out=(t,k)=>msgId?edit(chat,msgId,t,env,k):send(chat,t,env,k);
  if(msgId)try{await edit(chat,msgId,'<b>🗑 حذف تمام نشست‌ها</b>\n\n'+quote('در حال حذف نشست‌های کد شما…'),env,KB([[B('⏳ صبر کن…','noop','','primary')]]))}catch(e){}
  const info=await vexSub(env,'info',{chat_id:String(chat)});
  if(!info.ok)return out('<b>❌ کد اشتراکی برای شما پیدا نشد</b>\n\n'+quote('اول از «دریافت کد اشتراک» یک کد بگیر، بعد نشست‌هایش را حذف کن.'),KB([[B('🎟 دریافت کد اشتراک','sub','','success')],[B('⬅️ منوی اصلی','menu','','primary')]]));
  const k=await vexSub(env,'kick',{code:info.code});
  if(!k.ok)return out('<b>❌ حذف نشست‌ها انجام نشد</b>\n\n'+quote(k.error||'خطای نامشخص'),KB([[B('🔁 تلاش دوباره','subkick','','danger')],[B('⬅️ منوی اصلی','menu','','primary')]]));
  const n=Number(k.removed||0);
  const txt='<b>🗑 حذف تمام نشست‌ها</b>\n\n'+
    (n>0
      ?'<b>✅ '+n+' نشست حذف شد.</b>\n\n'+quote('همه‌ی دستگاه‌هایی که با کد تو فعال شده بودند بیرون انداخته شدند؛ در باز کردن بعدی برنامه از آن‌ها دوباره کد اشتراک خواسته می‌شود.')
      :quote('هیچ نشست فعالی روی کد تو نبود؛ چیزی حذف نشد.'))+'\n\n'+
    'کد: <code>'+codeFmt(info.code)+'</code>\n'+
    'دستگاه‌های فعال: <b>0</b>\n'+
    'تاریخ انقضا: <b>'+faDate(info.expires)+'</b> ('+subLeftTxt(info.expires)+')';
  return out(txt,KB([[B('🎟 نمایش کد اشتراک','sub','','success')],[B('⬅️ منوی اصلی','menu','','primary')]]));
}
const APK_URL='https://demonvpn.shop/apk';
async function sendApk(chat,env,msgId){
  const cap='<b>📱 اپ اختصاصی Vex</b>\n\n'+quote('فایل نصبی (APK) اپلیکیشن اختصاصی در همین پیام پیوست شده؛ حجم حدود ۴۶ مگابایت است. روی فایل بزن و بعد از دانلود، نصبش کن.');
  const kb=KB([[B('🌐 لینک مستقیم دانلود',null,APK_URL,'primary')],[B('⬅️ منوی اصلی','menu','','primary')]]);
  if(msgId)try{await edit(chat,msgId,'<b>📱 اپ اختصاصی Vex</b>\n\n'+quote('در حال آماده‌سازی فایل نصبی… چند لحظه صبر کن.'),env,KB([[B('⏳ در حال ارسال…','noop','','primary')]]))}catch(e){}
  try{
    const fid=await kvGetBot(env,'apk_file_id','');
    if(fid){const r=await tg('sendDocument',{chat_id:chat,document:fid,caption:cap,parse_mode:'HTML',reply_markup:kb},env);if(r&&r.ok)return r;}
    const res=await fetch(APK_URL,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; VexBot/1.0)'}});
    if(res.ok){
      const buf=await res.arrayBuffer();
      if(buf.byteLength>0&&buf.byteLength<50*1024*1024){
        const fd=new FormData();
        fd.append('chat_id',String(chat));
        fd.append('caption',cap);
        fd.append('parse_mode','HTML');
        fd.append('reply_markup',JSON.stringify({inline_keyboard:[[{text:'🌐 لینک مستقیم دانلود',url:APK_URL}],[{text:'⬅️ منوی اصلی',callback_data:'menu'}]]}));
        fd.append('document',new Blob([buf],{type:'application/vnd.android.package-archive'}),'Vex-Client.apk');
        const up=await fetch('https://api.telegram.org/bot'+env.BOT_TOKEN+'/sendDocument',{method:'POST',body:fd});
        const j=await up.json().catch(()=>null);
        if(j&&j.ok){
          const nf=(j.result&&j.result.document&&j.result.document.file_id)||'';
          if(nf)try{await kvSetBot(env,'apk_file_id',nf)}catch(e){}
          return j;
        }
      }
    }
  }catch(e){console.log('apk send error',String((e&&e.message)||e))}
  return send(chat,'<b>📱 اپ اختصاصی Vex</b>\n\n'+quote('ارسال مستقیم فایل در این لحظه ممکن نشد؛ با دکمه‌ی زیر می‌توانی مستقیم دانلودش کنی.'),env,kb);
}
function cfgSupport(){return (RT_CFG&&RT_CFG.support_url)||SUPPORT_URL}
async function loadBotCfg(env,u){const cq=u.callback_query;const m=u.message||u.edited_message||(cq&&cq.message);const cid=String((cq&&cq.from&&cq.from.id)||(m&&m.chat&&m.chat.id)||'');if(!cid)return null;const r=await api(env,{action:'bot_cfg_get',chat_id:cid}).catch(()=>null);return r&&r.ok?r:null}
async function mcfgLoad(env,chat){const r=await api(env,{action:'bot_cfg_get',chat_id:chat}).catch(()=>null);return (r&&r.ok&&Array.isArray(r.menu)&&r.menu.length)?r.menu.map(x=>({...x})):DEFAULT_MENU.map(x=>({...x}))}
async function mcfgSave(env,chat,menu){return api(env,{action:'bot_cfg_set',chat_id:chat,menu:menu})}
async function mcfgScreen(chat,env,msgId){const menu=await mcfgLoad(env,chat);const rows=menu.map(it=>[B((it.on?'':'🚫 ')+it.text+'  ·  '+(MCFG_LABEL[it.k]||it.k),'mcfgi:'+it.k,'',it.style||null)]);rows.push([B('⬅️ ادمین','admin','','primary')]);return edit(chat,msgId,'<b>🎛 منوی اصلی و رنگ دکمه‌ها</b>\n\n'+quote('یک دکمه را انتخاب کن تا متن، رنگ، ترتیب یا نمایش آن را تغییر بدهی.'),env,KB(rows))}
async function mcfgItem(chat,env,msgId,k){const menu=await mcfgLoad(env,chat);const it=menu.find(x=>x.k===k);if(!it)return mcfgScreen(chat,env,msgId);const kb=KB([
  [B('✏️ تغییر متن','mcfgx:'+k,'','primary')],
  [B('🔵 آبی','mcfgc:'+k+':primary','','primary'),B('🟢 سبز','mcfgc:'+k+':success','','success'),B('🔴 قرمز','mcfgc:'+k+':danger','','danger'),B('⚪ پیش‌فرض','mcfgc:'+k+':none','','primary')],
  [B(it.on?'🚫 مخفی کن':'✅ نمایش بده','mcfgt:'+k,'',it.on?'danger':'success')],
  [B('⬆️ بالاتر','mcfgm:'+k+':-1','','primary'),B('⬇️ پایین‌تر','mcfgm:'+k+':1','','primary')],
  [B('⬅️ تنظیمات منو','mcfg','','primary')]]);
  return edit(chat,msgId,'<b>🎛 '+esc(MCFG_LABEL[k]||k)+'</b>\n\nمتن فعلی: <b>'+esc(it.text)+'</b>\nرنگ: '+esc(it.style||'پیش‌فرض')+'\nوضعیت: '+(it.on?'نمایش':'مخفی'),env,kb)}
async function mcfgOp(op,parts,chat,env,msgId){
  if(op==='mcfg')return mcfgScreen(chat,env,msgId);
  if(op==='supcfg'){const r=await api(env,{action:'bot_cfg_get',chat_id:chat}).catch(()=>null);await setState(env,chat,'await_support');return edit(chat,msgId,'<b>☎️ آیدی پشتیبانی</b>\n\nفعلی: <code>'+esc((r&&r.support_url)||SUPPORT_URL)+'</code>\n\nآیدی یا لینک جدید را بفرست، مثلاً <code>@support</code> یا <code>https://t.me/support</code>.\nبرای لغو /cancel را بفرست.',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}
  if(op==='pnsearch'){await setState(env,chat,'await_panel_search');return edit(chat,msgId,'<b>🔎 جستجوی پنل</b>\n\nآیدی عددی پنل، نام پنل یا ایمیل مالک را بفرست.\nبرای لغو /cancel را بفرست.',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}
  const k=String(parts[1]||'');
  if(op==='mcfgi')return mcfgItem(chat,env,msgId,k);
  if(op==='mcfgx'){await setState(env,chat,'await_menu_text',{k});return edit(chat,msgId,'<b>✏️ متن جدید دکمه «'+esc(MCFG_LABEL[k]||k)+'»</b>\n\nمتن جدید را بفرست (حداکثر ۴۰ کاراکتر، می‌توانی ایموجی هم بگذاری).\nبرای لغو /cancel را بفرست.',env,KB([[B('⬅️ برگشت','mcfgi:'+k,'','primary')]]))}
  const menu=await mcfgLoad(env,chat);const idx=menu.findIndex(x=>x.k===k);if(idx<0)return mcfgScreen(chat,env,msgId);
  if(op==='mcfgc'){const s=String(parts[2]||'');menu[idx].style=(s==='none'?'':s);await mcfgSave(env,chat,menu);return mcfgItem(chat,env,msgId,k)}
  if(op==='mcfgt'){menu[idx].on=menu[idx].on?0:1;await mcfgSave(env,chat,menu);return mcfgItem(chat,env,msgId,k)}
  if(op==='mcfgm'){const d=Number(parts[2]||0),j=idx+d;if(j>=0&&j<menu.length){const tmp=menu[idx];menu[idx]=menu[j];menu[j]=tmp;await mcfgSave(env,chat,menu);}return mcfgItem(chat,env,msgId,k)}
  return mcfgScreen(chat,env,msgId);
}
async function ownerCfgStep(st,chat,env,text){
  if(!st||!isOwner(chat,env))return false;
  if(st.step==='await_support'){
    await clearState(env,chat);
    const r=await api(env,{action:'bot_cfg_set',chat_id:chat,support_url:text});
    if(r&&r.ok)await send(chat,'<b>✅ پشتیبانی ذخیره شد</b>\n\n'+quote(text),env,KB([[B('👑 ادمین','admin','','primary')]]));
    else await send(chat,'<b>❌ ذخیره نشد</b>\n\n'+quote((r&&r.error)||'خطا'),env,KB([[B('☎️ دوباره','supcfg','','primary')],[B('👑 ادمین','admin','','primary')]]));
    return true;
  }
  if(st.step==='await_menu_text'){
    const k=String(st.data&&st.data.k||'');await clearState(env,chat);
    const menu=await mcfgLoad(env,chat);const it=menu.find(x=>x.k===k);
    if(it){it.text=text.slice(0,40)||it.text;await mcfgSave(env,chat,menu);}
    await send(chat,'<b>✅ متن دکمه ذخیره شد</b>',env,KB([[B('⬅️ برگشت به دکمه','mcfgi:'+k,'','primary')],[B('🎛 تنظیمات منو','mcfg','','primary')]]));
    return true;
  }
  if(st.step==='await_faq_import'){await clearState(env,chat);return faqReply(chat,env,text)}
  if(st.step==='await_ai_prompt'){await clearState(env,chat);const pr=text.trim()==='پیش‌فرض'?'':text.slice(0,1000);const r=await api(env,{action:'bot_cfg_set',chat_id:chat,ai_prompt:pr});await send(chat,r&&r.ok?'<b>✅ پرامپت ذخیره شد</b>':'<b>❌ ذخیره نشد</b>',env,KB([[B('🤖 هوش مصنوعی','aicfg','','primary')],[B('👑 ادمین','admin','','primary')]]));return true;}
  if(st.step==='await_panel_search'){
    await clearState(env,chat);
    const r=await api(env,{action:'panel_search',chat_id:chat,q:text});
    const list=(r&&r.ok&&Array.isArray(r.panels))?r.panels:[];
    const kb=list.map(p=>[B('#'+p.id+' · '+String(p.name||'-')+(Number(p.active)?'':' (بسته)'),'apm:'+p.id,'',Number(p.active)?'success':'danger')]);
    kb.push([B('🔎 جستجوی دوباره','pnsearch','','primary')],[B('👑 ادمین','admin','','primary')]);
    if(r&&r.ok)await send(chat,list.length?'<b>نتایج جستجو</b>':'<b>نتیجه‌ای پیدا نشد</b>',env,KB(kb));
    else await send(chat,'<b>❌ جستجو ناموفق</b>\n\n'+quote((r&&r.error)||'خطا'),env,KB(kb));
    return true;
  }
  return false;
}

function withSupport(text,kb){if(!/❌|⚠️/.test(String(text||'')))return kb;const row=[{text:'💬 ارتباط با پشتیبانی',url:cfgSupport()}];if(!kb||!Array.isArray(kb.inline_keyboard))return {inline_keyboard:[row]};if(kb.inline_keyboard.some(r=>r&&r.some(b=>b&&b.url===cfgSupport())))return kb;return {...kb,inline_keyboard:[...kb.inline_keyboard,row]}}
async function send(chat,text,env,kb){return tg('sendMessage',{chat_id:chat,text,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:withSupport(text,kb)},env)}
async function edit(chat,msg,text,env,kb){return tg('editMessageText',{chat_id:chat,message_id:msg,text,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:withSupport(text,kb)},env)}
async function answer(cq,env,text=''){try{await tg('answerCallbackQuery',{callback_query_id:cq.id,text,show_alert:false},env)}catch(e){}}
async function setState(env,chat,step,data={}){await env.BOT_DB.prepare('REPLACE INTO state(chat_id,step,data,updated) VALUES(?,?,?,?)').bind(String(chat),step,JSON.stringify(data),Date.now()).run()}
async function getState(env,chat){const r=await env.BOT_DB.prepare('SELECT step,data FROM state WHERE chat_id=?').bind(String(chat)).first();if(!r)return null;let data={};try{data=JSON.parse(r.data||'{}')}catch(e){}return {step:String(r.step||''),data}}
async function clearState(env,chat){await env.BOT_DB.prepare('DELETE FROM state WHERE chat_id=?').bind(String(chat)).run()}
function isOwner(chat,env){return String(chat)===String(env.BOT_OWNER_ID||'')}
async function botEnabled(env){const r=await env.BOT_DB.prepare('SELECT v FROM settings WHERE k=\'bot_enabled\'').first();return String(r?.v??'1')==='1'}
function quote(t){return '<blockquote>'+esc(t)+'</blockquote>'}
async function touch(env,m){const id=String(m.chat.id),now=Date.now(),old=await env.BOT_DB.prepare('SELECT chat_id FROM users WHERE chat_id=?').bind(id).first();await env.BOT_DB.prepare('INSERT INTO users(chat_id,username,first_name,created,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(chat_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_seen=excluded.last_seen').bind(id,String(m.from?.username||''),String(m.from?.first_name||''),now,now).run();if(!old&&String(env.BOT_OWNER_ID||'')&&id!==String(env.BOT_OWNER_ID)){await send(String(env.BOT_OWNER_ID),'<b>👤 کاربر جدید وارد ربات شد</b>\n\n'+quote('ID: '+id+'\nنام: '+(m.from?.first_name||'-')+'\nUsername: @'+(m.from?.username||'-')),env,KB([[B('👤 مدیریت کاربر','u:'+id,'','primary'),B('⛔ بن کاربر','ban:'+id,'','danger')]]));}}
async function tutGet(env){return api(env,{action:'tut_get'})}
async function tutSendTo(chat,env,withNone){
  const r=await tutGet(env);
  if(!r||!r.ok||(!r.file_id&&!r.url)){
    if(withNone)return send(chat,'<b>🎬 ویدئوی آموزشی</b>\n\n'+quote('فعلاً هیچ ویدئوی آموزشی آپلود نشده.'),env,KB([[B('⬅️ منو','menu','','primary')]]));
    return null;
  }
  if(r.file_id)return tg('sendVideo',{chat_id:chat,video:r.file_id,caption:r.caption||'🎬 ویدئوی آموزشی',parse_mode:'HTML'},env);
  return send(chat,'<b>🎬 ویدئوی آموزشی</b>\n\n'+quote(r.caption||'برای دیدن ویدئوی آموزشی روی دکمه بزن.'),env,KB([[B('▶️ دیدن ویدئوی آموزشی',null,r.url,'success')]]));
}
async function tutAdmin(chat,env,msgId){
  if(!isOwner(chat,env))return;
  const r=await tutGet(env);const has=!!(r&&r.ok&&(r.file_id||r.url));
  const t='<b>🎬 ویدئوی آموزشی</b>\n\n'+quote(has?'ویدئو آپلود شده و بعد از ساخت هر پنل برای کاربر ارسال می‌شود.':'فعلاً هیچ ویدئوی آموزشی آپلود نشده.');
  const rows=[[B('📤 آپلود / جایگزینی ویدئو','tutup','','success')]];
  if(has)rows.push([B('👁 پیش‌نمایش','tut','','primary'),B('🗑 حذف ویدئو','tutdel','','primary')]);
  rows.push([B('⬅️ منو','menu','','primary')]);
  return msgId?edit(chat,msgId,t,env,KB(rows)):send(chat,t,env,KB(rows));
}
async function tutAskUpload(chat,env,msgId){
  if(!isOwner(chat,env))return;
  await setState(env,chat,'await_tut_video',{});
  return edit(chat,msgId,'<b>📤 آپلود ویدئوی آموزشی</b>\n\n'+quote('یکی از این دو را بفرست:\n• فایل ویدئو (زیر ۲۰ مگابایت)\n• یا لینک ویدئو (مثلاً https://…)\nویدئوی قبلی جایگزین می‌شود.'),env,KB([[B('⬅️ لغو','tutadm','','primary')]]));
}
async function tutDelete(chat,env,msgId){
  if(!isOwner(chat,env))return;
  await api(env,{action:'tut_clear',chat_id:chat});
  return tutAdmin(chat,env,msgId);
}
function mainKB(chat,env){const rows=[];const btns=menuItems().map(it=>it.k==='support'?B(it.text,null,cfgSupport(),it.style||null):B(it.text,it.k,'',it.style||null));for(let i=0;i<btns.length;i+=2)rows.push(btns.slice(i,i+2));if(isOwner(chat,env))rows.push([B('📣 اطلاع‌رسانی نسخه','pvann','','primary'),B('🔄 آپدیت همه پنل‌ها','pvall','','success')],[B('👑 پنل ادمین','admin','','primary'),B('🌐 پنل مدیریت سایت',null,env.ADMIN_URL||'','primary')]);return KB(rows)}
async function mailApi(path,opts={},base='https://api.mail.tm'){
  const call=async()=>{const r=await fetch(base+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});const tx=await r.text();let j={};try{j=tx?JSON.parse(tx):{}}catch(e){}return {r,j}};
  let c=await call();
  if(c.r.status===429){const ra=Number(c.r.headers.get('retry-after'))||0;await sleep(Math.min(Math.max(ra,1.2),3)*1000);c=await call();}
  if(!c.r.ok)throw new Error(String(c.j['hydra:description']||c.j.message||c.j.detail||('Mail.tm HTTP '+c.r.status)).slice(0,220));
  if(Array.isArray(c.j))c.j={'hydra:member':c.j};
  return c.j;
}
async function guerrCreate(local){
  const s0=await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address&lang=en',{headers:{accept:'application/json'}}).then(r=>r.json()).catch(()=>null);
  if(!s0||!s0.sid_token)throw new Error('Guerrilla Mail پاسخ نداد.');
  const s=await fetch('https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user='+encodeURIComponent(local)+'&lang=en&sid_token='+encodeURIComponent(String(s0.sid_token)),{headers:{accept:'application/json'}}).then(r=>r.json()).catch(()=>null);
  if(!s||!s.sid_token||String(s.email_addr||'').split('@')[0]!==local)throw new Error('ساخت صندوق Guerrilla Mail ناموفق بود.');
  return {address:String(s.email_addr),sid:String(s.sid_token)};
}
async function guerrCall(env,row,params){
  const call=async sid=>{const q=new URLSearchParams(Object.assign({},params,{sid_token:String(sid)})).toString();return fetch('https://api.guerrillamail.com/ajax.php?'+q,{headers:{accept:'application/json'}}).then(r=>r.json()).catch(()=>({}))};
  const lp=String(row.address||'').split('@')[0];
  const repair=async()=>{
    const s0=await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address&lang=en',{headers:{accept:'application/json'}}).then(r=>r.json()).catch(()=>null);
    if(!s0||!s0.sid_token)return false;
    const s=await fetch('https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user='+encodeURIComponent(lp)+'&lang=en&sid_token='+encodeURIComponent(String(s0.sid_token)),{headers:{accept:'application/json'}}).then(r=>r.json()).catch(()=>null);
    if(s&&s.sid_token&&String(s.email_addr||'').split('@')[0]===lp){
      row.token=String(s.sid_token);
      try{await env.BOT_DB.prepare('UPDATE temp_emails SET token=? WHERE chat_id=?').bind(row.token,String(row.chat_id||'')).run()}catch(e){}
      return true;
    }
    return false;
  };
  if(params.f==='get_email_list'){
    let j=await call(row.token);
    const cur=String(j.email_addr||j.email||'').split('@')[0];
    if((!j.email_addr&&!j.email)||(cur&&lp&&cur!==lp)){if(await repair())j=await call(row.token);}
    return j;
  }
  const probe=await call(row.token);
  const pcur=String(probe.email_addr||probe.email||'').split('@')[0];
  if((!probe.email_addr&&!probe.email)||(pcur&&lp&&pcur!==lp)){if(!(await repair()))return probe;}
  return call(row.token);
}
async function tempMailMenu(chat,env,msgId=null){const row=await env.BOT_DB.prepare('SELECT address,created FROM temp_emails WHERE chat_id=?').bind(String(chat)).first();const rows=[];if(row){rows.push([B('📥 دریافت پیام‌ها از صندوق','tempmail_inbox','','success')],[B('🔄 ساخت مجدد ایمیل موقت','tempmail_recreate','','primary')],[B('🗑 حذف ایمیل','tempmail_delete','','danger')]);}else rows.push([B('✨ ساخت ایمیل موقت','tempmail_create','','success')]);rows.push([B('⬅️ منوی اصلی','menu','','primary')]);const txt='<b>📧 ایمیل موقت Vex</b>\n\n'+(row?('ایمیل فعلی شما:\n<code>'+esc(row.address)+'</code>\n\n'+quote('برای مشاهده پیام‌های دریافتی، دکمه «دریافت پیام‌ها از صندوق» را بزن. صندوق فقط به حساب تلگرام خودت متصل است.')+'\n\nایجاد شده: '+esc(new Date(Number(row.created)||Date.now()).toLocaleString('fa-IR'))):quote('یک آدرس ایمیل موقت بساز و پیام‌های دریافتی را همین‌جا ببین.'));return msgId?edit(chat,msgId,txt,env,KB(rows)):send(chat,txt,env,KB(rows))}
async function tempMailCreate(chat,env,msgId){const id=String(chat);const existing=await env.BOT_DB.prepare('SELECT address FROM temp_emails WHERE chat_id=?').bind(id).first();if(existing)return tempMailMenu(chat,env,msgId);const local='vex'+crypto.randomUUID().replace(/-/g,'').slice(0,14);const errs=[];
  const mailtm=async()=>{const domains=await mailApi('/domains?page=1');const ds=domains['hydra:member']||[];const domain=String(ds.find(x=>x.isActive!==false&&x.isPrivate!==true)?.domain||'');if(!domain)throw new Error('دامنه فعال Mail.tm یافت نشد.');const address=local+'@'+domain,password='Vx!'+crypto.randomUUID()+'a9';const acc=await mailApi('/accounts',{method:'POST',headers:{'content-type':'application/ld+json'},body:JSON.stringify({address,password})});const tokenRes=await mailApi('/token',{method:'POST',headers:{'content-type':'application/ld+json'},body:JSON.stringify({address,password})});if(!tokenRes.token)throw new Error('Mail.tm توکن صندوق را برنگرداند.');return {address,account_id:String(acc.id||''),token:String(tokenRes.token),provider:'mailtm'}};
  const guerr=async()=>{const g=await guerrCreate(local);return {address:g.address,account_id:'',token:g.sid,provider:'guerrilla'}};
  for(const t of [mailtm,guerr]){try{const info=await t();await env.BOT_DB.prepare('INSERT OR REPLACE INTO temp_emails(chat_id,address,account_id,token,password,created,provider) VALUES(?,?,?,?,?,?,?)').bind(id,info.address,info.account_id,info.token,'',Date.now(),info.provider).run();return tempMailMenu(chat,env,msgId)}catch(e){errs.push(String((e&&e.message)||e).slice(0,140))}}
  const msg='همه‌ی سرویس‌های ایمیل موقت (Mail.tm و Guerrilla Mail) در این لحظه محدود یا پاسخگو نیستند. چند لحظه بعد دوباره امتحان کن.\nجزئیات: '+errs.join(' | ');return msgId?edit(chat,msgId,'<b>❌ ساخت ایمیل انجام نشد</b>\n\n'+esc(msg.slice(0,350)),env,KB([[B('🔄 تلاش دوباره','tempmail_create','','success')],[B('⬅️ برگشت','tempmail','','primary')]])):send(chat,'<b>❌ ساخت ایمیل انجام نشد</b>\n\n'+esc(msg.slice(0,350)),env,KB([[B('🔄 تلاش دوباره','tempmail_create','','success')],[B('⬅️ برگشت','tempmail','','primary')]]))}
async function tempMailRecreate(chat,env,msgId){const row=await env.BOT_DB.prepare('SELECT account_id,token,provider FROM temp_emails WHERE chat_id=?').bind(String(chat)).first();if(row){try{if(row.account_id&&row.provider!=='guerrilla')await mailApi('/accounts/'+encodeURIComponent(row.account_id),{method:'DELETE',headers:{authorization:'Bearer '+row.token}})}catch(e){}await env.BOT_DB.prepare('DELETE FROM temp_emails WHERE chat_id=?').bind(String(chat)).run();}return tempMailCreate(chat,env,msgId)}
async function tempMailInbox(chat,env,msgId){const row=await env.BOT_DB.prepare('SELECT chat_id,address,token,provider FROM temp_emails WHERE chat_id=?').bind(String(chat)).first();if(!row)return tempMailMenu(chat,env,msgId);try{let msgs=[];
  if(row.provider==='guerrilla'){const j=await guerrCall(env,row,{f:'get_email_list',offset:'0'});msgs=(Array.isArray(j.list)?j.list:[]).map(m=>({id:String(m.mail_id),from:m.mail_from,subject:m.mail_subject,createdAt:m.mail_date}));}
  else{const data=await mailApi('/messages?page=1',{headers:{authorization:'Bearer '+row.token}});msgs=(data['hydra:member']||[]).map(m=>({id:String(m.id),from:m.from&&m.from.address,subject:m.subject,createdAt:m.createdAt}));}
  if(!msgs.length)return edit(chat,msgId,'<b>📥 صندوق ایمیل</b>\n\nایمیل: <code>'+esc(row.address)+'</code>\n\n'+quote('هنوز پیامی دریافت نشده. برای بررسی دوباره روی دکمه بزن.'),env,KB([[B('🔄 بررسی دوباره','tempmail_inbox','','success')],[B('⬅️ برگشت','tempmail','','primary')]]));let out='<b>📥 پیام‌های دریافتی</b>\nایمیل: <code>'+esc(row.address)+'</code>\n';for(const m of msgs.slice(0,8)){out+='\n────────────\n<b>فرستنده:</b> '+esc(m.from||'-')+'\n<b>موضوع:</b> '+esc(m.subject||'(بدون موضوع)')+'\n<b>زمان:</b> '+esc(m.createdAt||'')+'\n';}const rows=[];for(const m of msgs.slice(0,8))rows.push([B('📨 '+String(m.subject||'بدون موضوع').slice(0,28),'tempmail_read:'+m.id,'','primary')]);rows.push([B('🔄 بررسی دوباره','tempmail_inbox','','success')],[B('⬅️ برگشت','tempmail','','primary')]);return edit(chat,msgId,out,env,KB(rows))}catch(e){return edit(chat,msgId,'<b>❌ دریافت پیام‌ها ناموفق بود</b>\n\n'+esc(String(e&&e.message||e).slice(0,220)),env,KB([[B('🔄 تلاش دوباره','tempmail_inbox','','success')],[B('⬅️ برگشت','tempmail','','primary')]]))}}
async function tempMailRead(chat,env,msgId,messageId){const row=await env.BOT_DB.prepare('SELECT chat_id,address,token,provider FROM temp_emails WHERE chat_id=?').bind(String(chat)).first();if(!row)return tempMailMenu(chat,env,msgId);try{let from='-',subject='(بدون موضوع)',body='';
  if(row.provider==='guerrilla'){const m=await guerrCall(env,row,{f:'fetch_email',email_id:String(messageId)});from=m.mail_from||'-';subject=m.mail_subject||subject;body=String(m.mail_body||'');}
  else{const m=await mailApi('/messages/'+encodeURIComponent(messageId),{headers:{authorization:'Bearer '+row.token}});from=(m.from&&m.from.address)||'-';subject=m.subject||subject;body=String(m.text||'').trim();if(!body&&Array.isArray(m.html))body=m.html.join('\n');}
  body=body.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,3000);const codes=[...new Set((body.match(/\b\d{4,8}\b/g)||[]))].slice(0,8);let txt='<b>📨 متن پیام</b>\n\n<b>از:</b> '+esc(from)+'\n<b>موضوع:</b> '+esc(subject)+'\n\n'+esc(body||'متن قابل نمایش نیست.');if(codes.length)txt+='\n\n<b>کدهای احتمالی:</b> '+codes.map(x=>'<code>'+x+'</code>').join(' · ');return edit(chat,msgId,txt,env,KB([[B('📥 صندوق','tempmail_inbox','','success')],[B('⬅️ برگشت','tempmail','','primary')]]))}catch(e){return edit(chat,msgId,'<b>❌ خواندن پیام ناموفق بود</b>\n\n'+esc(String(e&&e.message||e).slice(0,220)),env,KB([[B('📥 صندوق','tempmail_inbox','','success')],[B('⬅️ برگشت','tempmail','','primary')]]))}}
async function tempMailDelete(chat,env,msgId){const row=await env.BOT_DB.prepare('SELECT account_id,token,provider FROM temp_emails WHERE chat_id=?').bind(String(chat)).first();if(!row)return tempMailMenu(chat,env,msgId);try{if(row.account_id&&row.provider!=='guerrilla')await mailApi('/accounts/'+encodeURIComponent(row.account_id),{method:'DELETE',headers:{authorization:'Bearer '+row.token}})}catch(e){}await env.BOT_DB.prepare('DELETE FROM temp_emails WHERE chat_id=?').bind(String(chat)).run();return edit(chat,msgId,'<b>🗑 ایمیل موقت حذف شد</b>\n\nاطلاعات این صندوق از ربات پاک شد.',env,KB([[B('✨ ساخت ایمیل جدید','tempmail_create','','success')],[B('⬅️ منو','menu','','primary')]]))}

const FAQ_SEED=[
{q:'پنل چیه؟',a:'پنل، یک پنل اختصاصی VPN است که با این ربات برای خودت می‌سازی. بعد از ساخت، لینک و رمز پنل را داری و از همان لینک وارد پنل می‌شوی.',kw:'پنل چیه|پنل چیست|پنل یعنی چی'},
{q:'ربات چطور کار می‌کنه؟',a:'از منوی اصلی، با دکمه‌ها کارها را انجام می‌دهی: ساخت پنل، پنل‌های من، حساب‌های Cloudflare، ایمیل موقت و مدیریت ربات.',kw:'ربات چطور کار میکنه|چطور از ربات استفاده کنم'},
{q:'چطوری پنل بسازم؟',a:'از منوی اصلی روی «🚀 ساخت پنل» بزن، پنل مورد نظر را انتخاب کن، بعد حساب Cloudflare را انتخاب کن. ربات مراحل ساخت را نشان می‌دهد و در پایان لینک و رمز پنل را برایت می‌فرستد.',kw:'ساخت پنل|پنل جدید|پنل بسازم|پنل میسازم|پنل می سازم|پنل بسازیم'},
{q:'ساخت پنل چقدر طول می‌کشه؟',a:'معمولاً چند دقیقه. مراحل ساخت در پیام نشان داده می‌شود؛ لطفاً تا پایان صبر کن و دکمه‌ها را دوباره نزن.',kw:'چقدر طول میکشه|چند دقیقه|زمان ساخت پنل'},
{q:'پنل ساخت نشد، چه کار کنم؟',a:'پیام خطا را بخوان؛ معمولاً مشکل از توکن Cloudflare، دسترسی‌های توکن یا سهمیه‌ی دیتابیس D1 است. اگر خطا ادامه داشت، از دکمه‌ی پشتیبانی پیام خطا را بفرست.',kw:'ساخت نشد|خطا ساخت پنل|پنل ساخته نشد'},
{q:'حساب Cloudflare چیه و چرا لازمه؟',a:'پنل روی حساب Cloudflare خودت ساخته می‌شود. برای همین باید یک حساب Cloudflare و توکن API آن را به ربات اضافه کنی.',kw:'حساب کلودفلر|کلودفلر چیه|cloudflare چیه'},
{q:'چطوری حساب Cloudflare اضافه کنم؟',a:'از منوی اصلی روی «➕ افزودن Cloudflare» بزن و توکن API را بفرست. بعد Account ID را بفرست تا حساب ثبت شود.',kw:'افزودن کلودفلر|اضافه کردن حساب|افزودن cloudflare|حساب کلودفلر اضافه|اضافه کردن حساب کلودفلر|اضافه کنم کلودفلر'},
{q:'توکن Cloudflare رو از کجا بیارم؟',a:'وارد داشبورد Cloudflare شو، بخش API Tokens را باز کن و یک توکن با دسترسی‌های لازم بساز. توکن را فقط یک بار نشان می‌دهند، پس همان لحظه کپی کن.',kw:'توکن کلودفلر|توکن cloudflare|api token'},
{q:'Account ID رو کجا پیدا کنم؟',a:'Account ID در داشبورد Cloudflare، در صفحه‌ی اصلی حساب و کنار نام حساب نمایش داده می‌شود.',kw:'account id|آیدی حساب کلودفلر|اکانت آیدی'},
{q:'پنل‌های من کجاست؟',a:'از منوی اصلی روی «📦 پنل‌های من» بزن تا همه‌ی پنل‌هایی که ساخته‌ای را ببینی.',kw:'پنل های من کجاست|لیست پنل ها|پنل هام'},
{q:'رمز پنلم رو کجا ببینم؟',a:'از «📦 پنل‌های من» پنل را انتخاب کن، بعد «⚙️ تنظیمات پنل» و دکمه‌ی «🔑 رمز پنل». رمز همیشه داخل ربات قابل مشاهده است.',kw:'رمز پنل|پسورد پنل|رمز رو کجا ببینم'},
{q:'رمز پنلم رو عوض کنم؟',a:'رمز را از داخل خود پنل می‌توانی عوض کنی. بعد از تغییر، رمز جدید در ربات هم نمایش داده می‌شود.',kw:'تغییر رمز|عوض کردن رمز|رمز رو عوض'},
{q:'لینک پنلم کجاست؟',a:'لینک پنل را موقع ساخت دریافت کردی. اگر گم کردی، از «📦 پنل‌های من» وارد پنل شو و از تنظیمات لینک را پیدا کن.',kw:'لینک پنل|آدرس پنل|لینک رو کجا ببینم'},
{q:'پنلم باز نمیشه، چی کار کنم؟',a:'اول مطمئن شو اینترنت و فیلترشکن درست کار می‌کند. سپس لینک پنل را دوباره باز کن. اگر باز هم باز نشد، از «🩺 تست سلامت» در تنظیمات پنل استفاده کن یا از پشتیبانی بپرس.',kw:'باز نمیشه|باز نمیشود|لود نمیشه'},
{q:'پنل رو چطور حذف کنم؟',a:'از «📦 پنل‌های من» پنل را انتخاب کن و گزینه‌ی «🗑 حذف این پنل» را بزن. حذف پنل برگشت‌پذیر نیست.',kw:'حذف پنل|پاک کردن پنل|پنل رو حذف'},
{q:'کاربرهای پنل رو چطور مدیریت کنم؟',a:'از تنظیمات پنل روی «👥 کاربران» بزن. می‌توانی کاربر جدید بسازی، حجم و مدت آن را تعیین کنی یا کاربر را فعال و غیرفعال کنی.',kw:'مدیریت کاربران پنل|کاربر جدید|ساخت کاربر'},
{q:'چطوری کاربر جدید بسازم؟',a:'از تنظیمات پنل روی «👥 کاربران» و بعد ساخت کاربر بزن. نام، حجم (گیگابایت، ۰ یعنی نامحدود) و مدت (روز، ۰ یعنی بدون انقضا) را بفرست.',kw:'کاربر جدید|ساخت کاربر|اضافه کردن کاربر'},
{q:'پنل رو چطور روشن یا خاموش کنم؟',a:'از تنظیمات پنل گزینه‌ی «🟢 پنل روشن» یا «🔴 پنل خاموش» را بزن تا وضعیت پنل تغییر کند.',kw:'روشن کردن پنل|خاموش کردن پنل|پنل رو خاموش'},
{q:'اسم پنلم رو چطور عوض کنم؟',a:'از تنظیمات پنل روی «✏️ تغییر نام» بزن و نام جدید را بفرست.',kw:'تغییر نام پنل|اسم پنل|نام پنل رو عوض'},
{q:'محدودیت اتصال یعنی چی؟',a:'یعنی حداکثر تعداد اتصال همزمان. از تنظیمات پنل با «🔧 تغییر سقف اتصال» می‌توانی آن را تنظیم کنی.',kw:'سقف اتصال|محدودیت اتصال|max connection'},
{q:'ضد تبلیغ چیه؟',a:'ضد تبلیغ جلوی بعضی تبلیغ‌ها را در پنل می‌گیرد. از تنظیمات پنل با «🛡️ ضدتبلیغ» روشن یا خاموش می‌شود.',kw:'ضد تبلیغ|ضدتبلیغ|تبلیغ'},
{q:'سهمیه دیتابیس D1 پر شده، یعنی چی؟',a:'کلودفلر برای هر حساب تعداد محدودی دیتابیس D1 می‌دهد. یکی از دیتابیس‌های بلااستفاده را در داشبورد Cloudflare از بخش Storage & Databases ← D1 حذف کن و دوباره ساخت پنل را بزن.',kw:'سهمیه دیتابیس|d1 پر|دیتابیس پر'},
{q:'ایمیل موقت چیه؟',a:'با «📧 ایمیل موقت» یک آدرس ایمیل موقت می‌سازی و پیام‌های دریافتی را داخل ربات می‌بینی. این صندوق فقط به حساب تلگرام خودت وصل است.',kw:'ایمیل موقت|ساخت ایمیل|میل موقت'},
{q:'ارتباط با پشتیبانی چطوری؟',a:'از دکمه‌ی «💬 ارتباط با پشتیبانی» داخل منوی اصلی، مستقیم به پشتیبانی پیام بده.',kw:'پشتیبانی|ارتباط با پشتیبانی|ادمین'},
{q:'ربات جواب نمیده، چرا؟',a:'اگر عضویت اجباری فعال است، ابتدا عضو کانال‌های اعلام‌شده شو و سپس دکمه‌ی «بررسی عضویت» را بزن. اگر باز هم جواب نداد، چند دقیقه بعد دوباره امتحان کن.',kw:'جواب نمیده|جواب نمی دهد|ربات کار نمیکنه'},
{q:'عضویت اجباری یعنی چی؟',a:'یعنی برای استفاده از ربات باید عضو کانال‌های مشخص‌شده باشی. بعد از عضویت، دکمه‌ی بررسی عضویت را بزن.',kw:'عضویت اجباری|عضو کانال|جوین اجباری'},
{q:'منو کجاست؟',a:'برای برگشت به منوی اصلی دستور /start یا /menu را بفرست.',kw:'منو کجاست|منوی اصلی|/menu|/start'},
{q:'آیدی عددی خودم رو چطوری پیدا کنم؟',a:'دستور /id را بفرست تا آیدی عددی‌ات را ببینی.',kw:'آیدی عددی|آیدی من|/id'},
{q:'ربات تلگرام چطوری بسازم؟',a:'از «🤖 مدیریت ربات» وارد شو و طبق مراحل، توکن ربات را بفرست. توکن را از BotFather بگیر.',kw:'ربات تلگرام بسازم|ساخت ربات|ربات خودم'},
{q:'BotFather چیه؟',a:'BotFather ربات رسمی تلگرام برای ساخت و مدیریت ربات‌هاست. با جستجوی @BotFather در تلگرام پیدا می‌کنی و با دستور /newbot ربات می‌سازی.',kw:'botfather|بات فادر|بات فدر'},
{q:'توکن ربات رو از کجا بگیرم؟',a:'با @BotFather دستور /newbot را بفرست، نام و یوزرنیم ربات را انتخاب کن و توکنی که می‌دهد را کپی کن.',kw:'توکن ربات|توکن بات|bot token'},
{q:'آیا استفاده از ربات رایگانه؟',a:'جزئیات هزینه و شرایط استفاده را مالک ربات تعیین می‌کند. برای اطلاع دقیق، از پشتیبانی بپرس.',kw:'رایگانه|هزینه ربات|قیمت ربات'},
{q:'هزینه ساخت پنل چقدره؟',a:'هزینه‌ی ساخت پنل به تنظیمات مالک ربات و حساب Cloudflare خودت بستگی دارد. برای اطلاع از قیمت، از پشتیبانی بپرس.',kw:'هزینه ساخت پنل|قیمت پنل|پنل چقدره'},
{q:'چند تا پنل میتونم بسازم؟',a:'تعداد پنل به محدودیت‌های حساب Cloudflare و تنظیمات ربات بستگی دارد. اگر به محدودیت خوردی، پیام خطا را بخوان یا از پشتیبانی بپرس.',kw:'چند تا پنل|تعداد پنل|محدودیت پنل'},
{q:'ساب لینک چیه؟',a:'لینک اشتراک (ساب) لینکی است که کانفیگ‌های پنل را در یک جا به برنامه‌ی VPN می‌دهد. آن را از صفحه‌ی پنل یا تنظیمات پنل می‌توانی بگیری.',kw:'ساب لینک|لینک ساب|subscription'},
{q:'هوش مصنوعی توی گروه چطوری کار می‌کنه؟',a:'اگر سوالت را با «ربات» شروع کنی، یا با دستور /ai بپرسی، یا به پیام ربات ریپلای کنی، ربات جواب می‌دهد. سوال‌های رایج را از بانک سوال‌ها جواب می‌دهد.',kw:'هوش مصنوعی گروه|سوال از ربات|ai'},
{q:'پنل ساخته شد ولی کار نمیکنه، چی کار کنم؟',a:'از تنظیمات پنل «🩺 تست سلامت» را بزن. اگر خطا داد، پیام را برای پشتیبانی بفرست.',kw:'کار نمیکنه|کار نمی کنه|پنل خراب'},
{q:'آپدیت پنل یعنی چی؟',a:'وقتی نسخه‌ی جدید پنل منتشر شود، از داخل پنل‌های من می‌توانی پنل را به‌روزرسانی کنی تا امکانات جدید را داشته باشد.',kw:'آپدیت پنل|بروزرسانی پنل|نسخه جدید'},
{q:'فیلترشکن لازمه؟',a:'بعضی وقت‌ها برای باز شدن لینک پنل از فیلترشکن استفاده می‌شود. اگر لینک باز نشد، فیلترشکن را امتحان کن.',kw:'فیلترشکن|فیلتر شکن|vpn لازمه'},
{q:'کاربر جدید از کجا میاد داخل پنل؟',a:'کاربرها را از تنظیمات پنل و بخش کاربران می‌سازی. هر کاربر یک لینک اشتراک دارد که با آن کانفیگ می‌گیرد.',kw:'کاربر داخل پنل|کاربر از کجا|لینک کاربر'},
{q:'حساب Cloudflare رو از ربات حذف کنم، خود Cloudflare پاک میشه؟',a:'نه. حذف حساب از ربات فقط آن را از لیست ربات برمی‌دارد؛ خود حساب Cloudflare حذف نمی‌شود.',kw:'حذف حساب کلودفلر|حذف حساب|پاک کردن حساب'},
{q:'چطوری حساب Cloudflare رو حذف کنم؟',a:'از «☁️ حساب‌های Cloudflare» وارد حساب شو و گزینه‌ی حذف را بزن. اگر پنل متصل داشته باشد، ابتدا باید پنل‌هایش را حذف کنی.',kw:'حذف حساب|حذف اکانت|اکانت کلودفلر'},
{q:'ربات رو چطوری دوباره راه بندازم؟',a:'دستور /start را بفرست تا منوی اصلی دوباره نمایش داده شود.',kw:'دوباره راه بندازم|ریست ربات|restart'},
{q:'سایت Cloudflare کجاست؟',a:'سایت رسمی Cloudflare آدرس cloudflare.com است. برای ساخت حساب و توکن از همان سایت استفاده کن.',kw:'سایت کلودفلر|cloudflare.com|سایت cloudflare'},
{q:'سلام، ربات کجاست؟',a:'سلام! 👋 برای شروع دستور /start را بفرست یا سوالت را بپرس.',kw:'سلام|درود|hi|hello'},
{q:'ممنون',a:'خواهش می‌کنم! 🌹 اگر سوال دیگری داشتی، بپرس.',kw:'ممنون|مرسی|تشکر'}
];
let FAQ_READY=false,FAQ_C=null,FAQ_T=0;
const FAQ_STOP=new Set(['چطور','چطوری','چجوری','چگونه','چه','چی','کجا','آیا','کی','چرا','میشه','ممکنه','من','می','تا','از','به','در','که','را','این','آن','یک','هست','است','کنم','کنیم','کنی','بکنم','ربات','هوش','مصنوعی','و','با','برای','رو','های','ها','چیه','چیست','بزنم','باید','کرد','کنید','شد','لطفا','سلام','میخوام','خواستم','داره','دارم','داری','اگر','اگه','بشه','بشم','هستش','یه','یه']);
function faqNorm(s){return String(s||'').toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064B-\u065F\u0670]/g,'').replace(/\u200c/g,'').replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim()}
function faqToks(s){return faqNorm(s).split(' ').filter(t=>t.length>1&&!FAQ_STOP.has(t))}
function tokHit(a,b){return a===b||(a.length>=4&&b.length>=4&&a.slice(0,4)===b.slice(0,4))}
async function faqInsert(env,items){let n=0;for(let i=0;i<items.length;i+=50){const chunk=items.slice(i,i+50);await env.BOT_DB.batch(chunk.map(x=>env.BOT_DB.prepare('INSERT INTO faq(q,a,kw) VALUES(?,?,?)').bind(String(x.q),String(x.a),String(x.kw||'')))); n+=chunk.length;}FAQ_C=null;return n}
async function faqInit(env){if(FAQ_READY)return;await env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS faq(id INTEGER PRIMARY KEY AUTOINCREMENT,q TEXT,a TEXT,kw TEXT)').run();const c=await env.BOT_DB.prepare('SELECT COUNT(*) AS c FROM faq').first();if(!Number(c&&c.c))await faqInsert(env,FAQ_SEED);FAQ_READY=true}
async function faqAll(env){if(FAQ_C&&Date.now()-FAQ_T<60000)return FAQ_C;await faqInit(env);const rs=await env.BOT_DB.prepare('SELECT id,q,a,kw FROM faq').all();FAQ_C=((rs&&rs.results)||[]).map(r=>{const kw=String(r.kw||'').split('|').map(x=>faqNorm(x)).filter(Boolean);return {id:r.id,q:String(r.q||''),a:String(r.a||''),_kw:kw,_toks:[...new Set(faqToks(String(r.q||'')+' '+kw.join(' ')))]}});FAQ_T=Date.now();return FAQ_C}
async function faqMatch(env,q,explicit){
  const list=await faqAll(env);if(!list.length)return null;
  const Q=[...new Set(faqToks(q))];if(!Q.length)return null;
  const qn=faqNorm(q);let best=null,bs=0;
  for(const e of list){
    let inter=0;for(const t of Q)if(e._toks.some(x=>tokHit(t,x)))inter++;
    if(inter===0)continue;
    let ph=false;
    for(const k of e._kw)if(k&&qn.includes(k)){ph=true;break}
    if(inter<Math.min(2,Q.length)&&!ph)continue;
    let s=inter/Q.length;
    if(ph)s+=0.4;
    if(s>bs){bs=s;best=e}
  }
  const th=explicit?0.34:0.6;
  return (best&&bs>=th)?best:null;
}
function fmtTags(s){let x=esc(String(s));x=x.replace(/\[b\]([\s\S]*?)\[\/b\]/g,'<b>$1</b>').replace(/\[i\]([\s\S]*?)\[\/i\]/g,'<i>$1</i>').replace(/\[code\]([\s\S]*?)\[\/code\]/g,'<code>$1</code>').replace(/\[quote\]([\s\S]*?)\[\/quote\]/g,'<blockquote>$1</blockquote>');return x}
async function faqImportRaw(env,raw){let arr;try{arr=JSON.parse(raw)}catch(e){throw new Error('JSON معتبر نیست')}if(!Array.isArray(arr))throw new Error('فایل باید یک آرایه‌ی JSON باشد');const items=arr.filter(x=>x&&typeof x.q==='string'&&typeof x.a==='string'&&x.q.trim()&&x.a.trim()).map(x=>({q:x.q.trim().slice(0,500),a:x.a.trim().slice(0,3000),kw:Array.isArray(x.kw)?x.kw.join('|'):String(x.kw||'')}));if(!items.length)throw new Error('هیچ موردی درست نبود (فیلدهای q و a لازم‌اند)');await faqInit(env);return faqInsert(env,items)}
async function faqReply(chat,env,raw){try{const n=await faqImportRaw(env,raw);await send(chat,'<b>✅ '+n+' مورد ذخیره شد</b>',env,KB([[B('📚 بانک سوال‌ها','faqadm','','primary')]]))}catch(e){await send(chat,'<b>❌ ایمپورت ناموفق</b>\n\n'+quote(String(e&&e.message||e)),env,KB([[B('📚 بانک سوال‌ها','faqadm','','primary')]]))}return true}
async function ownerFaqDoc(u,env){const m=u.message;if(!m||!m.chat||!m.document||!isOwner(String(m.chat.id),env))return false;const st=await getState(env,String(m.chat.id));if(!st||st.step!=='await_faq_import')return false;await clearState(env,String(m.chat.id));const f=await tg('getFile',{file_id:m.document.file_id},env);if(!f||!f.ok){await send(String(m.chat.id),'<b>❌ فایل خوانده نشد</b>',env,null);return true}const txt=await (await fetch('https://api.telegram.org/file/bot'+env.BOT_TOKEN+'/'+f.result.file_path)).text();return faqReply(String(m.chat.id),env,txt)}
async function faqScreen(chat,env,msgId){await faqInit(env);const c=await env.BOT_DB.prepare('SELECT COUNT(*) AS c FROM faq').first();return edit(chat,msgId,'<b>📚 بانک سوال و جواب</b>\n\n'+quote('اگر کاربر داخل گروه سوالی بپرسد که با یکی از این موارد شبیه باشد، ربات همان جواب را می‌دهد؛ اول «در حال فکر کردن» نشان می‌دهد و بعد پیام را به جواب تبدیل می‌کند.')+'\nتعداد موارد: <b>'+Number(c&&c.c||0)+'</b>',env,KB([[B('📥 افزودن (فایل JSON یا متن)','faqimp','','success')],[B('🔄 بازگردانی موارد پیش‌فرض','faqreseed','','danger')],[B('⬅️ ادمین','admin','','primary')]]))}
async function faqOp(op,chat,env,msgId){
  if(op==='faqadm')return faqScreen(chat,env,msgId);
  if(op==='faqimp'){await setState(env,chat,'await_faq_import');return edit(chat,msgId,'<b>📥 افزودن سوال و جواب</b>\n\nیک فایل <code>.json</code> بفرست یا متن JSON را همین‌جا پیام بده.\n\nفرمت:\n<code>[{"q":"چطوری پنل بسازم؟","a":"از منوی ساخت پنل...","kw":["ساخت پنل","پنل جدید"]}]</code>\n\nفیلد kw اختیاری است. برای لغو /cancel را بفرست.',env,KB([[B('⬅️ برگشت','faqadm','','primary')]]))}
  if(op==='faqreseed'){await env.BOT_DB.prepare('DELETE FROM faq').run();FAQ_C=null;await faqInsert(env,FAQ_SEED);return faqScreen(chat,env,msgId)}
  return faqScreen(chat,env,msgId);
}
async function groupAI(u,env){
  const m=u.message||u.edited_message;
  if(!m||!m.chat||!(m.chat.type==='group'||m.chat.type==='supergroup'))return false;
  if(!m.from||m.from.is_bot)return false;
  const txt=typeof m.text==='string'?m.text.trim():'';
  if(!txt)return false;
  let q=null,explicit=false;
  const cmd=txt.match(/^\/(?:ai|ask)(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if(cmd){q=String(cmd[1]||'').trim();explicit=true}
  else if(/^(ربات|هوش مصنوعی|هوش)(?:[\s،,:؟?!]+|$)/.test(txt)){q=txt.replace(/^(ربات|هوش مصنوعی|هوش)[\s،,:؟?!]*/,'').trim();explicit=true}
  else if(m.reply_to_message&&m.reply_to_message.from&&m.reply_to_message.from.is_bot){q=txt;explicit=true}
  else if(/[؟?]/.test(txt)||/^(چطور|چطوری|چجوری|چگونه|چه|چی|کجا|آیا|کی|چرا|میشه|می‌شه|ممکنه)/.test(txt)){q=txt}
  if(q===null)return false;
  const chat=m.chat.id, uid=String(m.from.id);
  if(explicit&&!q){await tg('sendMessage',{chat_id:chat,reply_to_message_id:m.message_id,text:'سوالت رو بعد از دستور بنویس. مثلاً: ربات چطور پنل بسازم؟'},env);return true}
  if(q.length>400)return false;
  const hit=await faqMatch(env,q,explicit);
  if(!hit&&!explicit)return false;
  const think=await tg('sendMessage',{chat_id:chat,reply_to_message_id:m.message_id,text:'⏳ در حال فکر کردن...'},env);
  const mid=(think&&think.ok)?think.result.message_id:null;
  let html;
  if(hit){await sleep(700);html=fmtTags(hit.a)}
  else{
    const r=await api(env,{action:'ai_answer',chat_id:uid,q}).catch(()=>null);
    let t=null;
    if(r&&r.ok&&r.text)t=String(r.text);
    else if(r&&r.error==='rate')t='یک کم صبر کن و دوباره بپرس 🙏';
    else t='متوجه سوالت نشدم. لطفاً واضح‌تر بپرس یا از دکمه‌ی پشتیبانی کمک بگیر.';
    html=esc(Array.from(t).slice(0,3500).join(''));
  }
  if(mid){await tg('editMessageText',{chat_id:chat,message_id:mid,text:html,parse_mode:'HTML',disable_web_page_preview:true},env)}
  else{await tg('sendMessage',{chat_id:chat,reply_to_message_id:m.message_id,text:html,parse_mode:'HTML',disable_web_page_preview:true},env)}
  return true;
}
async function aiScreen(chat,env,msgId){
  const r=await api(env,{action:'bot_cfg_get',chat_id:chat}).catch(()=>null);
  const on=!!(r&&r.ai_on);const pr=String((r&&r.ai_prompt)||'(پیش‌فرض)').slice(0,300);
  return edit(chat,msgId,'<b>🤖 هوش مصنوعی گروه</b>\n\n'+quote('وقتی کاربر داخل گروه با «ربات ...» یا دستور /ai سوال بپرسد، ربات با هوش مصنوعی جواب می‌دهد. اگر کاربر به پیام ربات ریپلای کند هم جواب می‌دهد.')+'\nوضعیت: <b>'+(on?'🟢 روشن':'🔴 خاموش')+'</b>\n\nپرامپت فعلی:\n<code>'+esc(pr)+'</code>',env,KB([[B(on?'⏹ خاموش کردن':'▶️ روشن کردن','aitog','',on?'danger':'success')],[B('✍️ تغییر پرامپت','aiprompt','','primary')],[B('⬅️ ادمین','admin','','primary')]]))
}
async function aiOp(op,chat,env,msgId){
  if(op==='aicfg')return aiScreen(chat,env,msgId);
  if(op==='aitog'){const r=await api(env,{action:'bot_cfg_get',chat_id:chat}).catch(()=>null);const on=!!(r&&r.ai_on);await api(env,{action:'bot_cfg_set',chat_id:chat,ai_on:!on});return aiScreen(chat,env,msgId);}
  if(op==='aiprompt'){await setState(env,chat,'await_ai_prompt');return edit(chat,msgId,'<b>✍️ پرامپت هوش مصنوعی</b>\n\nدستورالعمل رفتار ربات را بفرست (حداکثر ۱۰۰۰ کاراکتر).\nبرای بازگشت به پیش‌فرض، کلمه‌ی <code>پیش‌فرض</code> را بفرست.\nبرای لغو /cancel را بفرست.',env,KB([[B('⬅️ برگشت','aicfg','','primary')]]))}
  return aiScreen(chat,env,msgId);
}
const RUDE_WORDS=['کص','کیر','کون','جنده','عوضی','حرومزاده','مادرجنده','ننت','کسخل','گایید','خارکص','بیشرف','احمق','الاغ','کسشر','بی‌شرف','خایه'];
const RUDE_LAST={};
function isRudeText(t){const n=faqNorm(t);if(!n)return false;const toks=n.split(' ');if(toks.some(w=>RUDE_WORDS.includes(w)))return true;return RUDE_WORDS.some(w=>w.length>=4&&n.includes(w))}
async function groupRudeness(u,env){
  try{
    const m=u.message||u.edited_message;
    if(!m||!m.chat||!(m.chat.type==='group'||m.chat.type==='supergroup'))return false;
    if(!m.from||m.from.is_bot||typeof m.text!=='string')return false;
    if(!isRudeText(m.text))return false;
    const key=String(m.chat.id), now=Date.now();
    if(RUDE_LAST[key]&&now-RUDE_LAST[key]<60000)return false;
    RUDE_LAST[key]=now;
    await tg('sendMessage',{chat_id:m.chat.id,reply_to_message_id:m.message_id,text:'لطفاً محترمانه صحبت کنیم 🙏 من اینجام که کمک کنم؛ اگر سوالی داری بپرس.'},env);
  }catch(e){}
  return false;
}
function welcomeRender(tpl,u){
  const now=new Date(), tz={timeZone:'Asia/Tehran'};
  const h=Number(now.toLocaleTimeString('en-GB',{...tz,hour:'2-digit',hour12:false}).slice(0,2));
  const greet=h>=5&&h<12?'صبح بخیر':h>=12&&h<17?'ظهر بخیر':h>=17&&h<21?'عصر بخیر':'شب بخیر';
  const vars={name:u.first_name||u.username||'کاربر',username:u.username?'@'+u.username:'-',id:String(u.chat_id||''),date:now.toLocaleDateString('fa-IR',tz),time:now.toLocaleTimeString('fa-IR',{...tz,hour:'2-digit',minute:'2-digit'}),hour:now.toLocaleTimeString('en-GB',{...tz,hour:'2-digit',minute:'2-digit',hour12:false}),greeting:greet};
  let s=esc(String(tpl));
  s=s.replace(/\[b\]([\s\S]*?)\[\/b\]/g,'<b>$1</b>').replace(/\[i\]([\s\S]*?)\[\/i\]/g,'<i>$1</i>').replace(/\[code\]([\s\S]*?)\[\/code\]/g,'<code>$1</code>').replace(/\[quote\]([\s\S]*?)\[\/quote\]/g,'<blockquote>$1</blockquote>');
  s=s.replace(/\{(name|username|id|date|time|hour|greeting)\}/g,(m,k)=>esc(vars[k]));
  return s;
}
async function welcome(chat,env){const w=await api(env,{action:'welcome_get',chat_id:chat}).catch(()=>null);const uq=await env.BOT_DB.prepare('SELECT username,first_name FROM users WHERE chat_id=?').bind(String(chat)).first().catch(()=>null);const txt=(w&&w.ok&&String(w.text||'').trim())?welcomeRender(String(w.text).trim(),{chat_id:chat,username:uq&&uq.username,first_name:uq&&uq.first_name}):'<b>به Vex خوش آمدید</b>\n\n'+quote('از این ربات می‌توانید پنل VPN اختصاصی بسازید، ربات تلگرام خود را مدیریت کنید و همه‌چیز را از یک جا کنترل کنید.')+'\n\nبرای شروع یکی از گزینه‌های زیر را انتخاب کنید.';const kb=mainKB(chat,env);const pid=await kvGetBot(env,'welcome_photo','');if(pid){const r=await tg('sendPhoto',{chat_id:String(chat),photo:pid,caption:String(txt).slice(0,1024),parse_mode:'HTML',reply_markup:kb},env);if(r&&r.ok)return r}return send(chat,txt,env,kb)}
async function status(chat,env,msgId=null){const r=await api(env,{action:'user_status',chat_id:chat});const t=r.ok?('<b>📊 وضعیت حساب</b>\n\n'+quote('همه‌چیز از همین‌جا قابل بررسیه.')+'\nحساب‌های Cloudflare: <b>'+esc(r.accounts||0)+'</b>\nپنل‌ها: <b>'+esc(r.panels||0)+'</b>\nپنل‌های فعال: <b>'+esc(r.active_panels||0)+'</b>\nکاربران پنل: <b>'+esc(r.panel_users||0)+'</b>'):('<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'));const kb=KB([[B('🔄 بروزرسانی','status','','success')],[B('⬅️ منو','menu','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}
async function forceChannels(env,chat){const r=await api(env,{action:'force_channels',chat_id:String(chat||env.BOT_OWNER_ID||'1')});return r.ok?(r.channels||[]):[]}
async function forceGate(chat,env){if(isOwner(chat,env))return {ok:true};const cs=await forceChannels(env,chat);if(!cs.length)return {ok:true};const miss=[];for(const c of cs){const r=await tg('getChatMember',{chat_id:c.id,user_id:chat},env);const m=r&&r.ok?r.result:null;const good=!!m&&['creator','administrator','member'].includes(String(m.status||''))||(m&&m.status==='restricted'&&m.is_member);if(!good)miss.push(c);}return miss.length?{ok:false,channels:miss}: {ok:true}}
async function forceMessage(chat,env,msgId=null){const cs=await forceChannels(env,chat);if(!cs.length)return msgId?edit(chat,msgId,'<b>🛡 عضویت اجباری</b>\n\n'+quote('در حال حاضر کانال اجباری تنظیم نشده است.'),env,KB([[B('⬅️ منو','menu','','primary')]])):send(chat,'<b>🛡 عضویت اجباری</b>\n\n'+quote('در حال حاضر کانال اجباری تنظیم نشده است.'),env,mainKB(chat,env));const rows=cs.map(c=>[B('📢 '+String(c.title||'عضویت در کانال'),null,String(c.url),'primary')]);rows.push([B('⬅️ منو','menu','','primary')]);const t='<b>🛡 عضویت اجباری</b>\n\n'+quote('برای استفاده از ربات لطفاً عضو این کانال‌ها شو. بعد از عضویت، پیام تأیید برایت ارسال می‌شود.');return msgId?edit(chat,msgId,t,env,KB(rows)):send(chat,t,env,KB(rows))}
async function stats(chat,env,msgId=null){const r=await api(env,{action:'user_status',chat_id:chat});const t='<b>📈 آمار پیشرفته</b>\n\n'+quote('نمای کلی منابع و پنل‌های شما')+'\n☁️ حساب‌ها: <b>'+esc(r.accounts||0)+'</b>\n🎛 پنل‌ها: <b>'+esc(r.panels||0)+'</b>\n🟢 فعال: <b>'+esc(r.active_panels||0)+'</b>\n👥 کاربران: <b>'+esc(r.panel_users||0)+'</b>\n🕒 زمان: <code>'+esc(new Date().toLocaleString('fa-IR'))+'</code>';return msgId?edit(chat,msgId,t,env,KB([[B('🔄 بروزرسانی','stats','','success')],[B('⬅️ منو','menu','','primary')]])):send(chat,t,env,KB([[B('🔄 بروزرسانی','stats','','success')],[B('⬅️ منو','menu','','primary')]]))}
async function botHealth(chat,env,msgId=null){const r=await api(env,{action:'user_status',chat_id:chat});const t=r.ok?'<b>🧪 سلامت سرویس</b>\n\n'+quote('ارتباط ربات با API مرکزی برقرار است.')+'\nAPI: <b>🟢 OK</b>\nحساب‌ها: <b>'+esc(r.accounts||0)+'</b>\nپنل‌ها: <b>'+esc(r.panels||0)+'</b>':'<b>🔴 سلامت سرویس</b>\n\n'+quote(r.error||'خطا');return msgId?edit(chat,msgId,t,env,KB([[B('🔄 تست دوباره','health','','success')],[B('⬅️ منو','menu','','primary')]])):send(chat,t,env,KB([[B('🔄 تست دوباره','health','','success')],[B('⬅️ منو','menu','','primary')]]))}
async function quickBuild(chat,env,msgId=null){const r=await api(env,{action:'accounts',chat_id:chat});if(!r.ok||!(r.accounts||[]).length)return msgId?edit(chat,msgId,'<b>⚡ ساخت سریع</b>\n\n'+quote('اول یک حساب Cloudflare اضافه کن.'),env,KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ منو','menu','','primary')]])):send(chat,'<b>⚡ ساخت سریع</b>\n\n'+quote('اول یک حساب Cloudflare اضافه کن.'),env,mainKB(chat,env));return createPanel(chat,env,msgId||0,r.accounts[0].id,'پنل وکس ساخت سریع','auto')}
async function profile(chat,env,msgId=null){const u=await env.BOT_DB.prepare('SELECT * FROM users WHERE chat_id=?').bind(String(chat)).first();const t='<b>👤 پروفایل شما</b>\n\nID: <code>'+esc(chat)+'</code>\nنام: '+esc(u?.first_name||'-')+'\nUsername: @'+esc(u?.username||'-')+'\nعضویت: '+(u?.created?new Date(u.created).toLocaleString('fa-IR'):'-')+'\nآخرین فعالیت: '+(u?.last_seen?new Date(u.last_seen).toLocaleString('fa-IR'):'-');const kb=KB([[B('📊 وضعیت','status','','primary')],[B('⬅️ منو','menu','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}
async function accounts(chat,env,msgId=null){const r=await api(env,{action:'accounts',chat_id:chat});if(!r.ok)return msgId?edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,mainKB(chat,env)):send(chat,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,mainKB(chat,env));const rows=r.accounts||[];if(!rows.length){const t='<b>☁️ حساب‌های Cloudflare</b>\n\n'+quote('هنوز حسابی اضافه نشده؛ با «ساخت توکن هوشمند» توکن لازم را بساز و بعد اینجا وارد کن.');const kb=KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ منو','menu','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}const kb=rows.map(a=>[B('☁️ '+String(a.label||a.account_name||a.id),'acct:'+a.id,'','primary')]);kb.push([B('🗑 حذف چند حساب','acdelmode','','danger')],[B('➕ افزودن حساب','addcf','','success'),B('⬅️ منو','menu','','primary')]);return msgId?edit(chat,msgId,'<b>☁️ حساب‌های Cloudflare</b>\n\nتعداد حساب‌ها: <b>'+rows.length+'</b>\nحساب موردنظر را انتخاب کن:',env,KB(kb)):send(chat,'<b>☁️ حساب‌های Cloudflare</b>\n\nتعداد حساب‌ها: <b>'+rows.length+'</b>\nحساب موردنظر را انتخاب کن:',env,KB(kb))}
async function accountInfo(chat,env,msgId,id){const r=await api(env,{action:'account_info',chat_id:chat,id:String(id)});if(!r.ok)return edit(chat,msgId,'<b>❌ حساب پیدا نشد</b>\n\n'+esc(r.error||'حساب موردنظر پیدا نشد.'),env,KB([[B('☁️ حساب‌ها','accounts','','primary')]]));const a=r.account||{};return edit(chat,msgId,'<b>☁️ اطلاعات حساب Cloudflare</b>\n\nنام: <b>'+esc(a.label||a.account_name||'-')+'</b>\nAccount ID: <code>'+esc(a.account_id||'-')+'</code>\nوضعیت: '+(a.status==='ok'?'🟢 سالم':'🔴 '+esc(a.status||'نامشخص'))+'\nساب‌دامین: <code>'+esc(a.subdomain||'-')+'</code>\nپنل‌های متصل: <b>'+esc(a.panels_count||0)+'</b>\n\n'+quote((a.panels_count>0)?'این حساب به پنل وصل است؛ با حذف حساب، پنل‌های وصل‌شده هم (Worker/Pages و دیتابیس) حذف می‌شوند.':'این حساب فعلاً پنل متصل ندارد و می‌توانی آن را از ربات حذف کنی.'),env,KB([[B('🚀 ساخت پنل با این حساب','buildacct:'+a.id,'','success')],[B('🗑 حذف از ربات','acdel:'+a.id,'','danger')],[B('🗑 حذف چند حساب','acdelmode','','danger')],[B('☁️ حساب‌ها','accounts','','primary')],[B('⬅️ منو','menu','','primary')]]))}
async function accountDeleteMode(chat,env,msgId=null){const r=await api(env,{action:'accounts',chat_id:chat});if(!r.ok)return msgId?edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,mainKB(chat,env)):send(chat,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,mainKB(chat,env));const rows=r.accounts||[];if(!rows.length)return msgId?edit(chat,msgId,'<b>🗑 حذف حساب‌ها</b>\n\nحسابی برای حذف وجود ندارد.',env,KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ حساب‌ها','accounts','','primary')]])):send(chat,'<b>🗑 حذف حساب‌ها</b>\n\nحسابی برای حذف وجود ندارد.',env,KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ حساب‌ها','accounts','','primary')]]));const st=await getState(env,chat),sel=Array.isArray(st?.data?.ids)?st.data.ids.map(String):[];return accountDeleteRender(chat,env,msgId,rows,sel)}
async function accountDeleteRender(chat,env,msgId,rows,sel){const picked=new Set((sel||[]).map(String));const kb=rows.map(a=>{const id=String(a.id),on=picked.has(id);return [B((on?'☑️ ':'⬜ ')+String(a.label||a.account_name||id),'acsel:'+id,'',on?'success':'primary')]});kb.push([B('☑️ انتخاب همه','acall','','primary'),B('🧹 پاک‌کردن انتخاب‌ها','acclear','','primary')]);kb.push([B('🗑 حذف انتخاب‌شده‌ها ('+picked.size+')','acdelconfirm','','danger')],[B('⬅️ حساب‌ها','accounts','','primary')]);const t='<b>🗑 حذف چند حساب Cloudflare</b>\n\nحساب‌هایی که می‌خواهی حذف شوند را تیک بزن.\n\n'+quote('این عملیات حساب را از ربات حذف می‌کند. اگر حساب به پنل وصل باشد، آن پنل‌ها هم (Worker/Pages و دیتابیس) حذف می‌شوند.')+'\nانتخاب‌شده: <b>'+picked.size+'</b>';return msgId?edit(chat,msgId,t,env,KB(kb)):send(chat,t,env,KB(kb))}
async function accountDeleteToggle(chat,env,msgId,id){const st=await getState(env,chat),ids=new Set(Array.isArray(st?.data?.ids)?st.data.ids.map(String):[]),key=String(id);if(ids.has(key))ids.delete(key);else ids.add(key);await setState(env,chat,'cf_delete_select',{ids:Array.from(ids).slice(0,50)});return accountDeleteMode(chat,env,msgId)}
async function accountDeleteAll(chat,env,msgId){const r=await api(env,{action:'accounts',chat_id:chat}),rows=r.accounts||[];await setState(env,chat,'cf_delete_select',{ids:rows.map(a=>String(a.id)).slice(0,50)});return accountDeleteMode(chat,env,msgId)}
async function accountDeleteClear(chat,env,msgId){await setState(env,chat,'cf_delete_select',{ids:[]});return accountDeleteMode(chat,env,msgId)}
async function accountDeleteConfirm(chat,env,msgId){const st=await getState(env,chat),ids=Array.isArray(st?.data?.ids)?st.data.ids.map(x=>parseInt(x)).filter(x=>x>0):[];if(!ids.length)return edit(chat,msgId,'<b>⚠️ چیزی انتخاب نشده</b>\n\nحداقل یک حساب را انتخاب کن.',env,KB([[B('🗑 حذف چند حساب','acdelmode','','danger')],[B('⬅️ حساب‌ها','accounts','','primary')]]));const r=await api(env,{action:'delete_accounts',chat_id:chat,ids});await clearState(env,chat);if(!r.ok)return edit(chat,msgId,'<b>❌ حذف انجام نشد</b>\n\n'+esc(r.error||'خطا'),env,KB([[B('☁️ حساب‌ها','accounts','','primary')]]));const skipped=(r.skipped||[]).map(x=>'• '+esc(x.label||x.id)+' — '+esc(x.reason||'در حال استفاده')).join('\n');return edit(chat,msgId,'<b>🗑 نتیجه حذف حساب‌ها</b>\n\nحذف‌شده: <b>'+esc(r.deleted||0)+'</b>\nردشده: <b>'+esc(r.skipped_count||0)+'</b>'+(skipped?'\n\n<b>موارد ردشده:</b>\n'+skipped:'')+'\n\n'+quote('حساب‌های حذف‌شده فقط از ربات پاک شدند؛ خود حساب Cloudflare حذف نشده است.'),env,KB([[B('☁️ حساب‌ها','accounts','','primary')],[B('⬅️ منو','menu','','primary')]]))}
async function cfVerifyToken(token){
  try{
    const h={Authorization:'Bearer '+token};
    const r=await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify',{headers:h});
    const j=await r.json().catch(()=>null);
    if(j&&j.success){
      if(j.result&&j.result.status&&j.result.status!=='active')return {ok:false,error:'وضعیت توکن فعال نیست ('+j.result.status+').'};
      return {ok:true};
    }
    const r2=await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=5',{headers:h});
    const j2=await r2.json().catch(()=>null);
    if(j2&&j2.success&&Array.isArray(j2.result)&&j2.result.length)return {ok:true};
    return {ok:false,error:'Cloudflare این توکن را تأیید نکرد. توکن را از داشبورد دوباره بساز و کامل کپی کن.'};
  }catch(e){return {ok:false,error:'اتصال به Cloudflare برقرار نشد. کمی بعد دوباره امتحان کن.'}}
}
async function cfVerifyAccount(token,accountId){
  try{
    const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(String(accountId).trim()),{headers:{Authorization:'Bearer '+token}});
    const j=await r.json().catch(()=>null);
    if(j&&j.success)return {ok:true};
    return {ok:false,error:'Account ID پیدا نشد یا توکن به این حساب دسترسی ندارد.'};
  }catch(e){return {ok:false,error:'اتصال به Cloudflare برقرار نشد. کمی بعد دوباره امتحان کن.'}}
}
async function addCF(chat,env){await setState(env,chat,'await_cf');return send(chat,'<b>➕ افزودن Cloudflare</b>\n\n'+quote('دیگه لازم نیست مجوزها را دستی بچینی. روی «ساخت توکن هوشمند» بزن؛ صفحه رسمی Cloudflare با مجوزهای لازم برای Workers و D1 از قبل پر می‌شود. بعد از ساخت، Token را کپی کن و همین‌جا بفرست.'),env,KB([[B('🔐 ساخت توکن هوشمند',null,CF_TOKEN_URL,'success')],[B('📖 راهنمای کوتاه','cfguide','','primary')],[B('⬅️ لغو','menu','','primary')]]))}
async function cfGuide(chat,env,msgId=null){const t='<b>🔐 ساخت Token برای DEMON</b>\n\n۱) روی «ساخت توکن هوشمند» بزن.\n۲) وارد Cloudflare شو و <b>Create Token</b> را بزن.\n۳) مجوزهای Workers، D1 و Cloudflare Pages از قبل در فرم قرار گرفته‌اند.\n۴) Token ساخته‌شده را کپی کن.\n۵) برگرد ربات و Token را همین‌جا بفرست.\n\n'+quote('توکن را در گروه یا برای شخص دیگری ارسال نکن.');const kb=KB([[B('🔐 ساخت توکن هوشمند',null,CF_TOKEN_URL,'success')],[B('⬅️ افزودن Cloudflare','addcf','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}
async function build(chat,env,msgId){const r=await api(env,{action:'ps_list',chat_id:chat});let list=(r&&r.ok&&Array.isArray(r.sources))?r.sources:[];if(!list.length)list=[{id:0,name:'Vex Panel'}];const kb=[];for(let i=0;i<list.length;i+=2){kb.push(list.slice(i,i+2).map(s=>B(String(s.name),'bpick:'+s.id,'',s.id===0?'success':'primary')))}kb.push([B('☁️ حساب‌ها','accounts','','primary'),B('⬅️ منو','menu','','primary')]);return edit(chat,msgId,'<b>🚀 ساخت پنل</b>\n\n'+quote('پنلی را که می‌خواهی نصب شود انتخاب کن.'),env,KB(kb))}
async function buildPickPanel(chat,env,msgId,srcId){const r=await api(env,{action:'accounts',chat_id:chat});const rows=(r&&r.ok)?(r.accounts||[]):[];if(!rows.length)return edit(chat,msgId,'<b>🚀 ساخت پنل</b>\n\n'+quote('اول یک حساب Cloudflare اضافه کن.'),env,KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ پنل‌ها','build','','primary')]]));const kb=rows.map(a=>[B('☁️ '+String(a.label||a.account_name||a.id),'bacc:'+srcId+':'+a.id,'','success')]);kb.push([B('⬅️ پنل‌ها','build','','primary')]);return edit(chat,msgId,'<b>☁️ انتخاب حساب Cloudflare</b>\n\n'+quote('پنل انتخاب‌شده را روی کدام حساب نصب کنم؟'),env,KB(kb))}
async function buildInstall(chat,env,msgId,srcId,accId){let name='وکس پنل';if(Number(srcId)>0){const r=await api(env,{action:'ps_list',chat_id:chat});const f=((r&&r.sources)||[]).find(s=>String(s.id)===String(srcId));if(!f)return edit(chat,msgId,'<b>❌ پنل پیدا نشد</b>',env,KB([[B('⬅️ پنل‌ها','build','','primary')]]));name=String(f.name)}return buildTargetChoice(chat,env,msgId,{account_id:String(accId),name,location:'auto',source:Number(srcId)||0})}
async function buildFromAccount(chat,env,msgId,id){const r=await api(env,{action:'account_info',chat_id:chat,id:String(id)});if(!r.ok)return edit(chat,msgId,'<b>❌ حساب پیدا نشد</b>\n\n'+esc(r.error||'حساب موردنظر پیدا نشد.'),env,KB([[B('🚀 ساخت پنل','build','','success')],[B('☁️ حساب‌ها','accounts','','primary')]]));if(Number(r.account?.panels_count||0)>0){/* انتخاب حساب هنوز معتبر است؛ اتصال موجود مانع ساخت پنل جدید نیست. */}return createPanel(chat,env,msgId,String(id),'وکس پنل','auto')}
async function panelManage(chat,env,msgId,id){if(!isOwner(chat,env))return;const r=await api(env,{action:'admin_panel_info',chat_id:chat,id:String(id)});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ پنل‌های پرمصرف','topp:all','','primary')]]));const p=r.panel;const kb=[];if(p.worker_url)kb.push([B('🚀 ورود به پنل کاربر',null,p.worker_url,'success')]);kb.push([B(p.active?'⛔ بستن دسترسی':'✅ باز کردن دسترسی','pacc:'+p.id+':'+(p.active?0:1),'',p.active?'danger':'success')]);kb.push([B('🗑 حذف پنل','pdel:'+p.id,'','danger')]);kb.push([B('🔄 بروزرسانی','apm:'+p.id,'','primary')]);kb.push([B('⬅️ پنل‌های پرمصرف','topp:all','','primary')]);const t='<b>🎛 مدیریت پنل #'+esc(p.id)+'</b>\n\n'+quote('مالک: '+esc(p.email||'-'))+'\nنام: <b>'+esc(p.worker)+'</b>\nوضعیت: '+(p.active?'🟢 دسترسی باز':'🔴 دسترسی بسته')+(p.custom_domain?'\nدامنه: '+esc(p.custom_domain):'')+(p.health?'\nسلامت: '+esc(p.health):'');return edit(chat,msgId,t,env,KB(kb))}
async function panelMgrAdmin(op,parts,chat,env,msgId){if(!['apm','pacc'].includes(op))return false;if(!isOwner(chat,env))return false;if(op==='pacc'){await api(env,{action:'panel_access',chat_id:chat,id:String(parts[1]||''),on:String(parts[2]||'0')})}await panelManage(chat,env,msgId,parts[1]||'');return true}
async function mainUpdatePrompt(chat,env,msgId){if(!isOwner(chat,env))return;await setState(env,chat,'await_main_url');return edit(chat,msgId,'<b>⬆️ آپدیت پنل اصلی</b>\n\nلینک مخزن GitHub پنل جدید را بفرست (مثلاً https://github.com/owner/repo).\nاین فایل پنل اصلی می‌شود و از این به بعد نصب «Vex Panel» روی Pages با همین فایل انجام می‌شود.\n\nبرای لغو /cancel را بفرست.',env,KB([[B('👑 ادمین','admin','','primary')]]))}
async function askSource(chat,env,name,accountId){const r=await api(env,{action:'ps_list',chat_id:chat});let list=(r&&r.ok&&Array.isArray(r.sources))?r.sources:[];if(!list.length)list=[{id:0,name:'Vex Panel'}];await setState(env,chat,'await_source',{account_id:String(accountId),name:String(name)});const kb=[];for(let i=0;i<list.length;i+=2){kb.push(list.slice(i,i+2).map(s=>B(String(s.name),'psel:'+s.id,'',s.id===0?'success':'primary')))}kb.push([B('⬅️ منو','menu','','primary')]);return send(chat,'<b>🧩 انتخاب پنل برای نصب</b>\n\nپنلی را که می‌خواهی نصب شود انتخاب کن:',env,KB(kb))}
async function panelSources(chat,env,msgId=null){if(!isOwner(chat,env))return;const r=await api(env,{action:'ps_list',chat_id:chat});const rows=(r&&r.ok?r.sources:[])||[];const custom=rows.filter(s=>s.id>0);const kb=custom.map(s=>[B('🔄 بروزرسانی: '+String(s.name),'psupd:'+s.id,'','primary'),B('🗑 حذف','psdel:'+s.id,'','danger')]);kb.push([B('➕ افزودن پنل به ربات','psadd','','success')]);kb.push([B('⬅️ ادمین','admin','','primary')]);const t='<b>🧩 منابع پنل</b>\n\n'+quote('پنل «وکس» همیشه موجود است. پنل‌های اضافه‌شده از مخزن GitHub در بخش ساخت پنل برای کاربر نمایش داده می‌شوند.')+'\nتعداد پنل‌های اضافه‌شده: <b>'+custom.length+'</b>';return msgId?edit(chat,msgId,t,env,KB(kb)):send(chat,t,env,KB(kb))}
async function panelSrcOp(op,parts,chat,env,msgId){
  if(!['psrc','psadd','psdel','psel','psupd'].includes(op))return false;
  if(op==='psel'){const st=await getState(env,chat);if(!st||st.step!=='await_source'||!st.data)return send(chat,'این مرحله منقضی شده. دوباره از «ساخت پنل» شروع کن.',env,mainKB(chat,env)),true;const sid=Number(parts[1]||0);if(sid>0)return createPanel(chat,env,msgId,st.data.account_id,st.data.name,'auto',sid),true;return askLocation(chat,env,msgId,st.data.name,st.data.account_id,0),true}
  if(!isOwner(chat,env))return true;
  if(op==='psrc'){await panelSources(chat,env,msgId);return true}
  if(op==='psupd'){const r=await api(env,{action:'ps_refresh',chat_id:chat,id:String(parts[1]||'')});await send(chat,r&&r.ok?'<b>✅ مخزن بروزرسانی شد</b>\n\n'+quote('اثر انگشت جدید: '+r.sha256+' · حجم: '+r.size+' بایت'):'<b>❌ بروزرسانی ناموفق</b>\n\n'+quote((r&&r.error)||'خطا'),env,null);await panelSources(chat,env,msgId);return true}
  if(op==='psadd'){await setState(env,chat,'await_ps_url');await edit(chat,msgId,'<b>➕ افزودن پنل به ربات</b>\n\nلینک مخزن GitHub پنل را بفرست.\nمثال: <code>https://github.com/owner/repo</code>\nیا لینک مستقیم فایل <code>.js</code> در raw.githubusercontent.com\n\nبرای لغو /cancel را بفرست.',env,KB([[B('⬅️ منابع پنل','psrc','','primary')]]));return true}
  if(op==='psdel'){const r=await api(env,{action:'ps_del',chat_id:chat,id:String(parts[1]||'')});if(!r.ok)await send(chat,'<b>❌ حذف ناموفق</b>\n\n'+quote(r.error||'خطا'),env,null);await panelSources(chat,env,msgId);return true}
  return false;
}
async function askPanelName(chat,env,msgId,accountId){await setState(env,chat,'await_panel_name',{account_id:String(accountId)});return edit(chat,msgId,'<b>🚀 ساخت پنل</b>\n\nنام پنل را ارسال کن.\n\nمثلاً: <code>وکس پنل VIP</code>',env,KB([[B('⚡ ساخت سریع','fast:'+accountId,'','success')],[B('⬅️ منو','menu','','primary')]]))}
async function askLocation(chat,env,msgId,name,accountId,source=0){await setState(env,chat,'await_location',{account_id:String(accountId),name:String(name),source:Number(source||0)});return send(chat,'<b>🌍 انتخاب لوکیشن</b>\n\nلوکیشن Worker را انتخاب کن:',env,KB([[B('🌐 خودکار','loc:'+accountId+':auto','', 'success'),B('🇩🇪 آلمان','loc:'+accountId+':de','', 'primary')],[B('🇳🇱 هلند','loc:'+accountId+':nl','', 'primary'),B('🇬🇧 انگلیس','loc:'+accountId+':gb','', 'primary')],[B('🇫🇷 فرانسه','loc:'+accountId+':fr','', 'primary'),B('🇸🇪 سوئد','loc:'+accountId+':se','', 'primary')],[B('⬅️ منو','menu','','primary')]]))}
async function buildTargetChoice(chat,env,msgId,p){
  await setState(env,chat,'await_build_target',{account_id:String(p.account_id||''),name:String(p.name||'وکس پنل'),location:String(p.location||'auto'),source:Number(p.source||0)});
  const t='<b>🚀 پنل Vex روی چه بستری ساخته شود؟</b>\n\n'+quote('یکی از دو گزینه را انتخاب کن. هر دو بستر یک پنل کامل با دیتابیس D1 اختصاصی می‌سازند و ربات قبل از تحویل، پنل را از نظر خطای 1101 بررسی می‌کند.\n\n⚡️ Worker — دامنه: workers.dev\n📄 Pages — دامنه: pages.dev');
  const kb=KB([[B('⚡️ ساخت روی Worker','bct:worker','','success'),B('📄 ساخت روی Pages','bct:pages','','primary')],[B('⬅️ منو','menu','','primary')]]);
  return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb);
}
async function createPanel(chat,env,msgId,accountId,name='وکس پنل',location='auto',source=0,target=''){target=String(target||'').toLowerCase();if(target!=='worker'&&target!=='pages')return buildTargetChoice(chat,env,msgId,{account_id:accountId,name,location,source});await clearState(env,chat);const domTxt=target==='worker'?'دامنه‌ی workers.dev':'دامنه‌ی Pages';const steps=target==='worker'?['بررسی حساب Cloudflare','دریافت فایل پنل از مخزن GitHub','بررسی هش امنیتی فایل','ساخت دیتابیس D1','ساخت Worker و دیپلوی','بررسی سلامت و تحویل لینک']:['بررسی حساب Cloudflare','دریافت فایل پنل از مخزن GitHub','بررسی هش امنیتی فایل','ساخت دیتابیس D1','ساخت پروژه Pages و دیپلوی','بررسی سلامت و تحویل لینک'];const view=(done,cur)=>'<b>⏳ پنل در حال ساخت است…</b>\n\n'+steps.map((s,i)=>(i<done?'✅ ':(i===cur?'🟡 ':'⬜ '))+s).join('\n')+'\n\n'+quote('لطفاً صبور باشید؛ این مرحله ممکن است کمی زمان ببرد.');const waitKB=KB([[B('⏳ در حال ساخت…','noop','','primary')]]);await edit(chat,msgId,view(0,0),env,waitKB);await sleep(500);const r=await api(env,{action:'new_panel',chat_id:chat,account_id:String(accountId),name:String(name||'وکس پنل'),location:String(location||'auto'),source:String(source||0),target});if(!r.ok){await setState(env,chat,'await_build_retry',{account_id:String(accountId),name:String(name||'وکس پنل'),location:String(location||'auto'),source:Number(source||0),target});return edit(chat,msgId,'<b>❌ ساخت پنل ناموفق بود</b>\n\n'+quote(r.error||'خطای نامشخص')+'\n\n'+quote('ربات قبل از تحویل، پنل را از نظر خطای 1101 بررسی می‌کند؛ این پیام یعنی بعد از چند بار تلاش، سالم نشد. می‌توانی دوباره تلاش کنی.'),env,KB([[B('🔁 تلاش دوباره','bretry','','success')],[B('☁️ حساب‌ها','accounts','','primary')],[B('⬅️ منو','menu','','primary')]]));}for(let i=0;i<steps.length;i++){await edit(chat,msgId,view(i+1,i+1<steps.length?i+1:-1),env,waitKB);await sleep(350);}const warnMsg='<b>⚠️ قبل از تحویل کانفیگ، یک نکته‌ی مهم</b>\n\n'+quote('این سرویس ممکن است روی ایرانسل و بقیه‌ی اپراتورها جواب بدهد، ولی روی همراه اول احتمالاً کار نکند، چون '+domTxt+' روی همراه اول فیلتر شده.\n\nما در حال حل این مشکل هستیم و امیدواریم از سرعت لذت ببری. اگر سرعت ضعیف بود، شرمنده‌ایم؛ اگر خوب بود، ممنون می‌شویم از این پروژه حمایت کنی.');await send(chat,warnMsg,env,null);const qv=r.panel||{},domain=String(qv.domain||'');{const oid=String(env.BOT_OWNER_ID||'');if(oid&&qv.id){let uq=null;try{uq=await env.BOT_DB.prepare('SELECT username,first_name FROM users WHERE chat_id=?').bind(String(chat)).first()}catch(e){}const who=uq?(esc(uq.first_name||'-')+' · @'+esc(uq.username||'-')):'-';const nt='<b>🆕 پنل جدید ساخته شد</b>\n\n'+quote('کاربر: '+who+'\nID: '+esc(chat)+'\nنام پنل: '+esc(qv.name||name)+'\nلوکیشن: '+esc(qv.location||location)+'\nلینک: '+esc(domain));await send(oid,nt,env,KB([[B('🔗 ورود به پنل',null,domain,'success')],[B('👤 مشخصات کاربر','u:'+chat,'','primary'),B('⛔ بند کردن پنل','pban_p:'+qv.id,'','danger')]]));}}return edit(chat,msgId,'<b>🟢 ساخت پنل کامل شد</b>\n\n'+quote('پنل آماده است. از لینک زیر وارد پنل شو.')+'\n<b>نام:</b> '+esc(qv.name||name)+'\n<b>لوکیشن:</b> '+esc(qv.location||location)+'\n\n<b>لینک پنل:</b>\n<code>'+esc(domain)+'</code>'+(qv.password?'\n\n<b>🔑 رمز پنل:</b>\n<code>'+esc(qv.password)+'</code>\n'+quote('رمز را ذخیره کن؛ روی رمز بزن تا کپی شود. بعداً از «⚙️ تنظیمات پنل» هم دیده می‌شود و از داخل پنل هم قابل تغییر است.'):''),env,KB([[B('🚀 ورود به پنل',null,domain,'success')],[B('⚙️ تنظیمات پنل','ps:'+qv.id,'','primary')],[B('⬅️ پنل‌های من','panels','','primary')]]))}
async function panels(chat,env,msgId=null){const r=await api(env,{action:'panels',chat_id:chat});if(!r.ok)return msgId?edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,mainKB(chat,env)):send(chat,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,mainKB(chat,env));const rows=r.panels||[];if(!rows.length){const t='<b>📦 پنل‌های من</b>\n\n'+quote('هنوز پنلی نساختی.');return msgId?edit(chat,msgId,t,env,KB([[B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]])):send(chat,t,env,KB([[B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]]))}const size=8,kb=rows.slice(0,size).map(p=>[B((p.active?'🟢 ':'🔴 ')+String(p.name||('Panel '+p.id)),'panel:'+p.id,'','primary')]);if(rows.length>size)kb.push([B('بعدی ▶️','pnext:1','','primary')]);kb.push([B('🚀 ساخت پنل','build','','success'),B('⬅️ منو','menu','','primary')]);return msgId?edit(chat,msgId,'<b>📦 پنل‌های من</b>\n\nتعداد: <b>'+rows.length+'</b>\nپنل موردنظر را انتخاب کن:',env,KB(kb)):send(chat,'<b>📦 پنل‌های من</b>\n\nتعداد: <b>'+rows.length+'</b>\nپنل موردنظر را انتخاب کن:',env,KB(kb))}
async function panelInfo(chat,env,msgId,id){return panelManage(chat,env,msgId,id)}
async function panelSettings(chat,env,msgId,id){const r=await api(env,{action:'panel_settings',chat_id:chat,id:String(id)});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,KB([[B('⬅️ پنل','panel:'+id,'','primary')]]));const s=r.settings||{},kb=[[B(s.panel?'🟢 پنل روشن':'🔴 پنل خاموش','pset:'+id+':panel:'+(s.panel?0:1),'',s.panel?'danger':'success'),B(s.servers?'🟢 سرورها روشن':'🔴 سرورها خاموش','pset:'+id+':servers:'+(s.servers?0:1),'',s.servers?'danger':'success')],[B(s.ads?'🛡️ ضدتبلیغ روشن':'🛡️ ضدتبلیغ خاموش','pset:'+id+':ads:'+(s.ads?0:1),'','primary'),B('🔧 تغییر سقف اتصال','pset:'+id+':maxconn:'+((s.max_conn||0)>0?0:20),'','primary')],[B('✏️ تغییر نام','rename:'+id,'','primary'),B('🩺 تست سلامت Worker','health:'+id,'','primary')],[B('🔑 رمز پنل','ppw:'+id,'','success')],[B('👥 کاربران','pusers:'+id,'','primary'),B('⬅️ مدیریت پنل','panel:'+id,'','primary')]];return edit(chat,msgId,'<b>⚙️ تنظیمات پیشرفته پنل</b>\n\n'+quote('اینجا کنترل‌های اصلی پنل را بدون خروج از ربات در اختیار داری.')+'\nوضعیت پنل: <b>'+ (s.panel?'روشن':'خاموش')+'</b>\nسرورها: <b>'+ (s.servers?'روشن':'خاموش')+'</b>\nضدتبلیغ: <b>'+ (s.ads?'روشن':'خاموش')+'</b>\nحداکثر اتصال: <b>'+esc(s.max_conn||0)+'</b>\nتعداد کاربران: <b>'+esc(s.users||0)+'</b>',env,KB(kb))}
async function panelPassword(chat,env,msgId,id){const r=await api(env,{action:'panel_password',chat_id:chat,id:String(id)});const kb=KB([[B('⬅️ تنظیمات پنل','ps:'+id,'','primary')]]);if(!r.ok)return edit(chat,msgId,'<b>❌ رمز پیدا نشد</b>\n\n'+quote(r.error||'خطا'),env,kb);return edit(chat,msgId,'<b>🔑 رمز پنل</b>\n\n<code>'+esc(r.password)+'</code>\n\n'+quote('برای کپی، روی رمز بزن. اگر رمز را از داخل پنل عوض کرده باشی، همین‌جا رمز جدید نشان داده می‌شود.'),env,kb)}
async function health(chat,env,msgId,id){const r=await api(env,{action:'panel_health',chat_id:chat,id:String(id)});return edit(chat,msgId,r.ok?('<b>🩺 سلامت پنل</b>\n\n'+quote('اتصال D1 و وضعیت سرویس بررسی شد.')+'\nWorker: <code>'+esc(r.worker||'-')+'</code>\nD1: '+(r.d1?'🟢 متصل':'🔴 نامشخص')+'\nسرویس: '+(r.active?'🟢 فعال':'🔴 خاموش')+'\nکاربران: <b>'+esc(r.users||0)+'</b>'):('<b>❌ خطا</b>\n\n'+esc(r.error||'خطا')),env,KB([[B('🔄 دوباره','health:'+id,'','success')],[B('⚙️ تنظیمات','ps:'+id,'','primary')],[B('⬅️ پنل','panel:'+id,'','primary')]]))}
async function panelUsers(chat,env,msgId,id,page=0){const r=await api(env,{action:'service_users',chat_id:chat,id:String(id)});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,KB([[B('⬅️ پنل','panel:'+id,'','primary')]]));const all=r.users||[],size=8,start=page*size,rows=all.slice(start,start+size),kb=rows.map(u=>[B((u.active?'🟢 ':'🔴 ')+String(u.name||('User '+u.id)),'pu:'+id+':'+u.id,'','primary')]);const nav=[];if(start>0)nav.push(B('◀️ قبلی','pup:'+id+':'+(page-1),'','primary'));if(start+size<all.length)nav.push(B('بعدی ▶️','pup:'+id+':'+(page+1),'','primary'));if(nav.length)kb.push(nav);kb.push([B('🔄 تازه‌سازی','pusers:'+id,'','success'),B('⬅️ پنل','panel:'+id,'','primary')]);return edit(chat,msgId,'<b>👥 کاربران پنل</b>\n\nتعداد: <b>'+all.length+'</b>\nصفحه: <b>'+(page+1)+'</b>',env,KB(kb))}
async function panelUserInfo(chat,env,msgId,pid,uid){const r=await api(env,{action:'service_user_info',chat_id:chat,id:String(pid),user_id:String(uid)});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'کاربر پیدا نشد'),env,KB([[B('⬅️ کاربران','pusers:'+pid,'','primary')]]));const u=r.user||{},cfg=Array.isArray(u.cfgs)?u.cfgs:[],cfgText=cfg.slice(0,6).map(x=>'<code>'+esc(x.link||x.config||x.value||'')+'</code>').join('\n')||'ندارد';return edit(chat,msgId,'<b>👤 مدیریت کاربر پنل</b>\n\nID: <code>'+esc(u.id)+'</code>\nنام: '+esc(u.name)+'\nوضعیت: '+(u.active?'🟢 فعال':'🔴 خاموش')+'\nمصرف: '+esc(u.used_text||'-')+'\nانقضا: '+esc(u.expire_text||'-')+'\n\n<b>کانفیگ‌ها:</b>\n'+cfgText+'\n\n<b>Subscription:</b>\n<code>'+esc(u.sub||'')+'</code>',env,KB([[B(u.active?'🔴 خاموش':'🟢 روشن','put:'+pid+':'+uid+':'+(u.active?0:1),'',u.active?'danger':'success')],[B('🗑 حذف سرویس','pud:'+pid+':'+uid,'','danger')],[B('⬅️ کاربران','pusers:'+pid,'','primary')]]))}
async function botAdmin(chat,env,msgId=null){if(!isOwner(chat,env))return;const r=await api(env,{action:'teacher_bot_status',chat_id:chat});const on=!!r.enabled;const t='<b>🤖 مدیریت ربات</b>\n\n'+quote(on?'ربات برای کاربران فعال است.':'ربات خاموش است و به کاربران عادی پاسخ نمی‌دهد؛ Owner همچنان دسترسی دارد.')+'\nوضعیت: <b>'+(on?'🟢 روشن':'🔴 خاموش')+'</b>\nنسخه: <code>'+esc(r.version||'-')+'</code>\nWorker: <code>'+esc(r.worker||'-')+'</code>\nآخرین بروزرسانی: <code>'+esc(r.updated?new Date(r.updated*1000).toLocaleString('fa-IR'):'-')+'</code>';const kb=KB([[B(on?'⏹ خاموش کردن ربات':'▶️ روشن کردن ربات',on?'botoff':'boton','',on?'danger':'success')],[B('🔄 بروزرسانی Worker','botupdate','','primary')],[B('🛡 عضویت اجباری','forceadmin','','primary'),B('⬅️ ادمین','admin','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}
async function adminForce(chat,env,msgId=null){if(!isOwner(chat,env))return;const r=await api(env,{action:'force_channels',chat_id:chat}),rows=r.channels||[],kb=rows.map((c,i)=>[B((c.enabled?'🟢 ':'🔴 ')+String(c.title||c.url),'forceadm:'+i,'',c.enabled?'success':'primary'),B('🗑','forcedel:'+i,'','danger')]);kb.push([B('➕ افزودن کانال','forceadd','','success')],[B('⬅️ ادمین','admin','','primary')]);const t='<b>🛡 وضعیت اجباری</b>\n\nکانال‌های فعال: <b>'+rows.filter(x=>x.enabled).length+'</b>\nکل کانال‌ها: <b>'+rows.length+'</b>\n\n'+(rows.length?'برای خاموش/روشن‌کردن روی کانال بزن.':'هنوز کانالی ثبت نشده.');return msgId?edit(chat,msgId,t,env,KB(kb)):send(chat,t,env,KB(kb))}
async function adminForcePrompt(chat,env,msgId){if(!isOwner(chat,env))return;await setState(env,chat,'await_force_add');return edit(chat,msgId,'<b>➕ افزودن کانال اجباری</b>\n\nدر یک پیام این فرمت را بفرست:\n<code>CHAT_ID | https://t.me/channel | نام کانال</code>\n\nمثال:\n<code>-1001234567890 | https://t.me/example | DEMON</code>',env,KB([[B('⬅️ عضویت اجباری','forceadmin','','primary')]]))}
async function admin(chat,env,msgId=null){if(!isOwner(chat,env))return;const r=await api(env,{action:'admin_stats',chat_id:chat}),s=r.stats||{};const t='<b>👑 پنل ادمین ربات</b>\n\n'+quote('این بخش فقط برای Owner ID فعال است.')+'\nکاربران: <b>'+esc(s.users||0)+'</b>\nپنل‌ها: <b>'+esc(s.panels||0)+'</b>\nپنل‌های فعال: <b>'+esc(s.active_panels||0)+'</b>\nکاربران پنل: <b>'+esc(s.panel_users||0)+'</b>';const kb=KB([[B('👥 کاربران','admin_users:0','','primary'),B('🛰 همه پنل‌ها','admin_panels:0','','primary')],[B('🤖 وضعیت ربات','botadmin','','success'),B('🛡 عضویت اجباری','forceadmin','','primary')],[B('🔎 جستجوی کاربر','admin_find','','primary'),B('📣 پیام همگانی','broadcast','','success')],[B('⛔ کاربران بن‌شده','banlist:0','','danger')],[B('☁️ اکانت‌های کلودفلر بن‌شده','cfbanlist:0','','danger')],[B('📊 مصرف پنل‌ها (ساعتی و روزانه)','usage','','success')],[B('🩺 سلامت سیستم','admin_health','','primary'),B('🆕 پنل‌های اخیر','recent:60','','success')],[B('📜 لاگ فعالیت','logs','','primary'),B('🧹 پنل‌های قدیمی','oldp:30','','danger')],[B('⚠️ توکن‌های خراب','cfbad','','danger'),B('📣 پیام به فعال‌ها','bcact','','success')],[B('🔥 پرمصرف‌ترین پنل‌ها','topp:all','','success')],[B('🧩 منابع پنل','psrc','','primary')],[B('⬆️ آپدیت پنل اصلی','pmain','','success')],[B('✍️ متن خوش‌آمد /start','welcome_adm','','success'),B('🖼 تصویر استارت','startimg','','primary')],[B('🎛 منوی اصلی و رنگ دکمه‌ها','mcfg','','primary')],[B('🤖 هوش مصنوعی گروه','aicfg','','primary')],[B('📚 بانک سوال و جواب','faqadm','','primary')],[B('☎️ آیدی پشتیبانی','supcfg','','primary'),B('🔎 جستجوی پنل','pnsearch','','primary')],[B('🚀 مقصد دیپلوی پنل','deploy','','primary')],[B('⛔ بنگ کردن پنل کاربر','pban_start','','danger')],[B('⬅️ منو','menu','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}
async function topPanels(chat,env,msgId,period){if(!isOwner(chat,env))return;const per=period==='today'?'today':'all';const r=await api(env,{action:'admin_top_panels',chat_id:chat,period:per});const kb=[];if(!r.ok){kb.push([B('🔄 تلاش دوباره','topp:'+per,'','primary')]);kb.push([B('⬅️ ادمین','admin','','primary')]);return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+esc(r.error||'خطا'),env,KB(kb))}const list=(r.panels||[]).slice(0,10);for(let i=0;i<list.length;i+=2){kb.push(list.slice(i,i+2).map((p,k)=>B((i+k+1)+'. '+String(p.name||('Panel '+p.id)),'apm:'+p.id,'',p.active?'success':'danger')))}kb.push([B(per==='today'?'🌍 کل':'📅 امروز',per==='today'?'topp:all':'topp:today','','primary'),B('🔄 بروزرسانی','topp:'+per,'','primary')]);kb.push([B('🛰 همه‌ی پنل‌ها','admin_panels:0','','primary')]);kb.push([B('⬅️ ادمین','admin','','primary')]);const title=per==='today'?'📅 ۱۰ پنل پرمصرف امروز':'🌍 ۱۰ پنل پرمصرف (کل)';const body=list.length?list.map((p,i)=>(i+1)+'. '+esc(p.name)+' · '+esc(p.users)+' کاربر · '+esc(per==='today'?p.today_text:p.total_text)).join('\n'):'هنوز داده‌ای برای نمایش نیست.';const note=r.partial?'\n\n'+quote('بعضی پنل‌ها هنوز خوانده نشده‌اند؛ چند دقیقه بعد دوباره بروزرسانی کن.'):'';return edit(chat,msgId,'<b>'+title+'</b>\n\n'+body+note+(r.updated?'\n\n<code>آخرین بروزرسانی: '+esc(r.updated)+'</code>':''),env,KB(kb))}
async function pbanUser(chat,env,msgId,target){if(!isOwner(chat,env))return;const r=await api(env,{action:'pban_list',chat_id:chat,target:String(target)});const put=(t,k)=>msgId?edit(chat,msgId,t,env,k):send(chat,t,env,k);if(!r.ok)return put('<b>❌ پیدا نشد</b>\\n\\n'+quote(r.error||'کاربری پیدا نشد.'),KB([[B('🔁 دوباره','pban_start','','primary')],[B('⬅️ ادمین','admin','','primary')]]));const u=r.user||{},ps=r.panels||[];const head='<b>👤 '+esc(u.first_name||u.username||u.chat_id)+'</b>\\nآی‌دی: <code>'+esc(u.chat_id)+'</code>\\nتعداد پنل‌ها: <b>'+ps.length+'</b>';if(!ps.length)return put(head+'\\n\\n'+quote('این کاربر پنلی ندارد.'),KB([[B('⬅️ ادمین','admin','','primary')]]));const kb=ps.slice(0,30).map(p=>[B((p.blocked?'🔒 ':(p.active?'🟢 ':'🔴 '))+String(p.name)+' · #'+p.id,'pban_p:'+p.id,'','primary')]);kb.push([B('⛔ حذف همه‌ی پنل‌ها','pban_allc:'+u.chat_id,'','danger')]);kb.push([B('⬅️ ادمین','admin','','primary')]);return put(head+'\\n\\nیک پنل را انتخاب کن یا همه‌ی پنل‌ها را حذف کن:',KB(kb))}
async function pbanPanelConfirm(chat,env,msgId,pid){if(!isOwner(chat,env))return;return edit(chat,msgId,'<b>⚠️ بنگ کردن پنل #'+esc(pid)+'</b>\\n\\n'+quote('اگر حذف کامل انجام شود، پنل از Cloudflare و دیتابیس پاک و کاربر اطلاع داده می‌شود. اگر حذف ناموفق باشد، دسترسی پنل بسته می‌شود و کاربر نمی‌تواند آن را باز کند.')+'\\n\\nمطمئنی؟',env,KB([[B('⛔ بله، انجام بده','pban_ok:'+pid,'','danger')],[B('⬅️ لغو','admin','','primary')]]))}
async function pbanPanelDo(chat,env,msgId,pid){if(!isOwner(chat,env))return;const r=await api(env,{action:'pban_panel',chat_id:chat,id:pid});return edit(chat,msgId,r.ok?('<b>✅ انجام شد</b>\\n\\n'+quote(r.text||'')):('<b>❌ ناموفق</b>\\n\\n'+quote(r.error||'خطا')),env,KB([[B('⬅️ ادمین','admin','','primary')]]))}
async function pbanAllConfirm(chat,env,msgId,uid){if(!isOwner(chat,env))return;return edit(chat,msgId,'<b>⚠️ حذف همه‌ی پنل‌های کاربر</b>\\n\\n'+quote('همه‌ی پنل‌های این کاربر حذف می‌شوند. هر پنلی که حذف کامل آن ناموفق باشد، دسترسی‌اش بسته می‌شود.')+'\\n\\nمطمئنی؟',env,KB([[B('⛔ بله، همه را انجام بده','pban_allok:'+uid,'','danger')],[B('⬅️ لغو','admin','','primary')]]))}
async function pbanAllDo(chat,env,msgId,uid){if(!isOwner(chat,env))return;const r=await api(env,{action:'pban_user_all',chat_id:chat,target:String(uid)});return edit(chat,msgId,r.ok?('<b>✅ انجام شد</b>\\n\\n'+quote(r.text||'')):('<b>❌ ناموفق</b>\\n\\n'+quote(r.error||'خطا')),env,KB([[B('⬅️ ادمین','admin','','primary')]]))}
async function deployMenu(chat,env,msgId){if(!isOwner(chat,env))return;const r=await api(env,{action:'admin_deploy_get',chat_id:chat});const pg=r.pages?'روشن ✅':'خاموش ⛔️',wk=r.worker?'روشن ✅':'خاموش ⛔️';const t='<b>🚀 مقصد دیپلوی پنل کاربر</b>\n\n'+quote('سورس پنل از «آپدیت پنل اصلی» گرفته می‌شود.')+'\nCloudflare Pages: <b>'+pg+'</b>\nCloudflare Worker: <b>'+wk+'</b>\n\nاگر هر دو روشن باشند، کاربر هر دو لینک را می‌گیرد.';const kb=KB([[B('Pages: '+(r.pages?'خاموش کن':'روشن کن'),'dtg:pages','','primary')],[B('Worker: '+(r.worker?'خاموش کن':'روشن کن'),'dtg:worker','','primary')],[B('⬅️ منو','menu','','primary')]]);return edit(chat,msgId,t,env,kb)}
async function adminHealth(chat,env,msgId){if(!isOwner(chat,env))return;const r=await api(env,{action:'admin_stats',chat_id:chat}),s=r.stats||{};return edit(chat,msgId,'<b>🩺 سلامت سیستم</b>\n\n'+quote('وضعیت کلی سرویس‌ها در همین لحظه.')+'\nکاربران ربات: <b>'+esc(s.users||0)+'</b>\nپنل‌ها: <b>'+esc(s.panels||0)+'</b>\nپنل‌های فعال: <b>'+esc(s.active_panels||0)+'</b>\nکاربران پنل: <b>'+esc(s.panel_users||0)+'</b>\nنسخه ربات: <code>'+esc(env.BOT_VERSION||'5.21.0')+'</code>',env,KB([[B('🔄 بروزرسانی','admin_health','','success')],[B('⬅️ ادمین','admin','','primary')]]))}
async function adminUsers(chat,env,msgId,page=0){if(!isOwner(chat,env))return;const r=await api(env,{action:'admin_users',chat_id:chat}),all=r.users||[],size=8,start=page*size,rows=all.slice(start,start+size),kb=rows.map(u=>[B((u.banned?'⛔ ':'🟢 ')+String(u.first_name||u.username||u.chat_id),'u:'+u.chat_id,'','primary')]);const nav=[];if(start>0)nav.push(B('◀️ قبلی','admin_users:'+(page-1),'','primary'));if(start+size<all.length)nav.push(B('بعدی ▶️','admin_users:'+(page+1),'','primary'));if(nav.length)kb.push(nav);kb.push([B('⬅️ ادمین','admin','','primary')]);return edit(chat,msgId,'<b>👥 کاربران ربات</b>\n\nتعداد: <b>'+all.length+'</b>\nصفحه: <b>'+(page+1)+'</b>',env,KB(kb))}
async function adminPanels(chat,env,msgId,page=0){if(!isOwner(chat,env))return;const r=await api(env,{action:'allpanels',chat_id:chat}),all=r.panels||[],size=8,start=page*size,rows=all.slice(start,start+size),kb=rows.map(p=>[B((p.active?'🟢 ':'🔴 ')+String(p.name)+' · #'+p.id,'admin_panel:'+p.id,'','primary')]);const nav=[];if(start>0)nav.push(B('◀️ قبلی','admin_panels:'+(page-1),'','primary'));if(start+size<all.length)nav.push(B('بعدی ▶️','admin_panels:'+(page+1),'','primary'));if(nav.length)kb.push(nav);kb.push([B('👥 کاربران','admin_users:0','','primary'),B('⬅️ ادمین','admin','','primary')]);return edit(chat,msgId,'<b>🛰 همه پنل‌ها</b>\n\nتعداد: <b>'+all.length+'</b>',env,KB(kb))}
async function adminPanel(chat,env,msgId,id){if(!isOwner(chat,env))return;return panelInfo(chat,env,msgId,id)}
async function userInfo(chat,env,msgId,id){if(!isOwner(chat,env))return;const r=await api(env,{action:'admin_user_info',chat_id:chat,target:String(id)});if(!r.ok)return edit(chat,msgId,'<b>❌ پیدا نشد</b>\n\n'+esc(r.error||''),env,KB([[B('⬅️ ادمین','admin','','primary')]]));const u=r.user||{},rows=(u.panels||[]).slice(0,12).map(p=>'<code>#'+p.id+'</code> '+esc(p.name)+' — '+(p.active?'🟢':'🔴'));return edit(chat,msgId,'<b>👤 مدیریت کاربر</b>\n\nID: <code>'+esc(u.chat_id)+'</code>\nنام: '+esc(u.first_name||'-')+'\nUsername: @'+esc(u.username||'-')+'\nوضعیت: '+(u.banned?'⛔ بن':'🟢 فعال')+'\nتعداد پنل: <b>'+esc(u.panels_count||0)+'</b>\n\n'+rows.join('\n'),env,KB([[B(u.banned?'🟢 آن‌بن':'⛔ بن و حذف همه پنل‌ها',(u.banned?'unban:':'ban:')+u.chat_id,'',u.banned?'success':'danger')],[B('🧹 ریست کامل کاربر','userreset:'+u.chat_id,'','danger')],[B('🛰 پنل‌های کاربر','userpanels:'+u.chat_id,'','primary')],[B('⬅️ کاربران','admin_users:0','','primary')]]))}
async function userResetPrompt(chat,env,msgId,id){if(!isOwner(chat,env))return edit(chat,msgId,'دسترسی ندارید.',env,KB([[B('⬅️ ادمین','admin','','primary')]]));return edit(chat,msgId,'<b>⚠️ ریست کامل کاربر</b>\n\nاین عملیات پنل‌ها، Workerها، D1های مربوط و حساب‌های Cloudflare ثبت‌شده برای این کاربر را از سیستم حذف می‌کند.\n\nکاربر از لیست کاربران حذف نمی‌شود و می‌تواند بعداً از صفر شروع کند.\n\n'+quote('این عملیات برگشت‌پذیر نیست.'),env,KB([[B('⚠️ بله، ریست کن','userresetok:'+id,'','danger')],[B('⬅️ لغو','u:'+id,'','primary')]]))}
async function userPanels(chat,env,msgId,id){const r=await api(env,{action:'admin_user_panels',chat_id:chat,target:String(id)}),rows=r.panels||[],kb=rows.slice(0,30).map(p=>[B((p.active?'🟢 ':'🔴 ')+String(p.name),'admin_panel:'+p.id,'','primary')]);kb.push([B('⬅️ کاربر','u:'+id,'','primary')]);return edit(chat,msgId,'<b>🛰 پنل‌های کاربر</b>\n\nتعداد: <b>'+rows.length+'</b>',env,KB(kb))}
async function broadcastPrompt(chat,env,msgId){if(!isOwner(chat,env))return;await setState(env,chat,'await_broadcast');return edit(chat,msgId,'<b>📣 پیام همگانی</b>\n\nپیام را بفرست یا از کانال فوروارد کن؛ همان پیام بدون هیچ تغییری برای کاربران فوروارد می‌شود.\n\nبرای لغو /cancel را بفرست.',env,KB([[B('⬅️ لغو','admin','','primary')]]))}
async function help(chat,env,msgId=null){const t='<b>📚 راهنمای کامل</b>\n\n'+quote('Cloudflare → Token → حساب → ساخت پنل → تنظیمات → مدیریت کاربران')+'\n\n• اعتبارسنجی Token و تشخیص تکراری\n• انتخاب Account و لوکیشن\n• ساخت Worker و D1 اختصاصی\n• لینک دامنه، Worker و Subscription\n• تنظیمات پنل و سرورها\n• مدیریت کاربران و سرویس‌ها\n• پنل ادمین و مدیریت با ID\n• سلامت Worker و وضعیت حساب';return msgId?edit(chat,msgId,t,env,KB([[B('☁️ حساب‌ها','accounts','','primary'),B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]])):send(chat,t,env,mainKB(chat,env))}
async function security(chat,env){return send(chat,'<b>🛡 امنیت</b>\n\n'+quote('Token را فقط در چت خصوصی با ربات ارسال کن و در گروه‌ها منتشر نکن.')+'\n\n• Owner ID مستقل\n• بررسی اعتبار Token\n• جلوگیری از حساب تکراری\n• کنترل دسترسی ادمین\n• حذف منابع Worker/D1 هنگام بن کاربر',env,KB([[B('⬅️ منو','menu','','primary')]]))}
async function processText(m,env){const chat=String(m.chat.id),text=String(m.text||'').trim();if(text==='/cancel'){await clearState(env,chat);return send(chat,'لغو شد.',env,mainKB(chat,env));}const st=await getState(env,chat);if(await ownerCfgStep(st,chat,env,text))return;if(st?.step==='await_panel_limit'&&isOwner(chat,env)){const n=Number(text.trim());if(!Number.isInteger(n)||n<0)return send(chat,'عدد صحیح بفرست (۰ = نامحدود).',env,null);await kvSetBot(env,'panel_limit',String(n));await clearState(env,chat);return send(chat,'<b>✅ محدودیت ساخت پنل ذخیره شد</b>\n\nسقف: <b>'+(n>0?n+' پنل برای هر کاربر':'نامحدود')+'</b>',env,KB([[B('🧮 تغییر دوباره','panellimit','','primary')],[B('👑 ادمین','admin','','primary')]]))}if(st?.step==='await_welcome'&&isOwner(chat,env)){await clearState(env,chat);const wr=await api(env,{action:'welcome_set',chat_id:chat,text:String(m.text||'')});return send(chat,wr&&wr.ok?'<b>✅ متن خوش‌آمد ذخیره شد</b>\n\n'+quote('از این به بعد بعد از /start همین متن نمایش داده می‌شود.'):'<b>❌ ذخیره نشد</b>',env,KB([[B('✍️ متن خوش‌آمد','welcome_adm','','success')],[B('👑 ادمین','admin','','primary')]]));}if(st?.step==='await_cf'){await send(chat,'<b>🔎 در حال اعتبارسنجی Token…</b>\n\n🟢 دریافت Token\n🟡 بررسی اعتبار\n⬜ بررسی Worker\n⬜ بررسی D1',env,KB([[B('⏳ در حال بررسی…','noop','','primary')]]));const cfv=await cfVerifyToken(text);if(!cfv.ok){return send(chat,'<b>❌ توکن تأیید نشد</b>\n\n'+quote(cfv.error),env,KB([[B('➕ دوباره','addcf','','success')],[B('⬅️ منو','menu','','primary')]]))}const r=await api(env,{action:'add_token',chat_id:chat,token:text});if(r.ok){await clearState(env,chat);return send(chat,'<b>🟢 Token با موفقیت تأیید شد</b>\n\n'+quote('حساب Cloudflare ثبت شد و آماده ساخت پنل است.'),env,KB([[B('🚀 ساخت پنل','build','','success'),B('☁️ حساب‌ها','accounts','','primary')],[B('⬅️ منو','menu','','primary')]]))}if(r.duplicate){await clearState(env,chat);return send(chat,'<b>⚠️ حساب تکراری</b>\n\n'+quote('این حساب قبلاً روی ربات ثبت شده و دوباره ذخیره نشد.'),env,KB([[B('☁️ حساب‌ها','accounts','','primary')],[B('⬅️ منو','menu','','primary')]]))}if(r.need_account){await setState(env,chat,'await_cf_account',{token:text});return send(chat,'<b>ℹ️ Token معتبر است</b>\n\nچند Account پیدا شد؛ Account ID موردنظر را ارسال کن.',env,KB([[B('⬅️ لغو','menu','','primary')]]))}return send(chat,'<b>❌ Token معتبر نیست</b>\n\n'+quote(r.error||'توکن اشتباه یا غیرفعال است.'),env,KB([[B('🔁 تلاش دوباره','addcf','','success'),B('⬅️ منو','menu','','primary')]]))}
if(st?.step==='await_cf_account'){const token=String(st.data?.token||'');await send(chat,'<b>🔎 در حال بررسی Account ID…</b>',env,KB([[B('⏳ در حال بررسی…','noop','','primary')]]));const cfa=await cfVerifyAccount(token,text);if(!cfa.ok){return send(chat,'<b>❌ Account ID تأیید نشد</b>\n\n'+quote(cfa.error),env,KB([[B('➕ دوباره','addcf','','success')],[B('⬅️ منو','menu','','primary')]]))}const r=await api(env,{action:'add_token',chat_id:chat,token,account_id:text});if(r.ok){await clearState(env,chat);return send(chat,'<b>🟢 حساب اضافه شد</b>\n\nحالا ساخت پنل را شروع کن.',env,KB([[B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]]))}return send(chat,'<b>❌ Account ID معتبر نیست</b>\n\n'+esc(r.error||'دوباره تلاش کن.'),env,KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ منو','menu','','primary')]]))}
if(st?.step==='await_panel_name'){const name=text.slice(0,60)||'وکس پنل';return askSource(chat,env,name,st.data?.account_id)}if(st?.step==='await_main_url'&&isOwner(chat,env)){const u=text.trim();if(!/^https:\/\//i.test(u)){return send(chat,'<b>❌ لینک باید با https:// شروع شود.</b>',env,KB([[B('👑 ادمین','admin','','primary')]]))}await clearState(env,chat);const r=await api(env,{action:'main_update',chat_id:chat,repo_url:u});if(!r.ok)return send(chat,'<b>❌ آپدیت پنل اصلی ناموفق</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('🔄 تلاش دوباره','pmain','','success')],[B('👑 ادمین','admin','','primary')]]));return send(chat,'<b>✅ پنل اصلی آپدیت شد</b>\n\n'+quote('هش: '+esc(r.sha256||'')+' · حجم: '+esc(r.size||0)+' بایت'),env,KB([[B('👑 ادمین','admin','','primary')]]))}if(st?.step==='await_ps_url'&&isOwner(chat,env)){const u=text.trim();if(!/^https:\/\//i.test(u)){return send(chat,'<b>❌ لینک باید با https:// شروع شود.</b>\n\nلینک مخزن GitHub پنل را بفرست یا /cancel را بزن.',env,KB([[B('⬅️ منابع پنل','psrc','','primary')]]))}await setState(env,chat,'await_ps_name',{url:u});return send(chat,'<b>✏️ اسم این پنل را بنویس</b>\n\nاین اسم در بخش ساخت پنل برای کاربر نمایش داده می‌شود.',env,KB([[B('⬅️ منابع پنل','psrc','','primary')]]))}if(st?.step==='await_ps_name'&&isOwner(chat,env)){const pname=text.slice(0,40)||'پنل جدید';const url=String(st.data?.url||'');await clearState(env,chat);const r=await api(env,{action:'ps_add',chat_id:chat,name:pname,repo_url:url});if(!r.ok)return send(chat,'<b>❌ افزودن ناموفق</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('➕ تلاش دوباره','psadd','','success')],[B('⬅️ منابع پنل','psrc','','primary')]]));return send(chat,'<b>✅ پنل «'+esc(pname)+'» اضافه شد</b>\n\n'+quote('هش فایل: '+esc(r.sha256||'')+' · حجم: '+esc(r.size||0)+' بایت'),env,KB([[B('🧩 منابع پنل','psrc','','primary')]]))}
if(st?.step==='await_rename'){const id=String(st.data?.id||'');await api(env,{action:'rename_panel',chat_id:chat,id,name:text.slice(0,60)||'وکس پنل'});await clearState(env,chat);return panelSettings(chat,env,null,id)}
if(st?.step==='await_active_broadcast'&&isOwner(chat,env)){await clearState(env,chat);return activeBroadcast(chat,env,text,Number(st.data?.days||7),String(st.data?.location||''));}if(st?.step==='await_broadcast'&&isOwner(chat,env))return doBroadcast(chat,env,text);if(st?.step==='await_force_add'&&isOwner(chat,env)){const parts=text.split('|').map(x=>x.trim());const cid=parts[0]||'',url=parts[1]||'',title=parts.slice(2).join(' | ')||url;if(!/^-?\d{5,20}$/.test(cid)||!/^https:\/\/t\.me\/[^\s]+$/i.test(url))return send(chat,'فرمت اشتباه است.\n\n<code>CHAT_ID | https://t.me/channel | نام کانال</code>',env,KB([[B('⬅️ عضویت اجباری','forceadmin','','primary')]]));const rr=await api(env,{action:'force_channel_add',chat_id:chat,channel:{id:cid,url,title}});if(rr.ok){await clearState(env,chat);return adminForce(chat,env)}return send(chat,'<b>❌ افزودن کانال ناموفق</b>\n\n'+esc(rr.error||'خطا'),env,KB([[B('🔁 تلاش دوباره','forceadd','','success')],[B('⬅️ عضویت اجباری','forceadmin','','primary')]]))}
if(st?.step==='ub_token')return ubCreate(chat,env,String(st.data?.acc||''),text);if(st?.step==='ub_newtok')return ubUpdateToken(chat,env,String(st.data?.id||''),text);if(st?.step==='await_pban_user'&&isOwner(chat,env)){await clearState(env,chat);return pbanUser(chat,env,null,text.trim())}if(st?.step==='await_admin_id'&&isOwner(chat,env)){const id=text.replace(/[^0-9-]/g,'');if(!id)return send(chat,'ID عددی معتبر بفرست.',env,KB([[B('⬅️ ادمین','admin','','primary')]]));return userInfo(chat,env,null,id)}return null}
const UB_FRAMES=['◐','◓','◑','◒'];
async function ubCreate(chat,env,accId,token){
  await clearState(env,chat);
  const first=await send(chat,'<b>'+UB_FRAMES[0]+' در حال ساخت ربات…</b>\n\n'+quote('توکن بررسی می‌شود و Worker و دیتابیس ساخته می‌شوند.'),env,null);
  const msg=first&&first.result?first.result.message_id:null;
  let done=false,i=0;
  const loop=(async()=>{while(!done&&msg){i++;await edit(chat,msg,'<b>'+UB_FRAMES[i%4]+' در حال ساخت ربات'+'.'.repeat((i%3)+1)+'</b>\n\n'+quote('لطفاً چند لحظه صبر کن.'),env,null);await sleep(1200)}})();
  let r;
  try{r=await api(env,{action:'ub_create',chat_id:chat,account_id:accId,bot_token:token})}catch(e){r={ok:false,error:'خطای ارتباط با سرور'}}
  finally{done=true;await loop.catch(()=>{})}
  if(r&&r.ok){const kb=KB([[B('ورود به ربات',null,String(r.url),'success')],[B('🤖 ربات‌های من','ub_list','','primary')],[B('⬅️ منو','menu','','primary')]]);return msg?edit(chat,msg,'<b>✅ ربات شما با موفقیت ساخته شد</b>\n\n'+quote('با دکمهٔ زیر وارد ربات خود شو.'),env,kb):send(chat,'<b>✅ ربات شما با موفقیت ساخته شد</b>',env,kb)}
  const kb2=KB([[B('🔁 تلاش دوباره','ub_menu','','success')],[B('⬅️ منو','menu','','primary')]]);
  return msg?edit(chat,msg,'<b>❌ ساخت ربات ناموفق بود</b>\n\n'+quote((r&&r.error)||'خطا'),env,kb2):send(chat,'<b>❌ ساخت ربات ناموفق بود</b>',env,kb2);
}
async function ubFind(env,chat,id){const r=await api(env,{action:'ub_list',chat_id:chat});return (r.bots||[]).find(x=>String(x.id)===String(id))||null}
async function ubManage(chat,env,b){
  const on=b.status==='on';
  return send(chat,'<b>🤖 مدیریت ربات</b>\n\n'+quote('@'+b.bot_username+' · '+(on?'روشن':'خاموش')),env,KB([
    [B(on?'خاموش کردن':'روشن کردن','ubtg:'+b.id+':'+(on?'0':'1'),'',on?'danger':'success')],
    [B('به‌روزرسانی توکن','ubtok:'+b.id,'','primary'),B('تشخیص ربات','ubdiag:'+b.id,'','primary')],
    [B('حذف ربات','ubdel:'+b.id,'','danger')],
    [B('⬅️ منو','menu','','primary')]]));
}
async function ubOp(op,parts,chat,env){
  if(!['ub_menu','ubacc','ubt','ubtg','ubtok','ubdiag','ubdel','ubdelok'].includes(op))return false;
  const id=String(parts[1]||'');
  if(op==='ub_menu'){
    const r=await api(env,{action:'ub_list',chat_id:chat});
    if((r.bots||[]).length){await ubManage(chat,env,r.bots[0]);return true}
    const a=await api(env,{action:'ub_accounts',chat_id:chat});
    const rows=(a.accounts||[]).map(x=>[B('☁️ حساب '+String(x.account_id||'').slice(0,8),'ubacc:'+x.id,'','primary')]);
    if(!rows.length){await send(chat,'<b>حساب Cloudflare فعالی نداری</b>\n\n'+quote('اول یک حساب Cloudflare اضافه کن، بعد ربات بساز.'),env,KB([[B('➕ افزودن Cloudflare','addcf','','success')],[B('⬅️ منو','menu','','primary')]]));return true}
    rows.push([B('⬅️ منو','menu','','primary')]);
    await send(chat,'<b>🤖 ساخت ربات</b>\n\n'+quote('حسابی را که ربات روی آن اجرا شود انتخاب کن.'),env,KB(rows));return true;
  }
  if(op==='ubacc'){await setState(env,chat,'ub_token',{acc:id});await send(chat,'<b>🔑 توکن ربات</b>\n\n'+quote('توکن ربات را از @BotFather بگیر و همین‌جا بفرست.'),env,KB([[B('⬅️ منو','menu','','primary')]]));return true}
  if(op==='ubt'){const b=await ubFind(env,chat,id);if(b)await ubManage(chat,env,b);else await send(chat,'<b>ربات پیدا نشد.</b>',env,KB([[B('⬅️ منو','menu','','primary')]]));return true}
  if(op==='ubtg'){const r=await api(env,{action:'ub_toggle',chat_id:chat,id,on:parts[2]==='1'});const b=await ubFind(env,chat,id);await send(chat,r&&r.ok?'<b>✅ وضعیت ربات تغییر کرد.</b>':'<b>❌ '+esc((r&&r.error)||'خطا')+'</b>',env,null);if(b)await ubManage(chat,env,b);return true}
  if(op==='ubtok'){await setState(env,chat,'ub_newtok',{id});await send(chat,'<b>🔑 توکن جدید ربات</b>\n\n'+quote('توکن جدید را از @BotFather بفرست.'),env,KB([[B('⬅️ منو','menu','','primary')]]));return true}
  if(op==='ubdiag'){const r=await api(env,{action:'ub_diag',chat_id:chat,id});await send(chat,r&&r.ok?'<b>🧪 تشخیص ربات</b>\n\n'+quote(r.text):'<b>❌ '+esc((r&&r.error)||'خطا')+'</b>',env,KB([[B('⬅️ منو','menu','','primary')]]));return true}
  if(op==='ubdel'){await send(chat,'<b>حذف ربات؟</b>\n\n'+quote('Worker و دیتابیس ربات حذف می‌شوند و این کار برگشت‌پذیر نیست.'),env,KB([[B('بله، حذف کن','ubdelok:'+id,'','danger'),B('انصراف','menu','','primary')]]));return true}
  if(op==='ubdelok'){const r=await api(env,{action:'ub_delete',chat_id:chat,id});await send(chat,r&&r.ok?'<b>🗑 ربات حذف شد.</b>':'<b>❌ '+esc((r&&r.error)||'خطا')+'</b>',env,KB([[B('⬅️ منو','menu','','primary')]]));return true}
  return false;
}
async function ubUpdateToken(chat,env,id,token){
  await clearState(env,chat);
  const r=await api(env,{action:'ub_update_token',chat_id:chat,id,bot_token:token});
  if(!(r&&r.ok))return send(chat,'<b>❌ '+esc((r&&r.error)||'خطا')+'</b>',env,KB([[B('⬅️ منو','menu','','primary')]]));
  const b=await ubFind(env,chat,id);return send(chat,'<b>✅ توکن ربات به‌روز شد.</b>',env,null).then(()=>b?ubManage(chat,env,b):null);
}
async function updOp(op,parts,chat,env){
  if(op==='updskip'){await send(chat,'<b>روی نسخهٔ فعلی می‌مانی.</b>\n\n'+quote('هر زمان خواستی می‌توانی پنلت را به‌روز کنی.'),env,null);return true}
  if(op!=='upd')return false;
  const id=String(parts[1]||''),frames=['◐','◓','◑','◒'];
  const first=await send(chat,'<b>'+frames[0]+' در حال به‌روزرسانی پنل…</b>',env,null);
  const msg=first&&first.result?first.result.message_id:null;
  let done=false,i=0;
  const loop=(async()=>{while(!done&&msg){i++;await edit(chat,msg,'<b>'+frames[i%4]+' در حال به‌روزرسانی پنل'+'.'.repeat((i%3)+1)+'</b>',env,null);await sleep(1200)}})();
  let r;try{r=await api(env,{action:'panel_update',chat_id:chat,id})}catch(e){r={ok:false,error:'خطای ارتباط'}}finally{done=true;await loop.catch(()=>{})}
  const t=r&&r.ok?'<b>✅ پنل شما به‌روز شد.</b>\n\n'+quote(r.text||''):'<b>❌ به‌روزرسانی ناموفق</b>\n\n'+quote((r&&r.error)||'خطا');
  if(msg)await edit(chat,msg,t,env,null);else await send(chat,t,env,null);
  return true;
}
const PSPIN=['◐','◓','◑','◒'];
async function pSpin(chat,env,msgId,labels,work){let msg=msgId||null;if(!msg){const first=await send(chat,'<b>'+PSPIN[0]+' '+labels[0]+'</b>',env,null);msg=first&&first.result?first.result.message_id:null}let done=false,i=0;const loop=(async()=>{while(!done&&msg){i++;const li=Math.min(Math.floor(i/3),labels.length-1);await edit(chat,msg,'<b>'+PSPIN[i%4]+' '+labels[li]+'</b>',env,null);await sleep(1200)}})();let r;try{r=await work()}catch(e){r={ok:false,error:'خطای ارتباط'}}finally{done=true;await loop.catch(()=>{})}return {r,msg}}
async function pFinal(chat,msg,env,text,kb){return msg?edit(chat,msg,text,env,kb):send(chat,text,env,kb)}
const PRST_FRAMES=['◐','◓','◑','◒'];
async function panelNameOf(chat,env,pid){try{const lp=await api(env,{action:'my_panels',chat_id:chat});const p=(lp.panels||[]).find(x=>String(x.id)===String(pid));return p?p.name:'پنل';}catch(e){return 'پنل';}}
async function prStep(chat,env,msg,label,fn){
  let done=false,i=0;
  const loop=(async()=>{while(!done&&msg){i++;await edit(chat,msg,'<b>'+PRST_FRAMES[i%4]+' '+label+'</b>',env,null);await sleep(1200);}})();
  let r;try{r=await fn();}catch(e){r={ok:false,error:'خطای ارتباط با سرور'};}finally{done=true;await loop.catch(()=>{});}
  return r;
}
async function panelRestart(chat,env,pid){
  const name=await panelNameOf(chat,env,pid);
  const first=await send(chat,'<b>'+PRST_FRAMES[0]+' در حال ریستارت پنل «'+esc(name)+'»…</b>',env,null);
  const msg=first&&first.result?first.result.message_id:null;
  const fail=(t)=>pFinal(chat,msg,env,'<b>❌ ریستارت ناموفق بود</b>\n\n'+quote(t)+'\n\nپنل قبلی بدون تغییر باقی ماند.',KB([[B('🔄 تلاش دوباره','prst:'+pid,'','primary')],[B('⬅️ پنل‌ها','panels','','primary')]]));
  const r1=await prStep(chat,env,msg,'در حال بررسی پنل و دیتابیس «'+esc(name)+'»…',()=>api(env,{action:'panel_restart_check',chat_id:chat,id:pid}));
  if(!r1||!r1.ok)return fail((r1&&r1.error)||'بررسی پنل ناموفق بود.');
  const r2=await prStep(chat,env,msg,'در حال دریافت آخرین سورس و دیپلوی روی Worker…',()=>api(env,{action:'panel_restart_worker',chat_id:chat,id:pid}));
  if(!r2||!r2.ok)return fail((r2&&r2.error)||'دیپلوی Worker ناموفق بود.');
  const r3=await prStep(chat,env,msg,'در حال ثبت نسخه‌ی جدید…',()=>api(env,{action:'panel_restart_finish',chat_id:chat,id:pid}));
  if(!r3||!r3.ok)return fail((r3&&r3.error)||'ثبت نسخه ناموفق بود.');
  const lp=await api(env,{action:'my_panels',chat_id:chat});
  const p=(lp.panels||[]).find(x=>String(x.id)===String(pid));
  const kb=KB([p&&p.worker?[B('ورود به پنل',null,String(p.worker),'success')]:null,[B('⬅️ پنل‌ها','panels','','primary')]]);
  return pFinal(chat,msg,env,'<b>✅ پنل «'+esc(name)+'» با موفقیت ریستارت شد</b>\n\n'+quote(r2.text||'آخرین نسخه دیپلوی شد.'),kb);
}
async function panelExtraOp(op,parts,chat,env,msgId){
  if(!['pdom','pdomacc','pdz','p2fa','p2fx','del','pacc','prst'].includes(op))return false;
  const pid=String(parts[1]||'');
  if(op==='prst'){await panelRestart(chat,env,pid);return true;}
  if(op==='del'){
    const dname=esc(await panelNameOf(chat,env,pid));const {r,msg}=await pSpin(chat,env,msgId,['در حال توقف پنل «'+dname+'»…','در حال حذف Worker و Pages پنل «'+dname+'»…','در حال حذف دیتابیس پنل «'+dname+'»…','در حال پاک‌سازی اطلاعات پنل «'+dname+'»…'],()=>api(env,{action:'delete_panel',chat_id:chat,id:pid}));
    if(r&&r.ok)await pFinal(chat,msg,env,'<b>✅ پنل با موفقیت حذف شد</b>\\n\\n'+quote('همهٔ منابع این پنل در Cloudflare پاک شدند.'),KB([[B('📦 پنل‌های من','panels','','primary')]]));
    else await pFinal(chat,msg,env,'<b>❌ حذف پنل کامل نشد</b>\\n\\n'+quote((r&&(r.error||r.text))||'خطا')+'\\n\\nپنل هنوز در لیست است؛ می‌توانی دوباره تلاش کنی.',KB([[B('🗑 حذف دوباره','del:'+pid,'','danger')],[B('⬅️ پنل‌ها','panels','','primary')]]));
    return true;
  }
  if(op==='pdom'){
    const r=await api(env,{action:'accounts',chat_id:chat});
    const accs=(r.accounts||[]).filter(a=>a.status==='ok');
    if(!accs.length){await edit(chat,msgId,'<b>❌ اکانت فعالی پیدا نشد</b>\\n\\n'+quote('اول یک اکانت Cloudflare معتبر اضافه کن.'),env,KB([[B('⬅️ پنل','pm:'+pid,'','primary')]]));return true}
    await edit(chat,msgId,'<b>🌐 اتصال دامنه به پنل</b>\\n\\n'+quote('یکی از حساب‌های Cloudflare ثبت‌شدهٔ خودت را انتخاب کن که دامنه‌ات روی آن ثبت شده است.'),env,KB([...accs.map(a=>[B(a.label||a.account_name||('#'+a.id),'pdomacc:'+pid+':'+a.id,'','primary')]),[B('⬅️ پنل','pm:'+pid,'','primary')]]));
    return true;
  }
  if(op==='pdomacc'){
    const acc=String(parts[2]||'');
    const {r,msg}=await pSpin(chat,env,msgId,['در حال بررسی حساب Cloudflare…','در حال بررسی اینکه دامنه روی این حساب ثبت شده یا نه…','در حال گرفتن فهرست دامنه‌ها…'],()=>api(env,{action:'panel_domain_zones',chat_id:chat,id:pid,account:acc}));
    if(!r||!r.ok){await pFinal(chat,msg,env,'<b>❌ بررسی ناموفق بود</b>\\n\\n'+quote((r&&r.error)||'خطا'),KB([[B('🔁 حساب دیگر','pdom:'+pid,'','primary')],[B('⬅️ پنل','pm:'+pid,'','primary')]]));return true}
    const ds=r.domains||[];
    if(!ds.length){await pFinal(chat,msg,env,'<b>❌ دامنه‌ای روی این حساب پیدا نشد</b>\\n\\n'+quote('دامنه‌ات را روی همین حساب Cloudflare ثبت کن، یا حساب دیگری را انتخاب کن.'),KB([[B('🔁 حساب دیگر','pdom:'+pid,'','primary')],[B('⬅️ پنل','pm:'+pid,'','primary')]]));return true}
    await pFinal(chat,msg,env,'<b>✅ دامنه روی این حساب ثبت شده است</b>\\n\\n'+quote('یکی از دامنه‌ها را انتخاب کن تا به پنل متصل شود.'),KB([...ds.slice(0,30).map(d=>[B(d.name,'pdz:'+pid+':'+acc+':'+d.id,'','primary')]),[B('⬅️ پنل','pm:'+pid,'','primary')]]));
    return true;
  }
  if(op==='pdz'){
    const acc=String(parts[2]||''),zone=String(parts[3]||'');
    const {r,msg}=await pSpin(chat,env,msgId,['در حال اتصال دامنه به پنل…','در حال ثبت دامنه در Cloudflare…','این مرحله ممکن است چند دقیقه طول بکشد…'],()=>api(env,{action:'panel_domain_connect',chat_id:chat,id:pid,account:acc,zone}));
    if(r&&r.ok)await pFinal(chat,msg,env,'<b>✅ دامنه با موفقیت به پنل متصل شد</b>\\n\\n'+quote('دامنه: '+(r.domain||'')+'\\nانتشار DNS و SSL ممکن است تا چند دقیقه طول بکشد.'),KB([[B('🚀 ورود به پنل',null,String(r.url||''),'success')],[B('⬅️ پنل‌ها','panels','','primary')]]));
    else await pFinal(chat,msg,env,'<b>❌ اتصال دامنه ناموفق بود</b>\\n\\n'+quote((r&&r.error)||'خطا'),KB([[B('🔁 تلاش دوباره','pdom:'+pid,'','primary')],[B('⬅️ پنل','pm:'+pid,'','primary')]]));
    return true;
  }
  if(op==='p2fa'){
    const {r,msg}=await pSpin(chat,env,msgId,['در حال ساخت کلید 2FA…','در حال آماده‌سازی پنل…'],()=>api(env,{action:'panel_2fa_setup',chat_id:chat,id:pid}));
    if(!r||!r.ok){await pFinal(chat,msg,env,'<b>❌ فعال‌سازی 2FA ناموفق بود</b>\\n\\n'+quote((r&&r.error)||'خطا'),KB([[B('⬅️ پنل','pm:'+pid,'','primary')]]));return true}
    await setState(env,chat,'p2fa_code',{pid});
    await pFinal(chat,msg,env,'<b>🔐 فعال‌سازی تأیید دو مرحله‌ای</b>\\n\\n'+quote('این کلید را در Google Authenticator یا هر برنامهٔ TOTP اضافه کن:')+'\\n\\n<code>'+esc(r.secret)+'</code>\\n\\nبعد از اضافه کردن، کد ۶ رقمی برنامه را همین‌جا بفرست.',KB([[B('⬅️ لغو','p2fx:'+pid,'','danger')]]));
    return true;
  }
  if(op==='pacc'){
    const on=String(parts[2]||'')==='1';
    const {r,msg}=await pSpin(chat,env,msgId,[on?'در حال باز کردن دسترسی پنل…':'در حال قطع دسترسی پنل…','در حال اعمال تغییر روی Cloudflare…'],()=>api(env,{action:'panel_access',chat_id:chat,id:pid,on}));
    if(r&&r.ok)await pFinal(chat,msg,env,'<b>'+esc(r.text||'انجام شد')+'</b>'+(r.partial?'\\n\\n'+quote('بعضی از منابع اعمال نشد؛ دوباره امتحان کن.'):''),KB([[B('🎛 پنل','pm:'+pid,'','primary')]]));
    else await pFinal(chat,msg,env,'<b>❌ تغییر دسترسی ناموفق بود</b>\\n\\n'+quote((r&&r.error)||'خطا'),KB([[B('🔁 دوباره','pacc:'+pid+':'+(on?'1':'0'),'','primary')],[B('🎛 پنل','pm:'+pid,'','primary')]]));
    return true;
  }
  if(op==='p2fx'){await clearState(env,chat);await edit(chat,msgId,'<b>🔐 فعال‌سازی 2FA لغو شد.</b>',env,KB([[B('⬅️ پنل','pm:'+pid,'','primary')]]));return true}
  return false;
}
async function panelMgrOp(op,parts,chat,env){
  if(!['panels','pm','pmupd','pmupdok','pvann','pvall'].includes(op))return false;
  const id=String(parts[1]||'');
  if(op==='panels'||op==='pm'){
    const r=await api(env,{action:'my_panels',chat_id:chat});
    const list=r.panels||[];
    if(op==='panels'){
      if(!list.length){await send(chat,'<b>هنوز پنلی نساخته‌ای.</b>',env,KB([[B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]]));return true}
      const rows=list.map(p=>[B(p.name+(p.outdated?' · نیاز به آپدیت':''),'pm:'+p.id,'',p.outdated?'danger':'primary')]);
      rows.push([B('⬅️ منو','menu','','primary')]);
      await send(chat,'<b>📦 پنل‌های من</b>\n\n'+quote('یک پنل را انتخاب کن.'),env,KB(rows));return true;
    }
    const p=list.find(x=>String(x.id)===id);
    if(!p){await send(chat,'<b>پنل پیدا نشد.</b>',env,KB([[B('📦 پنل‌های من','panels','','primary')]]));return true}
    const rows=[];
    if(p.outdated){rows.push([B('🔄 آپدیت پنل','pmupd:'+p.id,'','danger')]);}
    else{
      if(p.worker)rows.push([B('🚀 ورود به پنل',null,String(p.worker),'success')]);if(p.worker)rows.push([B('🔄 ریستارت پنل','prst:'+p.id,'','primary')]);
      if(!String(p.id).startsWith('v'))rows.push([B('⚙️ تنظیمات پنل','ps:'+p.id,'','primary')],[B('👥 کاربران پنل','pusers:'+p.id,'','primary')]);
    }
    rows.push([B('🌐 اتصال دامنه به پنل','pdom:'+p.id,'','primary')],[B('🔐 فعال‌سازی 2FA','p2fa:'+p.id,'','success')],[B('🔓 باز کردن دسترسی','pacc:'+p.id+':1','','success'),B('🔒 قطع دسترسی','pacc:'+p.id+':0','','danger')]);
    rows.push([B('🗑 حذف پنل','del:'+p.id,'','danger')]);
    rows.push([B('⬅️ پنل‌ها','panels','','primary')]);
    await send(chat,'<b>🎛 '+esc(p.name)+'</b>\n\n'+quote('نسخهٔ فعلی: '+(p.version||'—')+'\nنسخهٔ جدید: '+esc(r.current||'—')+'\nوضعیت: '+(p.outdated?'نیاز به آپدیت':'به‌روز')),env,KB(rows));return true;
  }
  if(op==='pbundle'||op==='pusage'){const r=await api(env,{action:op==='pbundle'?'panel_bundle':'panel_usage',chat_id:chat,id});if(!r||!r.ok)return send(chat,'<b>❌ خطا</b>\n\n'+quote((r&&r.error)||'خطا'),env,KB([[B('⬅️ پنل‌ها','panels','','primary')]]));if(op==='pbundle')return send(chat,'<b>🧩 ساب یکپارچه</b>\n\n'+quote('این لینک همه‌ی کاربران این پنل را در یک ساب دارد. در برنامه‌ی V2 آن را وارد کن.')+'\n\n<code>'+String(r.url).replace(/</g,'&lt;')+'</code>',env,KB([[B('⬅️ پنل‌ها','panels','','primary')]]));return send(chat,'<b>📊 مصرف پنل</b>\n\n'+quote('کاربران: '+r.users+'\nحجم مصرف‌شده: '+r.used_gb+' گیگ\nریکوست مصرف‌شده: '+r.req_used+' از '+r.req_limit),env,KB([[B('⬅️ پنل‌ها','panels','','primary')]]))}
  if(op==='puser'){await setState(env,chat,'pu_name',{pid:id});return send(chat,'<b>➕ ساخت کاربر</b>\n\n'+quote('نام کاربر را بفرست.'),env,KB([[B('⬅️ لغو','panels','','primary')]]))}
  if(op==='pmupd'){
    const r=await api(env,{action:'my_panels',chat_id:chat});
    await send(chat,'<b>آیا از آپدیت پنل به نسخهٔ '+esc(r.current||'جدید')+' مطمئنی؟</b>',env,KB([[B('بله','pmupdok:'+id,'','success'),B('خیر','pm:'+id,'','danger')]]));return true;
  }
  if(op==='pmupdok'){
    const frames=['◐','◓','◑','◒'];
    const first=await send(chat,'<b>'+frames[0]+' در حال آپدیت پنل…</b>',env,null);
    const msg=first&&first.result?first.result.message_id:null;
    let done=false,i=0;
    const loop=(async()=>{while(!done&&msg){i++;await edit(chat,msg,'<b>'+frames[i%4]+' در حال آپدیت پنل'+'.'.repeat((i%3)+1)+'</b>',env,null);await sleep(1200)}})();
    let r;try{r=await api(env,{action:'panel_update',chat_id:chat,id})}catch(e){r={ok:false,error:'خطای ارتباط'}}finally{done=true;await loop.catch(()=>{})}
    let kb=KB([[B('⬅️ پنل‌ها','panels','','primary')]]);
    if(r&&r.code==='db_missing')kb=KB([[B('🗑 حذف پنل','del:'+id,'','danger')],[B('⬅️ پنل‌ها','panels','','primary')]]);
    if(r&&r.ok){const lp=await api(env,{action:'my_panels',chat_id:chat});const p=(lp.panels||[]).find(x=>String(x.id)===id);if(p&&p.worker)kb=KB([[B('ورود به پنل',null,String(p.worker),'success')],[B('⬅️ پنل‌ها','panels','','primary')]]);}
    const t=r&&r.ok?'<b>✅ پنل شما موفقانه آپدیت شد.</b>\n\n'+quote('حالا می‌توانی وارد پنل شوی.'):'<b>❌ آپدیت ناموفق بود</b>\n\n'+quote((r&&r.error)||'خطا');
    if(msg)await edit(chat,msg,t,env,kb);else await send(chat,t,env,kb);
    return true;
  }
  if(op==='pvann'||op==='pvall'){
    if(!isOwner(chat,env))return true;
    const r=await api(env,{action:op==='pvann'?'pv_announce':'pv_update_all',chat_id:chat});
    await send(chat,r&&r.ok?'<b>✅ انجام شد</b>\n\n'+quote(r.text||''):'<b>❌ '+esc((r&&r.error)||'خطا')+'</b>',env,KB([[B('👑 ادمین','admin','','primary')]]));return true;
  }
  return false;
}
async function recentPanels(chat,env,msgId,mins=60){if(!isOwner(chat,env))return;const r=await api(env,{action:'recent_panels',chat_id:chat,minutes:mins});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));const all=r.panels||[];const head='<b>🆕 پنل‌های ساخته‌شده در '+esc(mins)+' دقیقه اخیر</b>\n\n'+quote('تعداد: '+all.length+' — برای دیدن جزئیات و مدیریت، روی پنل بزن.');const kb=all.slice(0,20).map(p=>[B('#'+p.id+' · '+(p.owner_name||p.owner_username||p.owner_chat)+' · '+p.name,'rp:'+p.id,'','primary')]);if(!all.length)kb.push([B('هیچ پنلی در این بازه ساخته نشده','noop','','primary')]);kb.push([B('🔄 بروزرسانی','recent:'+mins,'','success'),B('⏱ ۶۰ دقیقه','recent:60','','primary'),B('⏱ ۱ روز','recent:1440','','primary')]);kb.push([B('⬅️ ادمین','admin','','primary')]);return edit(chat,msgId,head,env,KB(kb))}
function panelDetailText(p){return '<b>🎛 پنل #'+esc(p.id)+'</b>\n\n'+quote('اطلاعات کامل پنل و سازنده‌اش')+'\nنام پنل: <b>'+esc(p.name)+'</b>\nلوکیشن: '+esc(p.location)+'\nوضعیت: '+(p.active?'🟢 فعال':'🔴 غیرفعال')+'\nساخته‌شده: <code>'+esc(p.created_text)+'</code>\n\n<b>👤 سازنده</b>\nنام: '+esc(p.owner_name||'-')+'\nیوزرنیم: '+(p.owner_username?'@'+esc(p.owner_username):'-')+'\nآی‌دی: <code>'+esc(p.owner_chat)+'</code>\nوضعیت کاربر: '+(p.owner_banned?'⛔ بن':'🟢 فعال')+'\n\n<b>🔗 مشخصات فنی</b>\nدامنه پنل: <code>'+esc(p.domain)+'</code>\nWorker: <code>'+esc(p.worker)+'</code>\nلینک ساب: <code>'+esc(p.sub)+'</code>\nHost: <code>'+esc(p.host)+'</code>\nنام Worker/Pages: <code>'+esc(p.worker_name)+'</code>\nحساب Cloudflare: <code>'+esc(p.account_id)+'</code>\nD1: <code>'+esc(p.d1_id)+'</code>\nتعداد نود: '+esc(p.nodes)+'\nتوکن پنل: <code>'+esc(p.token)+'</code>'}
async function recentPanelInfo(chat,env,msgId,id){if(!isOwner(chat,env))return;const r=await api(env,{action:'recent_panel_info',chat_id:chat,id:id});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ پنل‌های اخیر','recent:60','','primary')]]));const p=r.panel;return edit(chat,msgId,panelDetailText(p),env,KB([[B('⛔ بن پنل و کاربر (حذف کامل)','rpban:'+p.id,'','danger')],[B('🗑 فقط حذف پنل','pdel:'+p.id,'','danger')],[B('👤 مدیریت کاربر','u:'+p.owner_chat,'','primary')],[B('🔄 بروزرسانی','rp:'+p.id,'','success')],[B('⬅️ پنل‌های اخیر','recent:60','','primary')]]))}
async function recentPanelBanConfirm(chat,env,msgId,id){if(!isOwner(chat,env))return;return edit(chat,msgId,'<b>⚠️ بن پنل و کاربر</b>\n\n'+quote('پنل از Cloudflare (Worker/Pages و D1) و از دیتابیس حذف می‌شود، سازنده از ربات بن می‌شود و پنل‌های دیگرش هم طبق قانون بن کاربر حذف می‌شوند. این کار برگشت‌پذیر نیست.')+'\n\nمطمئنی؟',env,KB([[B('⛔ بله، بن کن','rpbanok:'+id,'','danger')],[B('⬅️ لغو','rp:'+id,'','primary')]]))}
async function recentPanelBanOk(chat,env,msgId,id){if(!isOwner(chat,env))return;const r=await api(env,{action:'panel_ban',chat_id:chat,id:id});if(!r.ok)return edit(chat,msgId,'<b>❌ بن ناموفق</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('🔄 تلاش دوباره','rpbanok:'+id,'','danger')],[B('⬅️ پنل‌های اخیر','recent:60','','primary')]]));return edit(chat,msgId,'<b>⛔ پنل بن و حذف شد</b>\n\n'+quote(r.text||'انجام شد'),env,KB([[B('🆕 پنل‌های اخیر','recent:60','','primary')],[B('⬅️ ادمین','admin','','primary')]]))}
async function recentOp(op,parts,chat,env,msgId){if(!['recent','rp','rpban','rpbanok','noop'].includes(op))return false;if(op==='noop')return true;if(!isOwner(chat,env))return true;const id=String(parts[1]||'');if(op==='recent')await recentPanels(chat,env,msgId,Number(id||60));else if(op==='rp')await recentPanelInfo(chat,env,msgId,id);else if(op==='rpban')await recentPanelBanConfirm(chat,env,msgId,id);else await recentPanelBanOk(chat,env,msgId,id);return true}
async function botLogs(chat,env,msgId){if(!isOwner(chat,env))return;const r=await api(env,{action:'bot_logs',chat_id:chat});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));const rows=(r.logs||[]).map(l=>'• '+esc(new Date(Number(l.ts)*1000).toLocaleString('en-GB',{timeZone:'Asia/Tehran',hour12:false}))+' — <b>'+esc(l.action)+'</b> — '+esc(l.actor)+(l.target?' → '+esc(l.target):'')+(l.detail?'\n   '+esc(l.detail):'')).join('\n');return edit(chat,msgId,'<b>📜 لاگ فعالیت‌ها</b> (آخرین ۱۵ مورد)\n\n'+(rows||quote('هنوز فعالیتی ثبت نشده.')),env,KB([[B('🔄 بروزرسانی','logs','','success')],[B('⬅️ ادمین','admin','','primary')]]))}
async function oldPanelsMenu(chat,env,msgId,days=30){if(!isOwner(chat,env))return;const r=await api(env,{action:'old_panels_info',chat_id:chat,days:days});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));return edit(chat,msgId,'<b>🧹 پنل‌های قدیمی</b>\n\n'+quote('پنل‌های قدیمی‌تر از '+r.days+' روز، کامل از Cloudflare و دیتابیس حذف می‌شوند (هر بار ۱۰ تا).')+'\nتعداد: <b>'+esc(r.count)+'</b>',env,KB([[B('🗑 حذف ۱۰ تای قدیمی','oldpdel:'+days+':0','','danger')],[B('۷ روز','oldp:7','','primary'),B('۳۰ روز','oldp:30','','primary'),B('۹۰ روز','oldp:90','','primary')],[B('⬅️ ادمین','admin','','primary')]]))}
async function oldPanelsConfirm(chat,env,msgId,days,after){if(!isOwner(chat,env))return;return edit(chat,msgId,'<b>⚠️ حذف پنل‌های قدیمی</b>\n\n'+quote('۱۰ پنل قدیمی‌تر از '+days+' روز (بعد از شناسه '+after+') حذف می‌شوند. این کار برگشت‌پذیر نیست.'),env,KB([[B('⛔ بله، حذف کن','oldpdelok:'+days+':'+after,'','danger')],[B('⬅️ لغو','oldp:'+days,'','primary')]]))}
async function oldPanelsDelete(chat,env,msgId,days,after){if(!isOwner(chat,env))return;const r=await api(env,{action:'old_panels_delete',chat_id:chat,days:days,after:after});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));const more=r.remaining>0&&r.last_id;return edit(chat,msgId,'<b>🧹 نتیجه</b>\n\n'+quote('حذف شد: '+r.deleted+' · ناموفق: '+r.failed+' · باقی‌مانده: '+r.remaining),env,KB([...(more?[[B('▶️ ۱۰ تای بعدی','oldpdel:'+days+':'+r.last_id,'','danger')]]:[]),[B('⬅️ ادمین','admin','','primary')]]))}
async function cfBadMenu(chat,env,msgId){if(!isOwner(chat,env))return;const r=await api(env,{action:'cf_bad_accounts',chat_id:chat});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));const all=r.accounts||[];const body=all.length?all.map(a=>'• #'+a.id+' '+esc(a.label)+' — '+esc(a.status)+(a.err?'\n   '+esc(a.err):'')+(a.owner_chat?'\n   کاربر: <code>'+esc(a.owner_chat)+'</code>':'')).join('\n'):quote('همه‌ی توکن‌ها سالم هستند ✅');const kb=all.filter(a=>a.owner_chat).slice(0,8).map(a=>[B('👤 کاربر #'+a.id,'u:'+a.owner_chat,'','primary')]);kb.push([B('🔄 بروزرسانی','cfbad','','success')]);kb.push([B('⬅️ ادمین','admin','','primary')]);return edit(chat,msgId,'<b>⚠️ توکن‌های Cloudflare خراب</b>\n\n'+body,env,KB(kb))}
async function bcActivePrompt(chat,env,msgId){if(!isOwner(chat,env))return;return edit(chat,msgId,'<b>📣 پیام به کاربران فعال</b>\n\nگیرنده‌ها را انتخاب کن. (حداکثر ۴۰۰ نفر در هر ارسال، فقط کاربران ۷ روز اخیر)',env,KB([[B('👥 همه‌ی فعال‌ها','bcgo:all','','success')],[B('🌍 فقط یک لوکیشن','bcloc','','primary')],[B('⬅️ ادمین','admin','','primary')]]))}
async function bcLocPick(chat,env,msgId){if(!isOwner(chat,env))return;const r=await api(env,{action:'bc_locations',chat_id:chat});if(!r.ok)return edit(chat,msgId,'<b>❌ خطا</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));const L=r.locations||[];const kb=[];for(let i=0;i<L.length;i+=2){kb.push(L.slice(i,i+2).map(x=>B(x.name,'bcgo:'+x.code,'','primary')))}kb.push([B('⬅️ برگشت','bcact','','primary')]);return edit(chat,msgId,'<b>🌍 انتخاب لوکیشن</b>\n\nکاربرانی که پنل در این لوکیشن دارند گیرنده می‌شوند.',env,KB(kb))}
async function bcGo(chat,env,msgId,code){if(!isOwner(chat,env))return;await setState(env,chat,'await_active_broadcast',{days:7,location:code==='all'?'':code});return edit(chat,msgId,'<b>📣 متن پیام</b>\n\nگیرنده: '+(code==='all'?'همه‌ی کاربران فعال':'لوکیشن '+esc(code))+'\n\nمتن را بفرست. برای لغو /cancel.',env,KB([[B('⬅️ لغو','admin','','primary')]]))}
async function activeBroadcast(chat,env,text,days,location){const r=await api(env,{action:'broadcast_active',chat_id:chat,text:text,days:days,location:location||''});if(!r.ok)return send(chat,'<b>❌ ارسال ناموفق</b>\n\n'+quote(r.error||'خطا'),env,KB([[B('⬅️ ادمین','admin','','primary')]]));return send(chat,'<b>📣 ارسال تمام شد</b>\n\nموفق: <b>'+r.sent+'</b>\nناموفق: <b>'+r.failed+'</b>',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}
async function adminOps2(op,parts,chat,env,msgId){if(!['logs','oldp','oldpdel','oldpdelok','cfbad','bcact','bcloc','bcgo'].includes(op))return false;if(!isOwner(chat,env))return true;const a=Number(parts[1]||30),b=Number(parts[2]||0);if(op==='bcloc')return await bcLocPick(chat,env,msgId),true;if(op==='bcgo')return await bcGo(chat,env,msgId,String(parts[1]||'all')),true;if(op==='logs')await botLogs(chat,env,msgId);else if(op==='oldp')await oldPanelsMenu(chat,env,msgId,a);else if(op==='oldpdel')await oldPanelsConfirm(chat,env,msgId,a,b);else if(op==='oldpdelok')await oldPanelsDelete(chat,env,msgId,a,b);else if(op==='cfbad')await cfBadMenu(chat,env,msgId);else await bcActivePrompt(chat,env,msgId);return true}
async function ownerPanelOp(op,parts,chat,env){if(!['pdel','udel','ban','unban'].includes(op))return false;if(!isOwner(chat,env))return true;const id=String(parts[1]||'');let r;if(op==='pdel')r=await api(env,{action:'delete_panel',chat_id:chat,id});else if(op==='udel')r=await api(env,{action:'owner_user_panels_delete',chat_id:chat,chat:id});else r=await api(env,{action:'owner_user_ban',chat_id:chat,chat:id,ban:op==='ban'});await send(chat,'<b>'+(r.ok?'✅':'❌')+'</b>\n\n'+quote(r.text||r.error||'انجام شد'),env,KB([[B('👑 ادمین','admin','','primary')]]));if(r.ok&&op==='ban')await send(id,'<b>⛔ حساب شما توسط مدیریت از ربات بند شده است.</b>\n\n'+quote('دیگر به شما پاسخ داده نمی‌شود.'),env,null);return true}
async function banUserRow(env,id){if(!id)return null;return await env.BOT_DB.prepare('SELECT chat_id,username,first_name,created,last_seen,banned FROM users WHERE chat_id=?').bind(String(id)).first()}
async function banNotify(env,id,banned){const body={chat_id:String(id),parse_mode:'HTML',text:banned?'<b>⛔ شما توسط مدیریت بن شدی</b>\n\nتخلف شما مشخص نیست. برای پیگیری می‌توانی از طریق داکیومنت به مدیریت مراجعه کنی.':'<b>✅ از بن خارج شدی</b>\n\nتوسط مدیریت از بن خارج شدی و الان اکانتت کاملاً درسته. می‌توانی دوباره از ربات استفاده کنی.'};if(banned&&env.DOCS_URL)body.reply_markup={inline_keyboard:[[{text:'📄 داکیومنت',url:String(env.DOCS_URL)}]]};try{await tg('sendMessage',body,env)}catch(e){}}
async function userCard(chat,env,msgId,id){const u=await banUserRow(env,id);if(!u)return send(chat,'<b>❌ کاربر پیدا نشد</b>\n\n'+quote('کاربر باید حداقل یک بار ربات را استارت کرده باشد. پیام او را فوروارد کن یا یوزرنیم‌اش را بفرست.'),env,KB([[B('🔎 جستجوی دوباره','admin_find','','primary')],[B('⬅️ ادمین','admin','','primary')]]));const banned=!!Number(u.banned);const t='<b>👤 مشخصات کاربر</b>\n\nنام: '+esc(u.first_name||'-')+'\nUsername: @'+esc(u.username||'-')+'\nID: <code>'+esc(u.chat_id)+'</code>\nعضویت: '+esc(Number(u.created)?new Date(Number(u.created)).toLocaleString('fa-IR'):'-')+'\nآخرین فعالیت: '+esc(Number(u.last_seen)?new Date(Number(u.last_seen)).toLocaleString('fa-IR'):'-')+'\nوضعیت: <b>'+(banned?'⛔ بن شده':'🟢 فعال')+'</b>';const kb=KB([[banned?B('✅ رفع بن','unban:'+u.chat_id,'','success'):B('⛔ بن کردن','ban:'+u.chat_id,'','danger')],[B('🔎 جستجوی دیگر','admin_find','','primary'),B('⬅️ ادمین','admin','','primary')]]);return msgId?edit(chat,msgId,t,env,kb):send(chat,t,env,kb)}
async function banList(chat,env,msgId,page=0){const size=8;const rs=await env.BOT_DB.prepare('SELECT chat_id,first_name,username FROM users WHERE banned=1 ORDER BY last_seen DESC LIMIT ? OFFSET ?').bind(size,page*size).all();const rows=rs.results||[];const cnt=await env.BOT_DB.prepare('SELECT COUNT(*) AS c FROM users WHERE banned=1').first();const total=Number(cnt?.c||0);const kb=rows.map(r=>[B('⛔ '+String(r.first_name||r.username||r.chat_id).slice(0,28),'userc:'+r.chat_id,'','danger')]);const nav=[];if(page>0)nav.push(B('⬅️ قبلی','banlist:'+(page-1),'','primary'));if((page+1)*size<total)nav.push(B('بعدی ➡️','banlist:'+(page+1),'','primary'));if(nav.length)kb.push(nav);kb.push([B('⬅️ ادمین','admin','','primary')]);const t='<b>⛔ کاربران بن‌شده</b>\n\nتعداد: <b>'+total+'</b>\n'+(total?quote('روی هر کاربر بزن تا مشخصاتش را ببینی و در صورت نیاز بنش را برداری.'):quote('هیچ کاربر بن‌شده‌ای وجود ندارد.'));return msgId?edit(chat,msgId,t,env,KB(kb)):send(chat,t,env,KB(kb))}
async function findUserPrompt(chat,env,msgId){await setState(env,chat,'await_find_user',{});return edit(chat,msgId,'<b>🔎 جستجوی کاربر</b>\n\n'+quote('یکی از این‌ها را بفرست: یک پیام فوروارد شده از کاربر، یا یوزرنیم او (با یا بدون @).'),env,KB([[B('⬅️ لغو','admin','','primary')]]))}
async function findUserInput(m,env){const chat=String(m.chat.id);let fid='';if(m.forward_from&&m.forward_from.id)fid=String(m.forward_from.id);else if(m.forward_origin&&m.forward_origin.sender_user&&m.forward_origin.sender_user.id)fid=String(m.forward_origin.sender_user.id);else if(m.forward_origin||m.forward_from)return send(chat,'<b>❌ این کاربر اجازه نمایش در فوروارد را نداده</b>\n\n'+quote('یوزرنیم او را بفرست.'),env,KB([[B('⬅️ لغو','admin','','primary')]]));let id='';if(fid){id=fid}else{const t=String(m.text||'').trim().replace(/^@/,'');if(!t)return send(chat,'یوزرنیم یا پیام فوروارد شده را بفرست.',env,null);const row=await env.BOT_DB.prepare('SELECT chat_id FROM users WHERE username=? COLLATE NOCASE').bind(t).first();id=row?String(row.chat_id):''}await clearState(env,chat);return userCard(chat,env,null,id)}
async function cfBanList(chat,env,msgId,page=0){const r=await api(env,{action:'cf_banned_list',chat_id:chat});const all=(r&&r.accounts)||[];const size=8;const rows=all.slice(page*size,page*size+size);const kb=rows.map(a=>[B('☁️ '+String(a.subdomain||a.account_id||'account').slice(0,22)+' · '+String(a.email||'-').slice(0,18),'cfbanu:'+a.id,'','danger')]);const nav=[];if(page>0)nav.push(B('⬅️ قبلی','cfbanlist:'+(page-1),'','primary'));if((page+1)*size<all.length)nav.push(B('بعدی ➡️','cfbanlist:'+(page+1),'','primary'));if(nav.length)kb.push(nav);if(all.length)kb.push([B('♻️ آزاد کردن همه','cfbanall','','success')]);kb.push([B('🔑 آزادسازی با توکن','cfbantok','','primary')]);kb.push([B('⬅️ ادمین','admin','','primary')]);const t='<b>☁️ اکانت‌های Cloudflare بن‌شده</b>\n\nتعداد: <b>'+all.length+'</b>\n'+(all.length?quote('روی هر اکانت بزن تا آزادش کنی، یا توکنش را بفرست تا همان اکانت پیدا و آزاد شود.'):quote('هیچ اکانت بن‌شده‌ای وجود ندارد.'))+((r&&r.ok===false)?'\n\n'+quote(String(r.error||'خطا')):'');return msgId?edit(chat,msgId,t,env,KB(kb)):send(chat,t,env,KB(kb))}
async function cfTokenPrompt(chat,env,msgId){await setState(env,chat,'await_cf_unban_token',{});return edit(chat,msgId,'<b>🔑 آزادسازی با توکن</b>\n\n'+quote('توکن Cloudflare اکانت بن‌شده را بفرست. پیام توکن بعد از خواندن پاک می‌شود.'),env,KB([[B('⬅️ لغو','cfbanlist:0','','primary')]]))}
async function usageStats(chat,env,msgId){const r=await api(env,{action:'usage_stats',chat_id:chat});const t=(r&&r.ok)?('<b>📊 مصرف پنل‌ها</b>\n\n'+String(r.text||'')):('<b>❌ خطا</b>\n\n'+quote(String((r&&r.error)||'خطا')));return edit(chat,msgId,t,env,KB([[B('🔄 بروزرسانی','usage','','success')],[B('⬅️ ادمین','admin','','primary')]]))}
async function banOp(op,parts,chat,env,msgId){if(!['ban','unban','banlist','userc','admin_find','cfbanlist','cfbanu','cfbanall','cfbantok','usage'].includes(op))return false;if(!isOwner(chat,env))return true;const id=String(parts[1]||'');if(op==='admin_find'){await findUserPrompt(chat,env,msgId);return true}if(op==='banlist'){await banList(chat,env,msgId,Number(parts[1]||0));return true}if(op==='userc'){await userCard(chat,env,msgId,id);return true}if(op==='usage'){await usageStats(chat,env,msgId);return true}if(op==='cfbanlist'){await cfBanList(chat,env,msgId,Number(parts[1]||0));return true}if(op==='cfbanu'){const r=await api(env,{action:'cf_unban',chat_id:chat,id});await cfBanList(chat,env,msgId,0);if(!r||!r.ok)await send(chat,'<b>❌ انجام نشد</b>\n\n'+quote(String((r&&r.error)||'خطا')),env,null);return true}if(op==='cfbanall'){const r=await api(env,{action:'cf_unban_all',chat_id:chat});await cfBanList(chat,env,msgId,0);if(r&&r.ok)await send(chat,'<b>✅ انجام شد</b>\n\n'+quote(String(r.text||'')),env,null);return true}if(op==='cfbantok'){await cfTokenPrompt(chat,env,msgId);return true}if(op==='ban'||op==='unban'){const flag=op==='ban'?1:0;const r=await api(env,{action:op,chat_id:chat,target:id});await env.BOT_DB.prepare('UPDATE users SET banned=? WHERE chat_id=?').bind(flag,id).run();await banNotify(env,id,!!flag);await userCard(chat,env,msgId,id);if(!r||!r.ok)await send(chat,'<b>⚠️ اعمال روی پنل انجام نشد</b>\n\n'+quote(String((r&&r.error)||'خطا')),env,null);else if(r.text)await send(chat,'<b>✅ انجام شد</b>\n\n'+quote(String(r.text)),env,null);return true}return false}
async function banGate(u,env){const m=u.message||u.edited_message;const cq=u.callback_query;const chat=String((cq&&cq.from&&cq.from.id)||(m&&m.chat&&m.chat.id)||'');if(!chat)return false;if(!isOwner(chat,env)){const bu=await env.BOT_DB.prepare('SELECT banned FROM users WHERE chat_id=?').bind(chat).first();if(bu&&Number(bu.banned)){if(cq&&cq.id){try{await tg('answerCallbackQuery',{callback_query_id:cq.id,text:'حساب شما توسط مدیریت بن شده است'},env)}catch(e){}}try{await tg('sendMessage',{chat_id:chat,parse_mode:'HTML',text:'<b>⛔ شما توسط مدیریت بن شدی</b>\n\nتخلف شما مشخص نیست. برای پیگیری می‌توانی از طریق داکیومنت به مدیریت مراجعه کنی.'},env)}catch(e){}return true}return false}if(m&&!cq){const st=await getState(env,chat);if(st&&st.step==='await_find_user'){await findUserInput(m,env);return true}if(st&&st.step==='await_cf_unban_token'&&m.text){const tok=String(m.text).trim();await clearState(env,chat);try{await tg('deleteMessage',{chat_id:chat,message_id:m.message_id},env)}catch(e){}const r=await api(env,{action:'cf_unban_token',chat_id:chat,token:tok});await send(chat,(r&&r.ok)?('<b>✅ آزاد شد</b>\n\n'+quote(String(r.text||''))):('<b>❌ انجام نشد</b>\n\n'+quote(String((r&&r.error)||'خطا'))),env,KB([[B('☁️ لیست بن‌شده‌ها','cfbanlist:0','','primary')]]));return true}}return false}
const GM_WORDS={'یک':1,'دو':2,'سه':3,'چهار':4,'پنج':5,'شش':6,'هفت':7,'هشت':8,'نه':9,'ده':10,'یازده':11,'دوازده':12,'پانزده':15,'بیست':20,'سی':30,'چهل':40,'پنجاه':50,'شصت':60,'نود':90,'صد':100,'دویست':200};
function gmNormalize(s){return String(s||'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s+/g,' ').trim();}
function gmParseNum(t){if(!t)return null;if(/^\d+$/.test(t))return parseInt(t,10);if(GM_WORDS[t]!=null)return GM_WORDS[t];return null;}
const GM_KEYS=['can_send_messages','can_send_audios','can_send_documents','can_send_photos','can_send_videos','can_send_video_notes','can_send_voice_notes','can_send_polls','can_send_other_messages','can_add_web_page_previews','can_invite_users','can_pin_messages','can_change_info'];
const GM_PERMS_OFF=Object.fromEntries(GM_KEYS.map(k=>[k,false]));
const GM_PERMS_ON=Object.fromEntries(GM_KEYS.map(k=>[k,true]));
async function gmAdmin(chatId,userId,env){
  if(String(userId)===String(env.BOT_OWNER_ID||''))return true;
  try{const r=await tg('getChatMember',{chat_id:chatId,user_id:userId},env);const st=r&&r.result&&r.result.status;return st==='creator'||st==='administrator';}catch(e){return false;}
}
async function groupModerate(u,env){
  const m=u&&u.message;
  if(!m||!m.chat||(m.chat.type!=='group'&&m.chat.type!=='supergroup'))return false;
  const text=gmNormalize(m.text||'');
  const mm=text.match(/^(سکوت|حذف سکوت|آزاد|قفل گروه|حذف قفل گروه|گروه آزاد|بن پنل)(?: (\S+))?$/);
  if(!mm)return false;
  const chat=m.chat.id, from=m.from||{};
  if(!(await gmAdmin(chat,from.id,env)))return true;
  const cmd=mm[1], num=gmParseNum(mm[2]);
  const rt=m.reply_to_message;
  const target=(rt&&rt.from&&!rt.from.is_bot)?rt.from:null;
  const who=target?esc(target.first_name||target.username||target.id):'';
  const say=t=>send(String(chat),t,env).catch(()=>{});
  try{
    if(cmd==='قفل گروه'){
      const r=await tg('setChatPermissions',{chat_id:chat,permissions:GM_PERMS_OFF},env);
      await say(r&&r.ok?'گروه قفل شد. فقط مدیران می‌توانند پیام بفرستند.':'قفل گروه انجام نشد. ربات باید مدیر گروه باشد و دسترسی محدود کردن داشته باشد.');
      return true;
    }
    if(cmd==='حذف قفل گروه'||cmd==='گروه آزاد'){
      const r=await tg('setChatPermissions',{chat_id:chat,permissions:GM_PERMS_ON},env);
      await say(r&&r.ok?'قفل گروه برداشته شد.':'برداشتن قفل انجام نشد.');
      return true;
    }
    if(cmd==='بن پنل'){
      if(!target){await say('برای بن پنل، روی پیام کاربر ریپلای کن و دستور را بنویس.');return true;}
      await say('در حال پیدا کردن پنل‌های کاربر '+who+' ...');
      const r=await api(env,{action:'pban_user_all',chat_id:String(env.BOT_OWNER_ID||''),target:String(target.id)});
      await say(r&&r.ok?(r.text||'پنل‌های کاربر پردازش شد.'):('خطا: '+((r&&r.error)||'ناموفق')));
      return true;
    }
    if(!target){await say('روی پیام کاربر ریپلای کن و دستور را بنویس.');return true;}
    if(cmd==='سکوت'){
      const mins=num??0;
      const body={chat_id:chat,user_id:target.id,use_independent_chat_permissions:true,permissions:GM_PERMS_OFF};
      if(mins>0)body.until_date=Math.floor(Date.now()/1000)+mins*60;
      const r=await tg('restrictChatMember',body,env);
      await say(r&&r.ok?(who+(mins>0?' به مدت '+mins+' دقیقه':' به‌صورت نامحدود')+' سکوت شد.'):'سکوت انجام نشد. ربات باید دسترسی محدود کردن کاربران را داشته باشد.');
      return true;
    }
    if(cmd==='حذف سکوت'||cmd==='آزاد'){
      const r=await tg('restrictChatMember',{chat_id:chat,user_id:target.id,use_independent_chat_permissions:true,permissions:GM_PERMS_ON},env);
      await say(r&&r.ok?who+' از سکوت آزاد شد.':'آزاد کردن کاربر انجام نشد.');
      return true;
    }
  }catch(e){ await say('خطا: '+String(e&&e.message||e).slice(0,160)); }
  return true;
}
let TK_READY=false;
async function tkInit(env){
  if(TK_READY)return;
  await env.BOT_DB.batch([
    env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS tk_tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,chat_id TEXT,name TEXT,status TEXT,created INTEGER)'),
    env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS tk_map(owner_msg_id INTEGER PRIMARY KEY,ticket_id INTEGER)'),
    env.BOT_DB.prepare('CREATE TABLE IF NOT EXISTS gv_pending(chat_id TEXT,user_id TEXT,msg_id INTEGER,PRIMARY KEY(chat_id,user_id))')
  ]);
  TK_READY=true;
}
async function groupJoinFlow(u,env){
  await tkInit(env);
  const m=u.message, cq=u.callback_query;
  if(m&&Array.isArray(m.new_chat_members)&&m.chat&&(m.chat.type==='group'||m.chat.type==='supergroup')){
    const chat=m.chat.id;
    for(const mem of m.new_chat_members){
      if(mem.is_bot)continue;
      const uid=String(mem.id), nm=esc(mem.first_name||mem.username||uid);
      try{await tg('restrictChatMember',{chat_id:chat,user_id:mem.id,use_independent_chat_permissions:true,permissions:GM_PERMS_OFF},env);}catch(e){}
      const r=await tg('sendMessage',{chat_id:chat,parse_mode:'HTML',text:'سلام <b>'+nm+'</b>، خوش آمدی!\nبرای فعال شدن گفتگو، روی دکمه‌ی زیر بزن.',reply_markup:{inline_keyboard:[[{text:'من ربات نیستم',callback_data:'gv:'+uid}]]}},env);
      const mid=r&&r.result?r.result.message_id:null;
      await env.BOT_DB.prepare('REPLACE INTO gv_pending(chat_id,user_id,msg_id) VALUES(?,?,?)').bind(String(chat),uid,mid).run();
    }
    return true;
  }
  if(cq&&typeof cq.data==='string'&&cq.data.startsWith('gv:')){
    const uid=cq.data.slice(3), chat=cq.message&&cq.message.chat?cq.message.chat.id:null;
    if(!chat)return true;
    if(String(cq.from.id)!==uid){await answer(cq,env,'این دکمه برای کاربر جدید است.');return true;}
    await tg('restrictChatMember',{chat_id:chat,user_id:cq.from.id,use_independent_chat_permissions:true,permissions:GM_PERMS_ON},env);
    await env.BOT_DB.prepare('DELETE FROM gv_pending WHERE chat_id=? AND user_id=?').bind(String(chat),uid).run();
    await tg('editMessageText',{chat_id:chat,message_id:cq.message.message_id,text:'تأیید شد. حالا می‌توانی گفتگو کنی.'},env);
    await answer(cq,env,'تأیید شد');
    return true;
  }
  return false;
}
async function supportFlow(u,env){await tkInit(env);return false}
let BC_SELF='',BC_CTX=null;
async function bcInit(env){await env.BOT_DB.prepare("CREATE TABLE IF NOT EXISTS bc_jobs(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT,mode TEXT,src_chat TEXT,src_msg INTEGER,text TEXT,cursor INTEGER DEFAULT 0,ok INTEGER DEFAULT 0,fail INTEGER DEFAULT 0,status TEXT DEFAULT 'run',created INTEGER)").run()}
async function bcKick(env,id){if(BC_CTX&&BC_SELF&&env.WEBHOOK_SECRET){BC_CTX.waitUntil(fetch(BC_SELF,{method:'POST',headers:{'content-type':'application/json','x-bc-secret':String(env.WEBHOOK_SECRET)},body:JSON.stringify({bc:id})}).catch(()=>null));return}await bcRun(env,id)}
async function bcRun(env,id){
  const job=await env.BOT_DB.prepare('SELECT * FROM bc_jobs WHERE id=?').bind(id).first();
  if(!job||job.status!=='run')return;
  const rs=await env.BOT_DB.prepare('SELECT rowid AS rid,chat_id FROM users WHERE banned=0 AND rowid>? ORDER BY rowid LIMIT 35').bind(Number(job.cursor)||0).all();
  const arr=rs.results||[];let ok=Number(job.ok)||0,fail=Number(job.fail)||0,cur=Number(job.cursor)||0;
  for(const r of arr){cur=Number(r.rid);try{const x=job.mode==='forward'?await tg('forwardMessage',{chat_id:String(r.chat_id),from_chat_id:String(job.src_chat),message_id:Number(job.src_msg)},env):await tg('sendMessage',{chat_id:String(r.chat_id),text:'<b>📣 اطلاعیه</b>\n\n'+quote(String(job.text||'')),parse_mode:'HTML'},env);if(x&&x.ok)ok++;else fail++}catch(e){fail++}await sleep(40)}
  if(arr.length===35){await env.BOT_DB.prepare('UPDATE bc_jobs SET cursor=?,ok=?,fail=? WHERE id=?').bind(cur,ok,fail,id).run();return bcKick(env,id)}
  await env.BOT_DB.prepare("UPDATE bc_jobs SET cursor=?,ok=?,fail=?,status='done' WHERE id=?").bind(cur,ok,fail,id).run();
  return send(String(job.owner),'<b>📣 ارسال همگانی تمام شد</b>\n\nموفق: <b>'+ok+'</b>\nناموفق: <b>'+fail+'</b>',env,KB([[B('👑 ادمین','admin','','primary')]]));
}
async function bcStart(env,owner,mode,srcChat,srcMsg,text){
  await bcInit(env);
  const r=await env.BOT_DB.prepare("INSERT INTO bc_jobs(owner,mode,src_chat,src_msg,text,cursor,ok,fail,status,created) VALUES(?,?,?,?,?,0,0,0,'run',?)").bind(String(owner),mode,String(srcChat||''),Number(srcMsg)||0,String(text||''),Date.now()).run();
  const id=r.meta&&r.meta.last_row_id;
  await send(String(owner),'<b>📣 ارسال همگانی شروع شد</b>\n\nبه‌صورت خودکار برای همه‌ی کاربران ارسال می‌شود. وقتی تمام شد، گزارش برایت می‌آید.',env,null);
  return bcKick(env,id);
}
async function doBroadcastForward(chat,env,m){await clearState(env,chat);return bcStart(env,chat,'forward',chat,m.message_id,'')}
async function doBroadcast(chat,env,text){await clearState(env,chat);return bcStart(env,chat,'text',chat,0,text)}
const REACT_DEF='👍';
async function startAccessMode(env){return String(await kvGetBot(env,'start_access','all'))}
async function kvGetBot(env,k,d=''){const r=await env.BOT_DB.prepare('SELECT v FROM settings WHERE k=?').bind(k).first();return (r&&r.v!=null)?String(r.v):d}
async function kvSetBot(env,k,v){await env.BOT_DB.prepare('REPLACE INTO settings(k,v) VALUES(?,?)').bind(k,String(v)).run()}
async function reactToUser(env,m){try{const emo=String(await kvGetBot(env,'react_emoji',REACT_DEF)).trim();if(!emo||emo==='off')return;await tg('setMessageReaction',{chat_id:String(m.chat.id),message_id:m.message_id,reaction:[{type:'emoji',emoji:emo}]},env)}catch(e){}}
async function ownerCmd(text,env,chat){
  let mm=/^\/react(?:@\w+)?(?:\s+(\S+))?$/i.exec(text);
  if(mm){const v=(mm[1]||'').trim();if(!v){const cur=await kvGetBot(env,'react_emoji',REACT_DEF);return send(chat,'<b>واکنش فعلی:</b> '+esc(cur)+'\n\nبرای تغییر: <code>/react 👍</code> یا برای خاموش: <code>/react off</code>',env,null)}await kvSetBot(env,'react_emoji',v==='off'?'off':v);return send(chat,'<b>✅ واکنش ذخیره شد:</b> '+esc(v),env,null)}
  mm=/^\/startaccess(?:@\w+)?(?:\s+(\S+))?$/i.exec(text);
  if(mm){const v=(mm[1]||'').trim().toLowerCase();if(!v){const cur=await startAccessMode(env);return send(chat,'<b>دسترسی فعلی /start:</b> '+esc(cur)+'\n\n<code>/startaccess all</code> همه‌ی کاربران\n<code>/startaccess owner</code> فقط مالک',env,null)}if(!['all','owner'].includes(v))return send(chat,'مقدار معتبر: all یا owner',env,null);await kvSetBot(env,'start_access',v);return send(chat,'<b>✅ دسترسی /start:</b> '+esc(v),env,null)}
  return null;
}
async function handle(u,env){await dbInit(env);RT_CFG=await loadBotCfg(env,u);if(await groupModerate(u,env))return;await groupRudeness(u,env);if(await ownerFaqDoc(u,env))return;if(await groupAI(u,env))return;if(await banGate(u,env))return;if(await groupJoinFlow(u,env))return;if(await supportFlow(u,env))return;
      if(u.chat_member){const cm=u.chat_member,uid=String(cm.new_chat_member?.user?.id||''),ns=String(cm.new_chat_member?.status||''),os=String(cm.old_chat_member?.status||''),ok=['member','administrator','creator'];if(uid&&ok.includes(ns)&&!ok.includes(os)){const fg=await forceGate(uid,env);if(fg.ok)await send(uid,'<b>✅ عضویت شما تأیید شد</b>\n\n'+quote('حالا می‌توانی کامل از ربات استفاده کنی.'),env,mainKB(uid,env));}return;}
      const m=u.message||u.edited_message,cq=u.callback_query;
      const incomingChat=String(m?.chat?.id||cq?.from?.id||cq?.message?.chat?.id||'');
      if(incomingChat && !isOwner(incomingChat,env) && !(await botEnabled(env))) return;
      if(m?.chat){const id=String(m.chat.id);await touch(env,m);if(!isOwner(id,env)&&m.chat.type==='private')await reactToUser(env,m);const user=await env.BOT_DB.prepare('SELECT banned FROM users WHERE chat_id=?').bind(id).first();if(user?.banned&&!isOwner(id,env))return send(id,'<b>⛔ حساب شما توسط مدیریت از ربات بند شده است.</b>\n\n'+quote('دیگر به شما پاسخ داده نمی‌شود.'),env,KB([[B('پشتیبانی','support','','primary')]]));if(!isOwner(id,env)&&m.chat.type==='private'){const fg=await forceGate(id,env);if(!fg.ok)return forceMessage(id,env);}
      if(isOwner(id,env)&&!(typeof m.text==='string'&&m.text.trim()==='/cancel')){const bst=await getState(env,id);if(bst&&bst.step==='await_broadcast')return doBroadcastForward(id,env,m);}
      if(typeof m.text==='string'){const pst=await getState(env,id);if(pst&&pst.step==='p2fa_code'){const d2=Object.assign({},pst,pst.data||{});const code=m.text.replace(/\s/g,'');if(!/^\d{6}$/.test(code))return send(id,'کد ۶ رقمی را بفرست.',env,null);await clearState(env,id);const {r,msg}=await pSpin(id,env,null,['در حال تأیید کد…','در حال فعال‌سازی 2FA…'],()=>api(env,{action:'panel_2fa_enable',chat_id:id,id:d2.pid,code}));if(r&&r.ok){const codes=(r.codes||[]).map(c=>esc(String(c))).join('\\n');return pFinal(id,msg,env,'<b>✅ تأیید دو مرحله‌ای فعال شد</b>\\n\\n'+quote('کدهای بازیابی را جای امن نگه دار؛ هر کدام فقط یک بار قابل استفاده است:')+'\\n\\n<code>'+codes+'</code>',KB([[B('⬅️ پنل‌ها','panels','','primary')]]))}return pFinal(id,msg,env,'<b>❌ فعال‌سازی ناموفق بود</b>\\n\\n'+quote((r&&r.error)||'خطا'),KB([[B('🔁 دوباره','p2fa:'+d2.pid,'','primary')],[B('⬅️ پنل','pm:'+d2.pid,'','primary')]]))}
if(pst&&String(pst.step||'').indexOf('pu_')===0){const d=Object.assign({},pst,pst.data||{});const txt=m.text.trim();
        if(pst.step==='pu_name'){if(!txt)return send(id,'نام را بفرست.',env,null);await setState(env,id,'pu_gb',{pid:d.pid,name:txt});return send(id,'<b>حجم (گیگابایت)</b>\n\n'+quote('عدد بفرست؛ ۰ = نامحدود.'),env,null)}
        if(pst.step==='pu_gb'){const g=Number(txt);if(!(g>=0))return send(id,'عدد معتبر بفرست.',env,null);await setState(env,id,'pu_days',{pid:d.pid,name:d.name,gb:g});return send(id,'<b>مدت (روز)</b>\n\n'+quote('عدد بفرست؛ ۰ = بدون انقضا.'),env,null)}
        if(pst.step==='pu_days'){const dd=Number(txt);if(!(dd>=0))return send(id,'عدد معتبر بفرست.',env,null);await clearState(env,id);const r=await api(env,{action:'panel_create_user',chat_id:id,id:d.pid,name:d.name,gb:d.gb,days:dd});if(!r||!r.ok)return send(id,'<b>❌ ساخت کاربر ناموفق</b>\n\n'+quote((r&&r.error)||'خطا'),env,KB([[B('⬅️ پنل‌ها','panels','','primary')]]));return send(id,'<b>✅ کاربر ساخته شد</b>\n\n'+quote('نام: '+d.name)+'\n\n<code>'+String(r.sub).replace(/</g,'&lt;')+'</code>',env,KB([[B('⬅️ پنل‌ها','panels','','primary')]]))}
      }}
      if(isOwner(id,env)&&(m.video||(m.document&&String(m.document.mime_type||'').indexOf('video/')===0))){const tst=await getState(env,id);if(tst&&tst.step==='await_tut_video'){const v=m.video||m.document;const tr=await api(env,{action:'tut_set',chat_id:id,file_id:v.file_id,caption:String(m.caption||'')});await clearState(env,id);return send(id,tr&&tr.ok?'<b>✅ ویدئوی آموزشی ذخیره شد</b>\n\n'+quote('از این به بعد بعد از ساخت هر پنل برای کاربر ارسال می‌شود.'):'<b>❌ ذخیره ناموفق</b>\n\n'+quote((tr&&tr.error)||'خطا'),env,KB([[B('🎬 مدیریت ویدئو','tutadm','','success')],[B('⬅️ منو','menu','','primary')]]));}}
      if(isOwner(id,env)&&typeof m.text==='string'&&/^https?:\/\//i.test(m.text.trim())){const ust=await getState(env,id);if(ust&&ust.step==='await_tut_video'){const ur=await api(env,{action:'tut_set',chat_id:id,url:m.text.trim(),caption:''});await clearState(env,id);return send(id,ur&&ur.ok?'<b>✅ لینک ویدئوی آموزشی ذخیره شد</b>\n\n'+quote('از این به بعد دکمه‌ی ویدئو این لینک را باز می‌کند.'):'<b>❌ ذخیره ناموفق</b>\n\n'+quote((ur&&ur.error)||'خطا'),env,KB([[B('🎬 مدیریت ویدئو','tutadm','','success')],[B('⬅️ منو','menu','','primary')]]));}}
      if(isOwner(id,env)&&Array.isArray(m.photo)&&m.photo.length){const ps=await getState(env,id);if(ps&&ps.step==='await_start_image'){const fid=m.photo[m.photo.length-1].file_id;await kvSetBot(env,'welcome_photo',fid);await clearState(env,id);return send(id,'<b>✅ تصویر استارت ذخیره شد</b>\n\nبا /start ببین.',env,KB([[B('🖼 تصویر استارت','startimg','','primary'),B('🧮 محدودیت ساخت پنل','panellimit','','primary')],[B('👑 ادمین','admin','','primary')]]))}}if(typeof m.text==='string'){if(isOwner(id,env)&&/^\/(react|startaccess)(?:@\w+)?(\s|$)/i.test(m.text.trim())){const oc=await ownerCmd(m.text.trim(),env,id);if(oc)return oc;}if(/^\/(start|menu)(?:@\w+)?$/i.test(m.text.trim())&&!isOwner(id,env)&&(await startAccessMode(env))==='owner')return send(id,'<b>ربات در حال حاضر فقط برای مدیر فعال است.</b>',env,null);if(/^\/force(?:@\w+)?$/i.test(m.text))return forceMessage(id,env);if(/^\/start(?:@\w+)?$/i.test(m.text)||/^\/menu(?:@\w+)?$/i.test(m.text))return welcome(id,env);if(/^\/help(?:@\w+)?$/i.test(m.text)||/^\/teacher(?:@\w+)?/i.test(m.text))return help(id,env);if(/^\/status(?:@\w+)?$/i.test(m.text))return status(id,env);if(/^\/id(?:@\w+)?$/i.test(m.text))return send(id,'<b>🆔 شناسه شما</b>\n\n<code>'+esc(id)+'</code>',env,KB([[B('⬅️ منو','menu','','primary')]]));if(/^\/admin(?:@\w+)?$/i.test(m.text)&&isOwner(id,env))return admin(id,env);const x=await processText(m,env);if(x)return x;}}
if(cq?.id){const chat=String(cq.from?.id||cq.message?.chat?.id||''),data=String(cq.data||''),parts=data.split(':'),op=parts[0];if(!chat)return;if(op==='deploy'&&isOwner(chat,env)){return deployMenu(chat,env,cq.message?.message_id)}if(op==='dtg'&&isOwner(chat,env)){await api(env,{action:'admin_deploy_toggle',chat_id:chat,key:parts[1]});return deployMenu(chat,env,cq.message?.message_id)}if(!isOwner(chat,env)){const bu=await env.BOT_DB.prepare('SELECT banned FROM users WHERE chat_id=?').bind(chat).first();if(bu?.banned){await answer(cq,env,'دسترسی شما مسدود شده است');return send(chat,'<b>⛔ حساب شما توسط مدیریت از ربات بند شده است.</b>\n\n'+quote('دیگر به شما پاسخ داده نمی‌شود.'),env,KB([[B('پشتیبانی','support','','primary')]]));}const fg=(cq.message?.chat?.type&&cq.message.chat.type!=='private')?{ok:true}:await forceGate(chat,env);if(!fg.ok){await answer(cq,env,'ابتدا عضو کانال‌های اجباری شو');return forceMessage(chat,env,cq.message?.message_id||null);}}await answer(cq,env);if(['faqadm','faqimp','faqreseed'].includes(op)){if(!isOwner(chat,env))return;return faqOp(op,chat,env,cq.message.message_id);}if(['aicfg','aitog','aiprompt'].includes(op)){if(!isOwner(chat,env))return;return aiOp(op,chat,env,cq.message.message_id);}if(['mcfg','mcfgi','mcfgc','mcfgt','mcfgm','mcfgx','supcfg','pnsearch'].includes(op)){if(!isOwner(chat,env))return;return mcfgOp(op,parts,chat,env,cq.message.message_id);}if(op==='panellimit'){if(!isOwner(chat,env))return;const cur=await kvGetBot(env,'panel_limit','0');await setState(env,chat,'await_panel_limit');return edit(chat,cq.message.message_id,'<b>🧮 محدودیت ساخت پنل</b>\n\nسقف فعلی: <b>'+(Number(cur)>0?esc(cur)+' پنل برای هر کاربر':'نامحدود')+'</b>\n\nعدد جدید را بفرست (۰ = نامحدود).',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}if(op==='startimg'){if(!isOwner(chat,env))return;await setState(env,chat,'await_start_image');return edit(chat,cq.message.message_id,'<b>🖼 تصویر استارت</b>\n\nعکسی را بفرست تا قبل از متن و دکمه‌ها بعد از /start نمایش داده شود.',env,KB([[B('🗑 حذف تصویر','startimg_clear','','danger')],[B('⬅️ ادمین','admin','','primary')]]))}if(op==='startimg_clear'){if(!isOwner(chat,env))return;await kvSetBot(env,'welcome_photo','');return edit(chat,cq.message.message_id,'<b>✅ تصویر استارت حذف شد</b>',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}if(op==='welcome_adm'){if(!isOwner(chat,env))return;await setState(env,chat,'await_welcome');return edit(chat,cq.message.message_id,'<b>✍️ متن خوش‌آمد</b>\n\nمتنی را که می‌خواهی کاربر بعد از /start ببیند بفرست.\n\n<b>متغیرها:</b>\n{name} نام کاربر\n{username} یوزرنیم\n{id} آیدی عددی\n{date} تاریخ امروز\n{time} ساعت (مثلاً ۱۴:۳۰)\n{hour} ساعت ۲۴ (مثلاً 14:30)\n{greeting} صبح/ظهر/عصر/شب بخیر\n\n<b>فرمت:</b>\n[b]متن بولد[/b]\n[i]متن ایتالیک[/i]\n[code]متن کد[/code]\n[quote]نقل قول[/quote]\n\nبرای برگشت به متن پیش‌فرض، دکمه‌ی زیر را بزن.',env,KB([[B('↩️ متن پیش‌فرض','welcome_reset','','danger')],[B('⬅️ ادمین','admin','','primary')]]));}if(op==='welcome_reset'){if(!isOwner(chat,env))return;await clearState(env,chat);const wr=await api(env,{action:'welcome_set',chat_id:chat,text:''});return edit(chat,cq.message.message_id,wr&&wr.ok?'<b>✅ به متن پیش‌فرض برگشت</b>':'<b>❌ انجام نشد</b>',env,KB([[B('⬅️ ادمین','admin','','primary')]]));}if(op==='ppw')return panelPassword(chat,env,cq.message.message_id,parts[1]||'');if(await banOp(op,parts,chat,env,cq.message?.message_id||null))return;if(await ownerPanelOp(op,parts,chat,env))return;if(await panelExtraOp(op,parts,chat,env,cq.message?.message_id||null))return;if(await recentOp(op,parts,chat,env,cq.message?.message_id||null))return;if(await adminOps2(op,parts,chat,env,cq.message?.message_id||null))return;if(await panelSrcOp(op,parts,chat,env,cq.message?.message_id||null))return;if(await panelMgrAdmin(op,parts,chat,env,cq.message?.message_id||null))return;if(op==='pmain')return mainUpdatePrompt(chat,env,cq.message?.message_id||null);if(op==='bpick')return buildPickPanel(chat,env,cq.message?.message_id||null,parts[1]||'0');if(op==='bacc')return buildInstall(chat,env,cq.message?.message_id||null,parts[1]||'0',parts[2]||'');if(op==='bct'){const st=await getState(env,chat);const d=(st&&st.step==='await_build_target')?(st.data||{}):{};if(!d.account_id)return edit(chat,cq.message.message_id,'این مرحله منقضی شده. دوباره از «ساخت پنل» شروع کن.',env,KB([[B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]]));return createPanel(chat,env,cq.message.message_id,d.account_id,d.name||'وکس پنل',d.location||'auto',Number(d.source||0),parts[1]==='worker'?'worker':'pages')}if(op==='bretry'){const st=await getState(env,chat);const d=(st&&st.step==='await_build_retry')?(st.data||{}):{};if(!d.account_id)return edit(chat,cq.message.message_id,'این مرحله منقضی شده. دوباره از «ساخت پنل» شروع کن.',env,KB([[B('🚀 ساخت پنل','build','','success')],[B('⬅️ منو','menu','','primary')]]));return createPanel(chat,env,cq.message.message_id,d.account_id,d.name||'وکس پنل',d.location||'auto',Number(d.source||0),d.target||'pages')}if(await ubOp(op,parts,chat,env))return;if(await updOp(op,parts,chat,env))return;if(await panelMgrOp(op,parts,chat,env))return;if(op==='tempmail')return tempMailMenu(chat,env,cq.message?.message_id||null);if(op==='tempmail_create')return tempMailCreate(chat,env,cq.message?.message_id||null);if(op==='tempmail_recreate')return tempMailRecreate(chat,env,cq.message?.message_id||null);if(op==='tempmail_inbox')return tempMailInbox(chat,env,cq.message?.message_id||null);if(op==='tempmail_read')return tempMailRead(chat,env,cq.message?.message_id||null,parts.slice(1).join(':'));if(op==='tempmail_delete')return tempMailDelete(chat,env,cq.message?.message_id||null);if(op==='tut')return tutSendTo(chat,env,true);if(op==='tutadm')return tutAdmin(chat,env,cq.message.message_id);if(op==='tutup')return tutAskUpload(chat,env,cq.message.message_id);if(op==='tutdel')return tutDelete(chat,env,cq.message.message_id);if(op==='noop')return;if(op==='sub')return sendSub(chat,env,cq.message?.message_id||null);if(op==='subkick')return subKick(chat,env,cq.message?.message_id||null);if(op==='apk')return sendApk(chat,env,cq.message?.message_id||null);if(op==='menu')return welcome(chat,env);if(op==='help')return help(chat,env,cq.message.message_id);if(op==='security')return security(chat,env);if(op==='status')return status(chat,env,cq.message.message_id);if(op==='stats')return stats(chat,env,cq.message.message_id);if(op==='quick')return quickBuild(chat,env,cq.message.message_id);if(op==='force')return forceMessage(chat,env,cq.message.message_id);if(op==='cfguide')return cfGuide(chat,env,cq.message.message_id);if(op==='acdelmode')return accountDeleteMode(chat,env,cq.message.message_id);if(op==='acall')return accountDeleteAll(chat,env,cq.message.message_id);if(op==='acclear')return accountDeleteClear(chat,env,cq.message.message_id);if(op==='acsel')return accountDeleteToggle(chat,env,cq.message.message_id,parts[1]||'');if(op==='acdelconfirm')return accountDeleteConfirm(chat,env,cq.message.message_id);if(op==='acdelok'){const rr=await api(env,{action:'delete_account',chat_id:chat,id:parts[1]||''});if(rr.ok)return accounts(chat,env,cq.message.message_id);return edit(chat,cq.message.message_id,'<b>❌ حذف نشد</b>\n\n'+esc(rr.error||'خطا')+(rr.panels_count?'\n\nپنل‌های متصل: <b>'+esc(rr.panels_count)+'</b>':''),env,KB([[B('☁️ حساب‌ها','accounts','','primary')]]));}if(op==='acdel'){return edit(chat,cq.message.message_id,'<b>⚠️ حذف حساب Cloudflare</b>\n\nمطمئنی می‌خواهی این حساب را فقط از ربات حذف کنی؟\n\n'+quote('خود حساب Cloudflare حذف نمی‌شود. اگر پنل متصل داشته باشد، عملیات توسط سیستم متوقف می‌شود.'),env,KB([[B('⚠️ بله، حذفش کن','acdelok:'+String(parts[1]||''),'','danger')],[B('⬅️ لغو','accounts','','primary')]]));}if(op==='force_check'){const fg=await forceGate(chat,env);return fg.ok?edit(chat,cq.message.message_id,'<b>🟢 عضویت تأیید شد</b>\n\n'+quote('عضویت شما تأیید شد؛ حالا می‌توانی از ربات استفاده کنی.'),env,mainKB(chat,env)):forceMessage(chat,env,cq.message.message_id);}if(op==='profile')return profile(chat,env,cq.message.message_id);if(op==='support'){const r=await api(env,{action:'support',chat_id:chat});return edit(chat,cq.message.message_id,r.text||r.error||'پشتیبانی',env,KB([[B('⬅️ منو','menu','','primary')]]))}if(op==='addcf')return addCF(chat,env);if(op==='accounts')return accounts(chat,env,cq.message.message_id);if(op==='build')return build(chat,env,cq.message.message_id);if(op==='buildacct')return buildFromAccount(chat,env,cq.message.message_id,parts[1]||'');if(op==='acct')return accountInfo(chat,env,cq.message.message_id,parts[1]||'');if(op==='fast')return createPanel(chat,env,cq.message.message_id,parts[1]||'','وکس پنل','auto');if(op==='loc'){const st=await getState(env,chat);return createPanel(chat,env,cq.message.message_id,st?.data?.account_id||parts[1]||'',st?.data?.name||'وکس پنل',parts[2]||'auto',Number(st?.data?.source||0))}if(op==='panels'||op==='pnext')return panels(chat,env,cq.message.message_id);if(op==='panel')return panelInfo(chat,env,cq.message.message_id,parts[1]||'');if(op==='ps')return panelSettings(chat,env,cq.message.message_id,parts[1]||'');if(op==='health')return health(chat,env,cq.message.message_id,parts[1]||'');if(op==='pset'){await api(env,{action:'set_panel_setting',chat_id:chat,id:parts[1]||'',key:parts[2]||'',value:parts[3]||''});return panelSettings(chat,env,cq.message.message_id,parts[1]||'')}if(op==='rename'){await setState(env,chat,'await_rename',{id:parts[1]||''});return edit(chat,cq.message.message_id,'<b>✏️ تغییر نام پنل</b>\n\nنام جدید را ارسال کن.',env,KB([[B('⬅️ لغو','ps:'+parts[1],'','primary')]]))}if(op==='toggle'){await api(env,{action:'toggle_panel',chat_id:chat,id:parts[1]||''});return panelInfo(chat,env,cq.message.message_id,parts[1]||'')}if(op==='pusers')return panelUsers(chat,env,cq.message.message_id,parts[1]||'',0);if(op==='pup')return panelUsers(chat,env,cq.message.message_id,parts[1]||'',Number(parts[2]||0));if(op==='pu')return panelUserInfo(chat,env,cq.message.message_id,parts[1]||'',parts[2]||'');if(op==='put'){await api(env,{action:'service_user_toggle',chat_id:chat,id:parts[1]||'',user_id:parts[2]||'',active:parts[3]==='1'?1:0});return panelUserInfo(chat,env,cq.message.message_id,parts[1]||'',parts[2]||'')}if(op==='pud'){await api(env,{action:'service_user_delete',chat_id:chat,id:parts[1]||'',user_id:parts[2]||''});return panelUsers(chat,env,cq.message.message_id,parts[1]||'',0)}if(op==='pban_start'){if(!isOwner(chat,env))return;await setState(env,chat,'await_pban_user');return edit(chat,cq.message.message_id,'<b>⛔ بنگ کردن پنل کاربر</b>\n\nآی‌دی عددی یا یوزرنیم تلگرام کاربر را بفرست.',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}if(op==='pban_u'){if(!isOwner(chat,env))return;return pbanUser(chat,env,cq.message.message_id,parts[1]||'')}if(op==='pban_p'){if(!isOwner(chat,env))return;return pbanPanelConfirm(chat,env,cq.message.message_id,parts[1]||'')}if(op==='pban_ok'){if(!isOwner(chat,env))return;return pbanPanelDo(chat,env,cq.message.message_id,parts[1]||'')}if(op==='pban_allc'){if(!isOwner(chat,env))return;return pbanAllConfirm(chat,env,cq.message.message_id,parts[1]||'')}if(op==='pban_allok'){if(!isOwner(chat,env))return;return pbanAllDo(chat,env,cq.message.message_id,parts[1]||'')}if(op==='topp'){if(!isOwner(chat,env))return;return topPanels(chat,env,cq.message.message_id,parts[1]||'all')}if(op==='admin'){if(!isOwner(chat,env))return;return admin(chat,env,cq.message.message_id)}if(op==='botadmin'){if(!isOwner(chat,env))return;return botAdmin(chat,env,cq.message.message_id)}if(op==='boton'||op==='botoff'){if(!isOwner(chat,env))return;const rr=await api(env,{action:'teacher_bot_toggle',chat_id:chat,enabled:op==='boton'});return botAdmin(chat,env,cq.message.message_id)}if(op==='botupdate'){if(!isOwner(chat,env))return;const rr=await api(env,{action:'teacher_bot_update',chat_id:chat});return botAdmin(chat,env,cq.message.message_id)}if(op==='forceadmin'){if(!isOwner(chat,env))return;return adminForce(chat,env,cq.message.message_id)}if(op==='forceadd'){if(!isOwner(chat,env))return;return adminForcePrompt(chat,env,cq.message.message_id)}if(op==='forceadm'){if(!isOwner(chat,env))return;const idx=Number(parts[1]||-1);const rr=await api(env,{action:'force_channel_toggle',chat_id:chat,index:idx});return adminForce(chat,env,cq.message.message_id)}if(op==='forcedel'){if(!isOwner(chat,env))return;const idx=Number(parts[1]||-1);const rr=await api(env,{action:'force_channel_delete',chat_id:chat,index:idx});return adminForce(chat,env,cq.message.message_id)}if(op==='admin_users'){if(!isOwner(chat,env))return;return adminUsers(chat,env,cq.message.message_id,Number(parts[1]||0))}if(op==='admin_panels'){if(!isOwner(chat,env))return;return adminPanels(chat,env,cq.message.message_id,Number(parts[1]||0))}if(op==='admin_find'){if(!isOwner(chat,env))return;await setState(env,chat,'await_admin_id');return edit(chat,cq.message.message_id,'<b>🔎 مدیریت کاربر با ID</b>\n\nآی‌دی عددی کاربر را ارسال کن.',env,KB([[B('⬅️ ادمین','admin','','primary')]]))}if(op==='admin_health'){if(!isOwner(chat,env))return;return adminHealth(chat,env,cq.message.message_id)}if(op==='broadcast'){if(!isOwner(chat,env))return;return broadcastPrompt(chat,env,cq.message.message_id)}if(op==='u'){if(!isOwner(chat,env))return;return userInfo(chat,env,cq.message.message_id,parts[1]||'')}if(op==='userpanels'){if(!isOwner(chat,env))return;return userPanels(chat,env,cq.message.message_id,parts[1]||'')}if(op==='userreset'){if(!isOwner(chat,env))return;return userResetPrompt(chat,env,cq.message.message_id,parts[1]||'')}if(op==='userresetok'){if(!isOwner(chat,env))return;const rr=await api(env,{action:'admin_user_reset',chat_id:chat,target:parts[1]||''});return edit(chat,cq.message.message_id,rr.ok?'<b>🧹 ریست انجام شد</b>\n\n'+quote('اطلاعات منابع کاربر از سیستم پاک شد و کاربر می‌تواند دوباره از صفر شروع کند.'):'<b>❌ ریست ناموفق</b>\n\n'+esc(rr.error||'خطا'),env,KB([[B('👥 کاربران','admin_users:0','','primary')],[B('⬅️ ادمین','admin','','primary')]]))}if(op==='ban'||op==='unban'){if(!isOwner(chat,env))return;const target=parts[1]||'',r=await api(env,{action:op,chat_id:chat,target});if(r.ok)await env.BOT_DB.prepare('UPDATE users SET banned=? WHERE chat_id=?').bind(op==='ban'?1:0,target).run().catch(()=>{});return userInfo(chat,env,cq.message.message_id,target)}if(op==='admin_panel'){if(!isOwner(chat,env))return;return adminPanel(chat,env,cq.message.message_id,parts[1]||'')}}
}
export default {async fetch(req,env,ctx){BC_CTX=ctx||null;BC_SELF=req.url;if(req.method!=='POST')return new Response('DEMON TEACHER BOT OK',{headers:{'content-type':'text/plain; charset=utf-8'}});if(env.WEBHOOK_SECRET&&req.headers.get('x-bc-secret')===String(env.WEBHOOK_SECRET)){try{const b=await req.json();await bcRun(env,Number(b.bc))}catch(e){console.log('bc error',e)}return new Response('ok')}if(env.WEBHOOK_SECRET&&(req.headers.get('x-telegram-bot-api-secret-token')||'')!==env.WEBHOOK_SECRET)return new Response('forbidden',{status:403});try{await handle(await req.json(),env)}catch(e){console.log('teacher error',e);if(req.headers.get('x-selftest')==='1')return new Response('ERR '+String((e&&e.message)||e),{status:500})}return new Response('ok')}};
