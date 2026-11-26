'use strict';
const $ = (s, root = document) => root.querySelector(s);
const app = $('#app'), modal = $('#modal');
const STYLES = ['lilac','coral','mint','butter','blue','rose'];
const STYLE_NAMES = ['しましまリボン','水玉ボックス','ミントの贈りもの','おひさまバッグ','青いお手紙','ハートの包み'];
const positions = [[16,34,-9],[83,32,9],[23,62,8],[77,62,-8],[13,82,-6],[88,84,7],[36,81,-4],[65,83,5],[10,52,4],[91,51,-4],[32,31,6],[67,31,-6]];
const e = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name) => {
  const paths = {gift:'<path d="M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8H8a3 3 0 1 1 3-3zM12 8h4a3 3 0 1 0-3-3z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',link:'<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',check:'<path d="m5 12 4 4L19 6"/>',pen:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',spark:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7z"/>'};
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
};
function readLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveLocal(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { toast('このブラウザでは保存できません。ボードのリンクを控えておいてね。'); } }
function readOwnerKeys() {
  const items=readLocal('yoru.owner-keys',[]),seen=new Set();
  return Array.isArray(items)?items.filter(k=>k&&typeof k.id==='string'&&/^[a-f0-9]{32}$/.test(k.id)&&typeof k.ownerToken==='string'&&/^[a-f0-9]{64}$/.test(k.ownerToken)&&!seen.has(k.id)&&seen.add(k.id)).map(({id,ownerToken})=>({id,ownerToken})):[];
}
function demoStorageKey(boardId) {return boardId==='sample'?'yoru.demo-gifts':'yoru.demo-gifts.'+boardId;}
function readDemoGifts(boardId) {
  const items=readLocal(demoStorageKey(boardId),[]),seen=new Set();
  return Array.isArray(items)?items.filter(g=>g&&typeof g.id==='string'&&/^[a-f0-9-]{36}$/.test(g.id)&&typeof g.sender==='string'&&g.sender.trim()&&g.sender.length<=24&&typeof g.message==='string'&&g.message.trim()&&g.message.length<=1000&&STYLES.includes(g.style)&&!seen.has(g.id)&&seen.add(g.id)).slice(-94).map(({id,sender,message,style})=>({id,sender,message,style})):[];
}
function validDemoDate(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const stamp=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value&&Date.parse(value+'T00:00:00+09:00')>=Date.now()+3600000;
}
function dateString(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function futureDate(days = 7) { const d=new Date(); d.setDate(d.getDate()+days); return dateString(d); }
function prettyDate(date, year = false) { const [y,m,d]=date.split('-'); return `${year?y+'年 ':''}${Number(m)}月${Number(d)}日`; }
function shortDate(date) { return date.replaceAll('-','.'); }
function timeZoneLabel(tz) { return {'Asia/Tokyo':'日本時間','America/New_York':'ニューヨーク時間','America/Los_Angeles':'ロサンゼルス時間','Europe/London':'ロンドン時間','UTC':'UTC'}[tz]||tz; }
let savedKeys = readOwnerKeys();
let state={board:null,demo:false,page:0,clockOffset:0,view:'board',owned:[],loading:false};
let demoDate=readLocal('yoru.demo-date',null);
if (!validDemoDate(demoDate)) {demoDate=futureDate();saveLocal('yoru.demo-date',demoDate);}
const demoGifts=[
  {id:'demo-1',sender:'ゆい',style:'lilac',message:'みお、お誕生日おめでとう！\nいつもの帰り道、どうでもいい話で笑える時間がいちばん好き。\n今年もいっぱい寄り道しようね ♡'},
  {id:'demo-2',sender:'はると',style:'coral',message:'誕生日おめでとう！\nテスト前にノート貸してくれてありがとう笑\n今年はこっちが助ける番！いい一年にしてね。'},
  {id:'demo-3',sender:'saki',style:'mint',message:'HAPPY BIRTHDAY, MIO 🎂\n好きな曲が増えるたびに、みおに送りたくなる！\nまた一緒にライブ行こう。だいすき！'},
  {id:'demo-4',sender:'りん',style:'butter',message:'みおちゃんおめでとう〜！\n話しかけてくれたあの日から、学校がちょっと楽しくなったよ。\nいつもありがとう。素敵な一年になりますように。'},
  {id:'demo-5',sender:'あおい',style:'blue',message:'お誕生日おめでとう！\n今年の目標：一緒に海に行くこと。\nまだまだ思い出増やしていこうね！'},
  {id:'demo-6',sender:'nana',style:'rose',message:'0時ぴったりのおめでとう、届いた？\nなんでもない日も、みおといると特別になる。\n生まれてきてくれてありがとう ♡'}
];
function sampleBoard(year=null) {
  const date=year?`${year}-06-12`:demoDate,id=year?'sample-'+year:'sample';
  return {id,name:'Mio',date,timezone:'Asia/Tokyo',theme:year==='2024'?'peach':year==='2023'?'mint':'lilac',note:'ひとことでも、長い手紙でも。\nきみからの「おめでとう」が、\nいちばんうれしい。♡',unlockAt:new Date(date+'T00:00:00+09:00').getTime(),createdAt:Date.now(),unlocked:!!year,gifts:[...demoGifts,...readDemoGifts(id)]};
}
async function api(path,options={}) {
  const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});
  const body=await response.json().catch(()=>({error:'接続できませんでした。もう一度試してね。'}));
  if(!response.ok) throw new Error(body.error||'うまく保存できませんでした。もう一度試してね。');
  if(typeof body.serverNow==='number') state.clockOffset=body.serverNow-Date.now();
  return body;
}
function setNav(view) { document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.action===(view==='memories'?'memories':'home'))); }
function navigate(path) { if(location.pathname+location.search!==path) history.pushState({},'',path); route(); }
async function route() {
  const id=location.pathname.match(/^\/b\/([a-f0-9]{32})\/?$/)?.[1];
  if(location.pathname==='/memories') return showMemories();
  state.view='board';state.page=0;setNav('board');
  if(id){state.demo=false;state.loading=true;app.innerHTML='<div class="loading">プレゼントを並べています…</div>';try {const data=await api('/boards/'+id);if(location.pathname.includes(id)){state.board=data.board;renderBoard();}}catch(err){app.innerHTML=`<div class="error-page"><p class="eyebrow">OOPS, A LITTLE LOST.</p><h1>ボードを開けませんでした</h1><p>${e(err.message)}</p><button class="button dark" data-action="home">ホームへ戻る</button></div>`;}finally{state.loading=false;}}
  else if(location.pathname!=='/' && location.pathname!=='/index.html'){app.innerHTML='<div class="error-page"><h1>このページは見つかりませんでした</h1><button class="button dark" data-action="home">ホームへ戻る</button></div>';}
  else {state.demo=true;const year=new URLSearchParams(location.search).get('sample');state.board=sampleBoard(['2025','2024','2023'].includes(year)?year:null);renderBoard();}
}
function renderBoard() {
  const b=state.board;if(!b)return;
  document.title=`${b.name}のバースデーボード — yoru`;
  const isOwner=savedKeys.some(k=>k.id===b.id);
  const name=e(b.name), unlocked=b.unlocked;
  state.page=Math.min(state.page,Math.max(0,Math.ceil(b.gifts.length/12)-1));
  const pager=b.gifts.length>12?`<span class="pager"><button data-action="page-prev" aria-label="前のプレゼント">←</button>${state.page+1} / ${Math.ceil(b.gifts.length/12)}<button data-action="page-next" aria-label="次のプレゼント">→</button></span>`:'';
  app.innerHTML=`<section class="hero"><div><div class="eyebrow"><span class="dot"></span>FOR YOUR ONCE-A-YEAR DAY</div><h1>「おめでとう」を、<br><span class="underline">開けるたのしみに。</span></h1><p>友だちの言葉が、ひとつずつプレゼントに。<br>誕生日の0時、きみだけのボードがひらく。</p></div><div class="hero-note" aria-hidden="true"><span class="little-star">✧</span><span class="hand">a little wish, just for you.</span><br>その日まで、ひみつ。<svg viewBox="0 0 110 65" fill="none"><path d="M6 4c49-5 67 24 46 35-14 7-24-8-10-15 17-9 44 6 44 32m-12-8 12 9 9-11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></div></section>
  <section class="content"><div class="board-heading"><div><h2><span class="en">${name}’s</span> birthday board</h2><p class="subtitle">${prettyDate(b.date,true)}<span aria-hidden="true"> &nbsp; / &nbsp; </span>${unlocked?'何度でも、開けていい日。':'おめでとう、こっそり集めています。'}</p></div><span class="pill">${state.demo?'おためしボード':isOwner?'あなたのボード':'友だちのボード'}</span></div>
  <div class="board-layout"><div><div class="canvas-wrap theme-${e(b.theme)}"><div class="board-canvas" aria-label="${name}のプレゼントボード"><span class="canvas-label">a collection of love.</span><span class="canvas-number">No. ${b.date.slice(2,4)}</span><div class="birthday-banner" aria-hidden="true">${'HAPPY BIRTHDAY'.split('').map(x=>`<span>${x===' '?'&nbsp;':x}</span>`).join('')}</div><div class="date-tag">${shortDate(b.date)}</div><div class="cake-piece"><img src="/art/cake.svg" alt="3本のキャンドルがのったバースデーケーキ"></div><img class="doodle doodle-star" src="/art/star.svg" alt=""><span class="doodle doodle-heart" aria-hidden="true">♡</span><span class="doodle doodle-spark" aria-hidden="true">✧</span><span class="doodle doodle-twinkle" aria-hidden="true">✳</span><div id="gift-layer">${renderGifts(b)}</div><div class="board-stamp">${unlocked?'OPEN WITH LOVE. KEEP FOREVER.':'DO NOT OPEN UNTIL '+shortDate(b.date)}</div></div><div class="board-dedication"><div class="cake-caption"><span>to.</span>${name}</div>${b.gifts.length ? '' : '<p class="empty-hint">最初のプレゼントを、待っています。</p>'}</div><div class="canvas-bottom"><span class="gift-count">${icon('gift')}<span><strong>${b.gifts.length}</strong> こ のプレゼント</span></span><span class="lock-caption">${icon(unlocked?'check':'lock')}${unlocked?'プレゼントをタップして読んでね':'メッセージは誕生日まで、ひみつ。'}</span></div></div>
  <div class="demo-strip">${state.demo?`<span>${pager||'サンプルのメッセージで体験できます'}</span><button data-action="demo-toggle">${unlocked?'開封前に戻す':'誕生日の0時を体験'} ${icon('arrow')}</button>`:`<span>${isOwner?'このブラウザの「思い出」に保存済み':'リンクを知っている友だちのためのボード'}</span><span>${pager||'a little birthday magic. ✳'}</span>`}</div></div>
  <aside><div class="side-card"><p class="side-overline">${unlocked?'THE WAIT IS OVER':'COUNTING DOWN TO YOUR DAY'}</p>${unlocked?`<div class="unlocked-title">Make a wish!</div><p class="unlocked-note">${name}、お誕生日おめでとう。<br>みんなの言葉を、ゆっくり開けよう。</p>`:`<h3>プレゼントがひらくまで</h3><div class="countdown" role="timer" aria-label="誕生日までの残り時間"><div class="time-unit"><span class="time-num" id="count-days">00</span><small>DAYS</small></div><span class="time-colon">:</span><div class="time-unit"><span class="time-num" id="count-hours">00</span><small>HOURS</small></div><span class="time-colon">:</span><div class="time-unit"><span class="time-num" id="count-minutes">00</span><small>MIN</small></div></div><p class="unlock-time">${prettyDate(b.date)} 0:00 にオープン<br><span>${timeZoneLabel(b.timezone)}</span></p>`}<div class="side-divider"></div><button class="button dark full" data-action="${isOwner||state.demo?'share':'compose'}">${icon(isOwner||state.demo?'link':'gift')}${isOwner||state.demo?'ボードをシェア':'プレゼントを贈る'}</button><button class="button outline full" data-action="${isOwner||state.demo?'compose':'share'}">${icon(isOwner||state.demo?'pen':'link')}${isOwner||state.demo?'プレゼントを贈る':'ボードをシェア'}</button><p class="side-copy">${isOwner||state.demo?'リンクを送るだけ。<br>「おめでとう」の場所を、友だちに。':'贈る人の登録は不要。<br>短いひとことも、うれしいプレゼント。'}</p></div><div class="note-card"><span class="eyebrow">a note for my friends</span><p>${e(b.note||'来てくれてありがとう。\nひとこと、置いていってね。')}</p><div class="small-heart" aria-hidden="true">♡</div></div></aside></div>
  <section class="memories-preview"><div class="section-heading"><h2>去年も、その前も。<span>little time capsules</span></h2><button class="text-button" data-action="memories">思い出を見る ${icon('arrow')}</button></div><div class="memory-grid">${['2025','2024','2023'].map((y,i)=>memoryCard(sampleBoard(y),true,i)).join('')}</div></section></section>`;
  updateCountdown();
}
function renderGifts(b) {
  if(!b.gifts.length)return `<button class="gift-item empty-gift" style="--x:17%;--y:52%;--r:-8deg" data-action="compose" aria-label="最初のプレゼントを贈る"><img src="/art/gift-lilac.svg" alt=""><span class="sender-label">you?</span></button><button class="gift-item empty-gift" style="--x:84%;--y:52%;--r:8deg" data-action="compose" aria-label="プレゼントを贈る"><img src="/art/gift-coral.svg" alt=""><span class="sender-label">you?</span></button>`;
  return b.gifts.slice(state.page*12,state.page*12+12).map((g,i)=>{const [x,y,r]=positions[i];return `<button class="gift-item ${b.unlocked?'is-open':''}" data-gift="${e(g.id)}" aria-label="${e(g.sender)}からのプレゼント${b.unlocked?'を読む':'、誕生日に開封'}" style="--x:${x}%;--y:${y}%;--r:${r}deg;--delay:${i*.035}s"><img src="/art/gift-${STYLES.includes(g.style)?g.style:'lilac'}.svg" alt=""><span class="sender-label">${e(g.sender)}</span></button>`;}).join('');
}
function memoryCard(b,demo,index=0) {return `<button class="memory-card" ${demo?`data-sample="${b.date.slice(0,4)}"`:`data-board="${e(b.id)}"`}><span class="memory-thumb"><img src="/art/${index%3===0?'cake':'gift-'+STYLES[(index+1)%6]}.svg" alt=""></span><span class="memory-info"><strong>${e(b.name)}’s ${b.date.slice(0,4)}${demo?'<span class="mini-label">見本</span>':''}</strong><small>${shortDate(b.date)} &nbsp; · &nbsp; ${b.gifts.length} gifts</small></span><span class="memory-arrow" aria-hidden="true">↗</span></button>`;}
async function showMemories() {
  state.view='memories';setNav('memories');document.title='思い出 — yoru';app.innerHTML='<div class="loading">思い出を取り出しています…</div>';
  let fetchError='';
  try {state.owned=savedKeys.length?(await api('/boards/lookup',{method:'POST',body:JSON.stringify({boards:savedKeys})})).boards:[];} catch(err){fetchError=err.message;state.owned=[];}
  if(state.view!=='memories')return;
  const future=state.owned.filter(b=>!b.unlocked),past=state.owned.filter(b=>b.unlocked);
  app.innerHTML=`<div class="content"><section class="archive-hero"><div class="eyebrow"><span class="dot"></span>YOUR LITTLE TIME CAPSULES</div><h1>あの日の言葉は、ここに。</h1><p>一年に一度の「おめでとう」。<br>何度だって、うれしくなっていい。</p></section>${fetchError?`<div class="empty-state">${e(fetchError)}<br><button class="button outline" data-action="memories-retry">もう一度読み込む</button></div>`:`${future.length?`<section class="archive-section"><h2>もうすぐ、誕生日。</h2><div class="memory-grid">${future.map((b,i)=>memoryCard(b,false,i)).join('')}</div></section>`:''}<section class="archive-section"><h2>あなたの思い出</h2>${past.length?`<div class="memory-grid">${past.map((b,i)=>memoryCard(b,false,i)).join('')}</div>`:`<div class="empty-state">${future.length?'誕生日を迎えたボードが、ここに残ります。':'最初の「おめでとう」を、集めてみよう。'}<br><button class="button dark" data-action="create">${icon('gift')} ボードをつくる</button></div>`}</section>`}<section class="archive-section"><div class="section-heading"><h2>こんなふうに、残せます。<span>sample memories</span></h2></div><div class="memory-grid">${['2025','2024','2023'].map((y,i)=>memoryCard(sampleBoard(y),true,i)).join('')}</div></section><p class="no-board-note">このブラウザで作ったボードを表示しています。<br>ほかの端末では、保存したボードのリンクから見返せます。</p></div>`;
}
function showDialog(content) {$('#modal-content').innerHTML=`<div class="modal-inner"><button class="modal-close" data-action="close" aria-label="閉じる">×</button>${content}</div>`;if(!modal.open)modal.showModal();}
function createDialog() {
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tokyo';
  showDialog(`<div class="eyebrow">A BOARD, JUST FOR YOU</div><h2 id="modal-title">今年の「おめでとう」の場所。</h2><p class="modal-lead">まずは、名前と誕生日を。<br>あとはリンクを友だちに送るだけ。</p><form id="create-form"><input type="hidden" name="timezone" value="${e(zone)}"><label class="field"><span class="field-label">よばれたい名前</span><input class="input" name="name" required maxlength="24" placeholder="例：みお" autocomplete="nickname"></label><div class="field-row"><div class="field"><label class="field-label" for="birthday-date">お祝いする日</label><input class="input" id="birthday-date" type="date" name="date" required min="${dateString()}" value="${futureDate()}"><p class="form-note">${e(timeZoneLabel(zone))}の0時にオープン</p></div></div><fieldset class="field" style="border:0;padding:0"><legend class="field-label">ボードの色</legend><div class="theme-options">${[['lilac','ライラック'],['peach','ピーチ'],['mint','ミント']].map(([value,label],i)=>`<label class="theme-option"><input type="radio" name="theme" value="${value}" ${i===0?'checked':''}><span class="swatch ${value}"></span>${label}</label>`).join('')}</div></fieldset><label class="field"><span class="field-label">友だちへひとこと<small>書かなくてもOK</small></span><input class="input" name="note" maxlength="120" placeholder="ひとこと、置いていってね ♡"></label><p class="form-note">メッセージは選んだ日の0時に公開されます。<br>開封後は、リンクを知っている人が読むことができます。</p><div class="form-error" role="alert"></div><button class="button dark full" type="submit">${icon('spark')} ボードをつくる</button></form>`);
}
function composeDialog() {
  const b=state.board;if(!b)return;
  if(b.gifts.length>=100){toast('プレゼントが100こ集まりました。このボードは満員です。');return;}
  showDialog(`<div class="eyebrow">WRAP YOUR WORDS IN A LITTLE GIFT</div><h2 id="modal-title">${e(b.name)}に、なに贈ろう？</h2><p class="modal-lead">上手な言葉じゃなくていい。きみの言葉がいい。</p><form id="gift-form" data-key="${crypto.randomUUID()}"><fieldset class="field" style="border:0;padding:0"><legend class="field-label">プレゼントを選ぶ</legend><div class="gift-options">${STYLES.map((s,i)=>`<label class="gift-choice"><input type="radio" name="style" value="${s}" aria-label="${STYLE_NAMES[i]}" ${i===0?'checked':''}><img src="/art/gift-${s}.svg" alt=""></label>`).join('')}</div></fieldset><label class="field"><span class="field-label">きみの名前</span><input class="input" name="sender" required maxlength="24" placeholder="例：ゆい" autocomplete="nickname"></label><label class="field"><span class="field-label">お誕生日のメッセージ</span><textarea class="input" name="message" required maxlength="1000" placeholder="お誕生日おめでとう！\nいつも、ありがとう。"></textarea><span class="char-count"><span id="char-count">0</span> / 1000</span></label><p class="composer-lock">${icon('lock')}${b.unlocked?'このボードは開封済み。贈るとすぐに読めます。':prettyDate(b.date)+'の0時まで、中身はひみつ。名前だけ見えるよ。'}</p>${state.demo?'<p class="form-note">これはおためし。投稿はこのブラウザだけに保存されます。</p>':''}<div class="form-error" role="alert"></div><button class="button dark full" type="submit">${icon('gift')} ことばを包んで贈る</button></form>`);
}
function shareDialog() {
  const b=state.board;if(!b)return;
  if(state.demo){showDialog(`<div class="eyebrow">MAKE IT YOURS</div><h2 id="modal-title">次は、きみのボードを。</h2><p class="modal-lead">これはおためしのボードです。<br>自分のボードをつくると、友だちに送るリンクができるよ。</p><div class="share-tag">ひとつのリンクに、みんなの「おめでとう」。</div><button class="button dark full" data-action="create">ボードをつくる ${icon('arrow')}</button>`);return;}
  const url=location.origin+'/b/'+b.id;
  showDialog(`<div class="eyebrow">GOOD THINGS ARE MEANT TO BE SHARED</div><h2 id="modal-title">「ここに、ひとことちょうだい。」</h2><p class="modal-lead">リンクをコピーして、LINEやストーリーへ。<br>友だちはプレゼントを選んで、言葉を贈れます。</p><div class="share-tag">${e(b.name)}’s birthday · ${prettyDate(b.date)}</div><label class="sr-only" for="share-url">ボードの共有リンク</label><div class="share-box"><input class="input" id="share-url" readonly value="${e(url)}"><button class="button dark" data-action="copy">コピー</button></div>${navigator.share?`<button class="button outline full" data-action="native-share">共有先を選ぶ ${icon('arrow')}</button>`:''}<p class="form-note">${prettyDate(b.date)} 0:00（${timeZoneLabel(b.timezone)}）にオープン。<br>公開プレビューの閲覧範囲は、サイトの共有設定に従います。</p>`);
}
function readGift(id) {
  const b=state.board, i=b.gifts.findIndex(g=>g.id===id),g=b.gifts[i];if(!g)return;
  if(!b.unlocked){showDialog(`<div class="success-inner"><img class="success-gift" src="/art/gift-${e(g.style)}.svg" alt="${e(g.sender)}からのプレゼント"><div class="eyebrow">A LITTLE SECRET, FOR NOW</div><h2 id="modal-title">${e(g.sender)}から、きみへ。</h2><p>中身は、${prettyDate(b.date)}の0時に。<br>楽しみに、待っていてね。</p><button class="button outline full" data-action="close">その日まで、とっておく ${icon('lock')}</button></div>`);return;}
  showDialog(`<div class="eyebrow">A LETTER TO ${e(b.name).toUpperCase()}</div><h2 id="modal-title">${e(g.sender)}からのおめでとう。</h2><div class="message-sheet"><p>${e(g.message||'')}</p><div class="message-sign">with love, ${e(g.sender)} ♡</div></div><div class="message-nav"><button class="text-button" data-read-index="${(i-1+b.gifts.length)%b.gifts.length}" ${b.gifts.length<2?'disabled':''}>← 前の手紙</button><span>${i+1} / ${b.gifts.length}</span><button class="text-button" data-read-index="${(i+1)%b.gifts.length}" ${b.gifts.length<2?'disabled':''}>次の手紙 →</button></div>`);
}
function howDialog() {showDialog(`<div class="eyebrow">A SMALL GUIDE TO YORU</div><h2 id="modal-title">待つ時間も、プレゼント。</h2><ol class="help-steps"><li><span class="step-number">01</span><div><h3>きみのボードをつくる</h3><p>名前、誕生日、好きな色を選んで。<br>今年だけの「おめでとう」の場所ができあがり。</p></div></li><li><span class="step-number">02</span><div><h3>リンクを友だちに送る</h3><p>友だちはギフトを選んで、メッセージをひとつ。<br>誕生日までは、誰から届いたかだけ見えるよ。</p></div></li><li><span class="step-number">03</span><div><h3>誕生日の0時に、オープン</h3><p>選んだタイムゾーンの0時に、みんなの言葉がひらく。<br>ボードは「思い出」に。来年も、再来年も。</p></div></li></ol><button class="button dark full" data-action="create">わたしのボードをつくる ${icon('arrow')}</button>`);}
function aboutDialog() {showDialog(`<div class="eyebrow">MADE FOR A LITTLE BIRTHDAY MAGIC</div><h2 id="modal-title">yoru のプロトタイプ</h2><div class="about-copy"><p>ボードの作成、リンクの共有、ギフトの投稿、0時の開封、過去のボードを試せるプロトタイプです。</p><p><strong>実際につくったボード</strong>はサーバーに保存されます。誕生日前のメッセージ本文は、サーバーから送信されません。</p><p><strong>おためしボード</strong>は架空のメッセージです。「誕生日の0時を体験」で開封の雰囲気を確認できます。</p><p>アカウント登録はなく、作成したボードの一覧はこのブラウザに紐づきます。ボードのリンクも控えておいてください。サイト自体の閲覧範囲は共有設定に従います。</p></div><button class="button outline full" data-action="close">とじる</button>`);}
async function createBoard(form) {
  const submit=$('[type="submit"]',form);submit.disabled=true;submit.textContent='ボードをつくっています…';$('.form-error',form).textContent='';
  try{const payload=Object.fromEntries(new FormData(form));payload.name=payload.name.trim();if(!payload.name)throw new Error('よばれたい名前を入力してね。');const data=await api('/boards',{method:'POST',body:JSON.stringify(payload)});savedKeys.push({id:data.board.id,ownerToken:data.ownerToken});saveLocal('yoru.owner-keys',savedKeys);modal.close();navigate('/b/'+data.board.id);toast('きみのボードができました。友だちにリンクを送ろう。');}
  catch(err){$('.form-error',form).textContent=err.message;submit.disabled=false;submit.innerHTML=icon('spark')+' ボードをつくる';}
}
async function sendGift(form) {
  const b=state.board,isDemo=state.demo,sourcePath=location.pathname+location.search,payload=Object.fromEntries(new FormData(form)),button=$('[type="submit"]',form);payload.sender=payload.sender.trim();payload.message=payload.message.trim();payload.idempotencyKey=form.dataset.key;
  const isCurrent=()=>state.view==='board'&&state.demo===isDemo&&state.board?.id===b.id&&location.pathname+location.search===sourcePath;
  if(!payload.sender||!payload.message){$('.form-error',form).textContent='名前とメッセージを入力してね。';return;}
  button.disabled=true;button.textContent='プレゼントを包んでいます…';$('.form-error',form).textContent='';
  try{
    if(isDemo){const gift={...payload,id:crypto.randomUUID()};const gifts=readDemoGifts(b.id);gifts.push(gift);saveLocal(demoStorageKey(b.id),gifts);b.gifts.push(gift);}
    else {await api('/boards/'+b.id+'/gifts',{method:'POST',body:JSON.stringify(payload)});try {const fresh=await api('/boards/'+b.id);if(isCurrent())state.board=fresh.board;}catch{toast('プレゼントは届きました。ボードを更新すると表示されます。');}}
    if(!isCurrent()){toast(b.name+'のボードに、プレゼントを届けました。');return;}
    renderBoard();
    if(!modal.open||$('#gift-form')!==form){toast('プレゼントを届けました。');return;}
    showDialog(`<div class="success-inner"><img class="success-gift" src="/art/gift-${e(payload.style)}.svg" alt="贈ったプレゼント"><div class="eyebrow">YOUR WORDS, SAFELY WRAPPED.</div><h2 id="modal-title">おめでとう、届けておいたよ。</h2><p>${e(b.name)}のボードに、プレゼントを置きました。<br>${state.board.unlocked?'きみの言葉が、いい一日のはじまりに。':prettyDate(b.date)+'の0時。開ける瞬間が楽しみだね。'}</p><button class="button dark full" data-action="close">ボードに戻る ${icon('arrow')}</button></div>`);
  }catch(err){if(!isCurrent()||!modal.open||$('#gift-form')!==form){toast(err.message);return;}$('.form-error',form).textContent=err.message;button.disabled=false;button.innerHTML=icon('gift')+' ことばを包んで贈る';}
}
async function copyLink() {const input=$('#share-url');if(!input)return;try{await navigator.clipboard.writeText(input.value);toast('リンクをコピーしました ♡');}catch{input.focus();input.select();toast('リンクを選択しました。コピーして使ってね。');}}
function toast(text) {const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4000);}
function celebrate(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;$('#confetti').innerHTML=Array.from({length:60},(_,i)=>`<span class="confetti-bit" style="--left:${Math.random()*100}%;--duration:${2+Math.random()*2}s;--delay:${Math.random()*.7}s;--turn:${Math.random()*360}deg;--color:${['#c5afe2','#e9bf8d','#a6c7b1','#e5a7bb','#a4b6d6'][i%5]}"></span>`).join('');setTimeout(()=>$('#confetti').innerHTML='',5000);}
let refreshing=false;
async function refreshBoard() {
  if(state.demo||state.view!=='board'||!state.board||state.loading||refreshing)return;
  refreshing=true;const id=state.board.id;
  try {const {board}=await api('/boards/'+id);if(!state.demo&&state.view==='board'&&state.board?.id===id){const justOpened=!state.board.unlocked&&board.unlocked,changed=JSON.stringify(board)!==JSON.stringify(state.board);state.board=board;if(changed){renderBoard();if(justOpened){if(modal.open)modal.close();celebrate();toast('お誕生日おめでとう！プレゼントがひらきました。');}}}}catch{}finally{refreshing=false;}
}
function updateCountdown() {const b=state.board;if(!b||b.unlocked||state.view!=='board')return;const remaining=Math.max(0,b.unlockAt-(Date.now()+state.clockOffset)),mins=Math.floor(remaining/60000);[['days',Math.floor(mins/1440)],['hours',Math.floor(mins/60)%24],['minutes',mins%60]].forEach(([unit,value])=>{const el=$('#count-'+unit);if(el)el.textContent=String(value).padStart(2,'0');});if(!remaining&&!state.demo)refreshBoard();}
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action],[data-gift],[data-sample],[data-board],[data-read-index]');if(!el)return;
  if(el.dataset.gift)return readGift(el.dataset.gift);
  if(el.dataset.sample){navigate('/?sample='+el.dataset.sample);window.scrollTo({top:0,behavior:'smooth'});return;}
  if(el.dataset.board){navigate('/b/'+el.dataset.board);window.scrollTo({top:0,behavior:'smooth'});return;}
  if(el.dataset.readIndex!==undefined)return readGift(state.board.gifts[Number(el.dataset.readIndex)].id);
  switch(el.dataset.action){
    case 'home':navigate('/');break;
    case 'memories':navigate('/memories');window.scrollTo({top:0,behavior:'smooth'});break;
    case 'memories-retry':showMemories();break;
    case 'create':createDialog();break;
    case 'compose':composeDialog();break;
    case 'share':shareDialog();break;
    case 'copy':copyLink();break;
    case 'native-share':try{await navigator.share({title:state.board.name+'のバースデーボード',text:'誕生日に開ける「おめでとう」を、ひとこと置いていってね。',url:location.origin+'/b/'+state.board.id});}catch(err){if(err.name!=='AbortError')toast('共有できませんでした。リンクをコピーして使ってね。');}break;
    case 'close':modal.close();break;
    case 'how':howDialog();break;
    case 'about':aboutDialog();break;
    case 'demo-toggle':if(state.demo){state.board.unlocked=!state.board.unlocked;renderBoard();if(state.board.unlocked){celebrate();toast('お誕生日おめでとう！プレゼントを開けてみてね。');}}break;
    case 'page-prev':state.page=(state.page-1+Math.ceil(state.board.gifts.length/12))%Math.ceil(state.board.gifts.length/12);renderBoard();break;
    case 'page-next':state.page=(state.page+1)%Math.ceil(state.board.gifts.length/12);renderBoard();break;
  }
});
document.addEventListener('submit',event=>{if(event.target.id==='create-form'){event.preventDefault();createBoard(event.target);}if(event.target.id==='gift-form'){event.preventDefault();sendGift(event.target);}});
document.addEventListener('input',event=>{if(event.target.name==='message'&&$('#char-count'))$('#char-count').textContent=event.target.value.length;});
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});
window.addEventListener('popstate',route);
window.addEventListener('storage',event=>{if(event.key==='yoru.owner-keys'||event.key===null){savedKeys=readOwnerKeys();if(state.view==='memories')showMemories();}});
window.addEventListener('focus',refreshBoard);
setInterval(updateCountdown,1000);setInterval(refreshBoard,15000);
route();
