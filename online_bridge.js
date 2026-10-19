(()=>{
const $=id=>document.getElementById(id);let cfg=null,session=null;
const setStatus=t=>$('onlineStatus').textContent=t;
try{cfg=JSON.parse(localStorage.getItem('tw9-sb-config')||'null');session=JSON.parse(localStorage.getItem('tw9-sb-session')||'null')}catch{}
function show(){ $('onlineConnect').classList.toggle('hidden',!!cfg);$('onlineAuth').classList.toggle('hidden',!cfg||!!session);$('onlineData').classList.toggle('hidden',!cfg||!session);if(cfg){$('onlineUrl').value=cfg.url;$('onlineKey').value=cfg.key} }
async function request(path,method='GET',data=null,auth=true){
 if(!cfg)throw Error('Anslutning saknas');const h={'apikey':cfg.key,'Content-Type':'application/json'};
 if(auth&&session?.access_token)h.Authorization='Bearer '+session.access_token;
 const res=await fetch(cfg.url.replace(/\/$/,'')+path,{method,headers:h,body:data===null?undefined:JSON.stringify(data)});
 const raw=await res.text();let body;try{body=JSON.parse(raw)}catch{body={message:raw}};
 if(!res.ok)throw Error(body.message||body.error_description||body.msg||'HTTP '+res.status);return body;
}
async function token(){if(!session?.refresh_token)return;const next=await request('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false);session=next;localStorage.setItem('tw9-sb-session',JSON.stringify(next))}
function table(rows,cols){const t=document.createElement('table');t.style.cssText='width:100%;border-collapse:collapse';const tr=document.createElement('tr');cols.forEach(([name])=>{const th=document.createElement('th');th.textContent=name;th.style.cssText='text-align:left;padding:8px;border-bottom:1px solid #b38c50';tr.append(th)});t.append(tr);rows.forEach(row=>{const r=document.createElement('tr');cols.forEach(([,fn])=>{const td=document.createElement('td');td.textContent=String(fn(row)??'');td.style.cssText='padding:8px;border-bottom:1px solid #445';r.append(td)});t.append(r)});return t}
async function load(){if(!cfg||!session)return;setStatus('Hämtar uppgifter från Supabase…');
 try{await token();const data=await request('/rest/v1/rpc/tw15_dashboard','POST',{});$('onlinePlayer').textContent='Värld '+data.world+' · Attacker kvar enligt gamla systemet: '+data.attacks_left+'/5';
 $('onlineRanking').replaceChildren(table(data.leaderboard||[],[['Plats',r=>(data.leaderboard||[]).indexOf(r)+1],['Kungadöme',r=>r.realm_name+(r.mine?' (du)':'')],['Områden (gamla kartan)',r=>r.territories],['Poäng',r=>r.points]]));
 const events=await request('/rest/v1/rpc/tw14_events','POST',{}).catch(e=>({error:e.message}));const box=$('onlineEvents');box.replaceChildren();
 if(events.error)box.textContent='Händelser kan inte hämtas: '+events.error;else{const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px';pre.textContent=JSON.stringify(events,null,2).slice(0,6000);box.append(pre)}
 const duels=await request('/rest/v1/rpc/tw13_my_duels','POST',{}).catch(e=>({error:e.message}));const d=$('onlineDuels');d.replaceChildren();
 if(duels.error)d.textContent='Dueller kan inte hämtas: '+duels.error;else{const arr=Array.isArray(duels)?duels:duels.duels||[];if(!arr.length)d.textContent='Inga registrerade dueller.';else d.append(table(arr,[['Status',x=>x.status],['Territorium (gamla kartan)',x=>x.territory_index],['Skapad',x=>x.created_at?new Date(x.created_at).toLocaleString('sv-SE'):'']]));}
 setStatus('Ansluten. Onlineuppgifterna kommer från den tidigare 25-territorievärlden.');
 }catch(e){setStatus('Kunde inte läsa onlinevärlden: '+e.message)} }
$('onlineBtn').onclick=()=>{$('onlinePanel').classList.remove('hidden');$('onlinePanel').scrollIntoView({behavior:'smooth'});show();if(cfg&&session)load()};
$('onlineClose').onclick=()=>{$('onlinePanel').classList.add('hidden');$('game').scrollIntoView({behavior:'smooth'})};
$('onlineSave').onclick=()=>{const url=$('onlineUrl').value.trim().replace(/\/$/,''),key=$('onlineKey').value.trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!key){setStatus('Ange en giltig Supabase-URL och publicerbar nyckel.');return}cfg={url,key};localStorage.setItem('tw9-sb-config',JSON.stringify(cfg));show();setStatus('Anslutning sparad. Logga in.')};
$('onlineLogin').onclick=async()=>{try{const email=$('onlineEmail').value.trim(),password=$('onlinePassword').value;session=await request('/auth/v1/token?grant_type=password','POST',{email,password},false);localStorage.setItem('tw9-sb-session',JSON.stringify(session));$('onlinePassword').value='';show();await load()}catch(e){setStatus('Inloggning misslyckades: '+e.message)}};
$('onlineLogout').onclick=()=>{session=null;localStorage.removeItem('tw9-sb-session');show();setStatus('Utloggad.')};$('onlineRefresh').onclick=load;
show();
})();