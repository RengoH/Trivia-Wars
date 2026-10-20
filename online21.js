(()=>{
const $=id=>document.getElementById(id);let active=false,info=null,run=null,defense=false,busy=false,timer=null,answered=false,seconds=10;
const cfg=()=>{try{return JSON.parse(localStorage.getItem('tw9-sb-config')||'null')}catch{return null}};
const sess=()=>{try{return JSON.parse(localStorage.getItem('tw9-sb-session')||'null')}catch{return null}};
async function rpc(fn,body={}){
 const c=cfg();let s=sess();if(!c||!s)throw Error('Logga in i Onlinevärld först.');
 // Refresh only if near expiry. The original online bridge can also refresh sessions.
 if(s.expires_at && s.expires_at < Math.floor(Date.now()/1000)+60 && s.refresh_token){
  const r=await fetch(c.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
  if(!r.ok)throw Error('Inloggningen har gått ut. Logga in igen.');s=await r.json();localStorage.setItem('tw9-sb-session',JSON.stringify(s));
 }
 const r=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:c.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={message:raw}};
 if(!r.ok)throw Error(data.message||data.error||'Serverfel '+r.status);return data;
}
const status=t=>{$('tw21Info').textContent=' · '+t};
const err=e=>{status('Fel: '+e.message);alert(e.message)};
const region=i=>['Frostvik','Skogsriket','Bergslandet','Västmarkerna','Drakriket','Sydlanden'][Math.min(5,Math.floor(WORLD.points[i][0]/256))];
const tier=i=>window.tw21Levels?.[i]??WORLD.tiers[i];
const level=i=>['Skyddad huvudborg','Vanligt','Befäst','Legendariskt'][tier(i)];
const format=d=>d?new Date(d).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'}):'';
const statusText=s=>({attacking:'Anfallet pågår',pending:'Väntar på försvar',attacker_won:'Anfallaren vann',defender_won:'Försvararen vann',neutral_won:'Området erövrat',neutral_lost:'Erövringen misslyckades',cancelled:'Avbruten'})[s]||s;
const box=document.createElement('section');box.id='tw21Quiz';box.className='panel hidden';box.style.cssText='position:fixed;z-index:220;inset:3vh 5vw;max-width:780px;max-height:92vh;overflow:auto;box-shadow:0 0 0 100vmax #000c';document.body.append(box);
function hideQuiz(){clearInterval(timer);box.classList.add('hidden');box.replaceChildren()}
function appendText(parent,tag,txt){let n=document.createElement(tag);n.textContent=txt;parent.append(n);return n}
function btn(parent,label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;parent.append(b);return b}
function owned(i){return (info?.owners||[]).find(o=>o.cell===i)}
function adjacent(i){return WORLD.neighbors[i].some(j=>window.tw21Owned?.has(j))}
function showDetails(i,d){
 const h=appendText(d,'h2',i===null?'🌍 Stora onlinevärlden':window.tw21TerritoryName(i)+' · '+region(i));
 if(i===null){appendText(d,'p','Välj ett område på kartan. Gulstreckade gränser visar möjliga erövringar.');return}
 const o=owned(i),home=tier(i)===0;
 appendText(d,'p',level(i)+(o?' · Ägs av '+o.realm:' · Neutral mark'));
 if(home){appendText(d,'p','Huvudborgar är permanent skyddade.');return}
 if(o?.kingdom===info?.mine){appendText(d,'p','Det här territoriet tillhör ditt rike.');return}
 if(!adjacent(i)){appendText(d,'p','Detta område gränsar inte till ditt rike.');return}
 btn(d,o?'⚔ Utmana '+o.realm:'⚔ Erövra neutralt område',async()=>{
  try{if(busy)return;busy=true;const q=await rpc('tw21_start',{p_cell:i});run=q.run_id;defense=false;showQuiz(q)}catch(e){err(e)}finally{busy=false}
 });
}
window.tw21RenderDetails=showDetails;
function paint(){
 if(!active||!info)return;
 window.tw21Owned=new Set(info.owners.filter(o=>o.kingdom===info.mine).map(o=>o.cell));
 const paths=$('cells').querySelectorAll('polygon');
 for(let i=0;i<paths.length;i++){
  const p=paths[i],o=owned(i);p.style.fill=o?(o.color&&/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#e8bd59'):'';
  p.style.fillOpacity=o?'.44':'';
  p.style.stroke=o?'#e4c987':'';p.style.strokeOpacity=o?'.75':'';
  p.classList.toggle('owned',!!o);p.classList.toggle('adjacent',!o&&tier(i)>0&&adjacent(i));
 }
 const stats=$('stats');stats.textContent='Online: '+window.tw21Owned.size+' områden · Attacker: '+info.attacks_left+'/5';
}
function renderLists(){
 $('onlinePlayer').textContent='🌍 Värld '+info.world+' · '+info.realm+' · '+window.tw21Owned.size+' områden · Attacker kvar '+info.attacks_left+'/5';
 const ranks=$('onlineRanking');ranks.replaceChildren();(info.leaderboard||[]).forEach((r,i)=>appendText(ranks,'p',(i+1)+'. '+r.realm+(r.mine?' (du)':'')+' · '+r.territories+' områden · '+r.points+' poäng'));
 const events=$('onlineEvents');events.replaceChildren();const duels=$('onlineDuels');duels.replaceChildren();
 const all=info.duels||[];
 if(!all.length){appendText(events,'p','Inga händelser ännu.');appendText(duels,'p','Inga dueller ännu.');return}
 all.forEach(d=>{
  let text=(d.defender==='Neutral mark'?'Erövring av neutral mark':d.attacker+' mot '+d.defender)+' · '+statusText(d.status)+' · '+window.tw21TerritoryName(d.cell);
  appendText(events,'p','🔔 '+text+' · '+format(d.created_at));
  const row=document.createElement('div');row.style.cssText='padding:9px 0;border-bottom:1px solid #455';appendText(row,'span','⚔ '+text+' ');
  if(d.status==='pending'&&d.mine_defense)btn(row,'🛡 Försvara',async()=>{try{const q=await rpc('tw21_defend',{p_run:d.id});run=d.id;defense=true;showQuiz(q)}catch(e){err(e)}});
  if(d.status==='attacking'&&d.mine_attack)btn(row,'Fortsätt anfall',async()=>{try{const q=await rpc('tw21_question',{p_run:d.id,p_defense:false});run=d.id;defense=false;showQuiz(q)}catch(e){err(e)}});
  duels.append(row);
 });
}
let refreshBusy=false;
async function refresh(){
 if(!active||refreshBusy)return;
 refreshBusy=true;
 try {
 info=await rpc('tw21_sync');const slot=info.slot;if(slot<1||slot>150)throw Error('Din plats saknar huvudborg i 600-världen.');
 window.tw21Active=true;
 window.tw21Realm=info.realm;
 window.tw21Levels=Array.from({length:600},(_,i)=>WORLD.tiers[i]);
 for(const c of info.levels||[])window.tw21Levels[c.cell]=c.difficulty;
 window.tw21Owned=new Set(info.owners.filter(o=>o.kingdom===info.mine).map(o=>o.cell));
 const homeCell=(info.levels||[]).find(c=>c.home_slot===slot);
 window.tw21SetHome(homeCell?homeCell.cell:WORLD.homes[slot-1]);
 paint();renderLists();status('Online · '+info.owners.length+' ägda områden i världen · synkas automatiskt');
 } finally {refreshBusy=false}
}
let autoSync=null;
function stopAutoSync(){if(autoSync){clearInterval(autoSync);autoSync=null}}
function startAutoSync(){
 stopAutoSync();
 autoSync=setInterval(()=>{
  if(active&&!document.hidden&&!busy&&box.classList.contains('hidden'))refresh().catch(e=>status('Synkronisering misslyckades: '+e.message));
 },12000);
}
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&active)refresh().catch(e=>status('Synkronisering misslyckades: '+e.message));
});
async function activate(){try{active=true;await refresh();startAutoSync();$('tw21Activate').textContent='🔄 Uppdatera stora onlinekartan';$('onlinePanel').classList.add('hidden');$('game').scrollIntoView({behavior:'smooth'})}catch(e){stopAutoSync();active=false;window.tw21Active=false;err(e)}}
$('tw21Activate').onclick=()=>active?refresh().catch(err):activate();
$('onlineRefresh').addEventListener('click',()=>{if(active)refresh().catch(err)});
$('onlineBtn').addEventListener('click',()=>{if(active)refresh().catch(err)});
$('onlineLogout').addEventListener('click',()=>{stopAutoSync();active=false;window.tw21Active=false;window.tw21Realm=null;window.tw21Levels=null;info=null;window.tw21Owned=new Set();window.tw21RefreshMap();$('tw21Activate').textContent='🌍 Aktivera stora onlinekartan'});
// Ensure local map rendering never overwrites the server's colors.
const obs=new MutationObserver(()=>{if(active)paint()});obs.observe($('cells'),{childList:true});
// Reuse the main quiz overlay but never let the client calculate authoritative results.
function showQuiz(q){
 if(q.finished){finish(q);return}
 if(!q||!q.options){alert('Servern returnerade ingen fråga.');return}
 box.classList.remove('hidden');box.replaceChildren();appendText(box,'h2',(defense?'🛡 Försvara territoriet':'⚔ Erövra territoriet'));
 appendText(box,'p','Fråga '+q.number+' av 5 · '+q.category);appendText(box,'h2',q.question);
 const time=appendText(box,'p','');const answers=document.createElement('div');answers.className='answers';box.append(answers);
 const deadline=new Date(q.deadline).getTime();answered=false;
 function tick(){seconds=Math.max(0,(deadline-Date.now())/1000);time.textContent='Tid kvar: '+seconds.toFixed(1).replace('.',',')+' sekunder';if(seconds<=0&&!answered)submit(-1)}
 clearInterval(timer);timer=setInterval(tick,100);tick();
 q.options.forEach((opt,i)=>btn(answers,String.fromCharCode(65+i)+'. '+opt,()=>submit(i)));
 async function submit(i){if(answered)return;answered=true;clearInterval(timer);[...answers.children].forEach(b=>b.disabled=true);
  try{const next=await rpc('tw21_answer',{p_run:run,p_defense:defense,p_answer:i});if(next.finished)finish(next);else showQuiz(next)}catch(e){err(e);hideQuiz()}
 }
}
async function finish(result){hideQuiz();alert(statusText(result.status)+(result.correct!==undefined?' · '+result.correct+' av 5 rätt':'')+(result.score!==undefined?' · '+result.score+' poäng':''));
 try{await refresh()}catch(e){err(e)}
}
})();