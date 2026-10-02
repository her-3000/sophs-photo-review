'use strict';
const $ = id => document.getElementById(id);
const typeNames = {'digitals':'Digitals','extras':'Extras','commercial-lifestyle':'Commercials','e-commerce':'E-commerce','runway':'Runway','music-video':'Music videos','dancing':'Dancing','pageant':'Pageants','fashion-editorial':'Fashion / editorial','beauty':'Beauty','activewear':'Activewear','swimwear':'Swimwear','behind-the-scenes':'Behind the scenes','personal':'Casual','other':'Other'};
const useNames = {'comp-card':'Comp card','website':'Website','portfolio':'Portfolio'};
const primaryTypes = ['digitals','extras','commercial-lifestyle','e-commerce','runway','music-video','dancing','pageant','fashion-editorial','beauty','personal'];
const frameNames = {'close-up':'Close-up','mid-length':'Mid-length','full-length':'Full-length','three-quarter-length':'Three-quarter length','other':'Other framing'};
const angleNames = {'front':'Front','three-quarter':'Three-quarter','side':'Side','rear':'Rear'};
const makeupNames = {'makeup':'Makeup','no-makeup':'No makeup'};
const footwearNames = {'shoes':'Shoes','barefoot':'No shoes','not-visible':'Feet not visible'};
const clothingNames = {'jeans':'Jeans','trousers':'Trousers','shorts':'Shorts','skirt-dress':'Skirt / dress','swimwear':'Swimwear','activewear':'Activewear','other':'Other clothing'};
let photoOwner = 'Model';
let photos = [], selections = {}, suggestions = {}, links = [], editing = null, busy = false, adding = false;
const pending = new Set(), selected = new Set();
let bulkBusy = false;
const shotPresets = {'CU-01':{frame:'close-up',angle:'front'},'ML-01':{frame:'mid-length',angle:'front'},'PF-01':{frame:'close-up',angle:'side'},'FL-01':{frame:'full-length',angle:'front'},'JN-01':{frame:'full-length',angle:'front',clothing:'jeans'}};
function shotLabel(s) {
  if(s.frame==='full-length'&&s.angle==='front'&&s.clothing==='jeans')return 'JN-01 · Full-length · Jeans';
  if(s.frame==='close-up'&&s.angle==='side')return 'PF-01 · Side profile';
  const code=s.angle==='front'?{'close-up':'CU-01','mid-length':'ML-01','full-length':'FL-01'}[s.frame]:null;
  const name=[angleNames[s.angle],frameNames[s.frame]].filter(Boolean).join(' · ');
  return code?code+' · '+name:name;
}
function updateBulk(){
  $('selected-count').textContent=selected.size+' selected';
  $('apply-bulk').disabled=bulkBusy||pending.size>0||!selected.size||(!$('bulk-category').value&&!$('bulk-shot').value);
  for(const id of ['select-visible','clear-selected','bulk-category','bulk-shot'])$(id).disabled=bulkBusy;
}
function element(tag, text, cls) { const e = document.createElement(tag); if(text !== undefined) e.textContent = text; if(cls) e.className=cls; return e; }
function choice(p) { return selections[p.filename] || {decision:'unreviewed',frame:'',angle:'unknown',makeup:'unknown',footwear:'unknown',clothing:'unknown',types:[],uses:[],smile:false,notes:'',labelsReviewed:false}; }
function labelled(s,details=false) {
  const framing=shotLabel(s);
  return [...(s.types||[]).map(t=>typeNames[t]),framing,...(details?[makeupNames[s.makeup],footwearNames[s.footwear],clothingNames[s.clothing],...(s.uses||[]).map(t=>useNames[t]),s.smile?'Smiling':null]:(s.uses||[]).filter(t=>t!=='portfolio').map(t=>useNames[t]))].filter(Boolean);
}
function hasTag(s,tag) {return ['frame','angle','makeup','footwear','clothing'].some(k=>s[k]===tag)||(s.types||[]).includes(tag)||(s.uses||[]).includes(tag);}
function matches(p) {
  const s=choice(p), year=$('year').value, d=$('decision').value, tag=$('tag').value;
  const query=$('detail-search').value.trim().toLowerCase();
  const haystack=[s.notes,...labelled(s,true),p.filename,s.smile?'smile smiling':''].join(' ').toLowerCase();
  const detailMatch=!query||query.split(/\s+/).every(term=>haystack.includes(term));
  return detailMatch && (year==='all'||(year==='unknown'?!/^\d{4}/.test(p.date):p.date.startsWith(year))) && (d==='all'||(d==='not-rejected'?s.decision!=='reject':d==='keep'?['keep','favourite'].includes(s.decision):s.decision===d)) && (tag==='all'||hasTag(s,tag)||(!s.labelsReviewed&&hasTag(suggestions[p.filename]||{},tag)));
}
async function save(p,s) {
  if(pending.has(p.filename)) return false;
  pending.add(p.filename); $('save-status').className=''; $('save-status').textContent='Saving…'; render();
  try {
    const r=await fetch('/api/selection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:p.filename,selection:s})});
    if(!r.ok) throw Error();
    selections[p.filename]=s; $('save-status').textContent='Saved on this Mac.'; return true;
  } catch { $('save-status').className='error'; $('save-status').textContent='Could not save. Your last saved choice is unchanged. Please try again.'; return false; }
  finally {pending.delete(p.filename);render();}
}
function openLabels(p) {
  $('quick-shot').value=''; editing=p; const s=choice(p), suggestion=suggestions[p.filename]; $('label-title').textContent='Labels · photo '+(photos.indexOf(p)+1);
  for(const key of ['frame','angle','makeup','footwear','clothing']) $(key).value=s[key];
  for(const group of ['types','uses']) for(const box of $(group).querySelectorAll('input')) box.checked=s[group].includes(box.value);
  $('smile').checked=s.smile; $('notes').value=s.notes;
  $('suggestion-detail').textContent=suggestion?'Suggested: '+labelled(suggestion).join(' / ')+(suggestion.reason?' · Check: '+suggestion.reason:''):'Not visually classified yet. You can add labels yourself.';
  $('apply-suggestions').hidden=!suggestion; $('label-save-status').textContent=''; $('labels').showModal();
}
function render() {
  syncViewTabs();
  const shown=photos.filter(matches), counts={}; for(const p of photos){const d=choice(p).decision;counts[d]=(counts[d]||0)+1;}
  $('summary').textContent=shown.length+' matching · '+photos.length+' total · '+(counts.keep||0)+' kept · '+(counts.favourite||0)+' favourites · '+(counts.reject||0)+' rejected · '+(counts.unreviewed||0)+' not reviewed';
  const grid=$('grid'); grid.replaceChildren();
  for(const p of shown) {
    const s=choice(p), n=photos.indexOf(p)+1, card=element('article',undefined,'photo'); card.dataset.decision=s.decision;
    const pick=element('label',undefined,'check pick'), tick=element('input');tick.type='checkbox';tick.checked=selected.has(p.filename);tick.disabled=bulkBusy;tick.setAttribute('aria-label','Select photo '+n);tick.onchange=()=>{tick.checked?selected.add(p.filename):selected.delete(p.filename);card.classList.toggle('selected',tick.checked);updateBulk();};pick.append(tick,document.createTextNode('Select'));card.classList.toggle('selected',tick.checked);card.append(pick);
    const imageButton=element('button',undefined,'image-button'); imageButton.setAttribute('aria-label','Open full photo '+n);
    const img=element('img');img.alt=photoOwner+' photo '+n;img.loading='lazy';img.decoding='async';
    const imageUrl=p.image||'/photos/'+encodeURIComponent(p.filename);
    let retries=0;
    img.onerror=()=>{if(retries++<1)setTimeout(()=>{if(img.isConnected)img.src=imageUrl+'?retry=1';},250);};
    img.src=imageUrl;imageButton.append(img);
    imageButton.onclick=()=>{$('full-photo').src=img.src;$('full-caption').textContent='Photo '+n+' · '+p.filename;$('viewer').showModal();};
    card.append(imageButton,element('h3','Photo '+n+' · '+(p.date||'Date unknown')),element('p',s.decision==='unreviewed'?'Not reviewed':s.decision.charAt(0).toUpperCase()+s.decision.slice(1)));
    const tags=element('div',labelled(s).join(' / '),'tags');card.append(tags);
    const suggestion=suggestions[p.filename];
    if(suggestion&&!s.labelsReviewed) card.append(element('p','Suggested: '+labelled(suggestion).join(' / '),'suggested'));
    if(suggestion&&suggestion.needsReview) card.append(element('p','Check: '+suggestion.reason,'suggested'));
    const actions=element('div',undefined,'actions');
    for(const [value,name] of [['keep','Keep'],['favourite','Favourite'],['reject','Reject']]) {
      const b=element('button',name); b.setAttribute('aria-label',name+' photo '+n);b.setAttribute('aria-pressed',String(s.decision===value));b.disabled=bulkBusy||pending.has(p.filename);
      b.onclick=()=>save(p,{...s,decision:s.decision===value?'unreviewed':value});actions.append(b);
    }
    const labels=element('button','Labels');labels.setAttribute('aria-label','Labels for photo '+n);labels.onclick=()=>openLabels(p);labels.disabled=bulkBusy||pending.has(p.filename);actions.append(labels);card.append(actions);
    if(p.source){const source=element('a','Facebook source','source');source.href=p.source;source.target='_blank';source.rel='noopener noreferrer';card.append(source);}
    else card.append(element('p',p.original_name||'Uploaded original','source'));
    grid.append(card);
  }
  updateBulk();
}
for(const [group,names] of [['types',typeNames],['uses',useNames]]) for(const [value,name] of Object.entries(names)) {
  const label=element('label',undefined,'check'), box=element('input');box.type='checkbox';box.value=value;box.name=group;label.append(box,document.createTextNode(name));(group==='types'&&!primaryTypes.includes(value)?$('extra-types'):$(group)).append(label);
}
$('types').append($('types').querySelector('details'));
for(const id of ['year','decision','tag']) $(id).onchange=()=>{selected.clear();render();};
$('detail-search').oninput=()=>{selected.clear();render();};
$('close-labels').onclick=()=>{if(!busy)$('labels').close();};
$('labels').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('close-viewer').onclick=()=>$('viewer').close();
$('apply-suggestions').onclick=()=>{
  const s=suggestions[editing.filename]; if(!s)return;
  for(const key of ['frame','angle','makeup','footwear','clothing']) $(key).value=s[key]||'unknown';
  // Existing manual type labels stay selected when suggestions are applied.
  for(const box of $('types').querySelectorAll('input')) if((s.types||[]).includes(box.value))box.checked=true;
};
$('label-form').onsubmit=async e=>{
  e.preventDefault();if(busy)return;busy=true;$('save-labels').disabled=true;
  const s={...choice(editing),frame:$('frame').value,angle:$('angle').value,makeup:$('makeup').value,footwear:$('footwear').value,clothing:$('clothing').value,types:[...$('types').querySelectorAll('input:checked')].map(x=>x.value),uses:[...$('uses').querySelectorAll('input:checked')].map(x=>x.value),smile:$('smile').checked,notes:$('notes').value,labelsReviewed:true};
  const ok=await save(editing,s);busy=false;$('save-labels').disabled=false;if(ok)$('labels').close();else $('label-save-status').textContent='Could not save. Please try again.';
};
fetch('/api/photos').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{photoOwner=data.profile?.name||'Example';if(data.profile?.initial_view)$('decision').value=data.profile.initial_view;photos=data.photos;selections=data.selections;suggestions=data.suggestions||{};links=data.links||[];renderLinks();render();}).catch(()=>{$('summary').textContent='Could not load photos. Reopen the review page while its local server is running.';});

for(const value of primaryTypes){const option=element('option',typeNames[value]);option.value=value;$('bulk-category').append(option);}
for(const id of ['bulk-category','bulk-shot'])$(id).onchange=updateBulk;
$('select-visible').onclick=()=>{for(const p of photos.filter(matches))selected.add(p.filename);render();};
$('clear-selected').onclick=()=>{selected.clear();render();};
$('quick-shot').onchange=()=>{const preset=shotPresets[$('quick-shot').value];if(preset)for(const [key,value]of Object.entries(preset))$(key).value=value;};
$('apply-bulk').onclick=async()=>{
  if($('apply-bulk').disabled)return;
  const names=[...selected];bulkBusy=true;$('save-status').className='';$('save-status').textContent='Saving labels…';render();
  try{
    const r=await fetch('/api/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filenames:names,category:$('bulk-category').value,shot:$('bulk-shot').value})});
    if(!r.ok)throw Error();const data=await r.json();Object.assign(selections,data.selections);selected.clear();$('save-status').textContent='Labels saved for '+names.length+' photos.';
  }catch{$('save-status').className='error';$('save-status').textContent='Could not save labels. Your selection is still here; please try again.';}
  finally{bulkBusy=false;render();}
};

function renderLinks(){
  $('saved-links').hidden=!links.length;$('links-list').replaceChildren();
  for(const link of links){const a=element('a',link.title);a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';$('links-list').append(a);}
}
function attachmentStatus(text,error=false){$('attachment-status').textContent=text;$('attachment-status').className=error?'error':'';}
function setAdding(value){adding=value;$('photo-files').disabled=value;$('save-link').disabled=value;$('close-attachments').disabled=value;}
$('add-media').onclick=()=>$('attachments').showModal();
$('close-attachments').onclick=()=>$('attachments').close();
$('attachments').addEventListener('cancel',e=>{if(adding)e.preventDefault();});
$('photo-files').onchange=async()=>{
  const files=[...$('photo-files').files];if(adding||!files.length)return;
  setAdding(true);let added=0,duplicates=0,failures=[];
  for(const [i,file] of files.entries()){
    attachmentStatus('Saving photo '+(i+1)+' of '+files.length+'…');
    try{
      if(file.size>25*1024*1024)throw Error(file.name+': over 25 MB');
      const r=await fetch('/api/upload',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-Filename':encodeURIComponent(file.name)},body:file});
      const data=await r.json();if(!r.ok)throw Error(file.name+': '+data.error);
      if(data.duplicate)duplicates++;else{photos.push(data.photo);added++;}
    }catch(error){failures.push(error.message||file.name+': could not save');}
  }
  if(added){$('decision').value='unreviewed';$('year').value='all';$('tag').value='all';$('detail-search').value='';selected.clear();render();}
  attachmentStatus(added+' added'+(duplicates?' · '+duplicates+' already saved':'')+(failures.length?' · '+failures.join('; '):'. Originals saved on this Mac.'),!!failures.length);
  $('photo-files').value='';setAdding(false);
};
$('link-form').onsubmit=async e=>{
  e.preventDefault();if(adding)return;setAdding(true);attachmentStatus('Saving link…');
  try{
    const r=await fetch('/api/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('media-url').value.trim(),title:$('media-title').value.trim()})});
    const data=await r.json();if(!r.ok)throw Error(data.error);
    if(!data.duplicate)links.push(data.link);renderLinks();$('link-form').reset();attachmentStatus(data.duplicate?'This link is already saved.':'Link saved. It is listed above the photos.');
  }catch(error){attachmentStatus(error.message||'Could not save this link. Please retry.',true);}
  finally{setAdding(false);}
};

function syncViewTabs(){
  const buttons=[...document.querySelectorAll('[data-view]')];
  const value=$('decision').value;
  const index=buttons.findIndex(b=>b.dataset.view===value);
  $('decision').previousElementSibling.style.setProperty('--position',String(Math.max(0,index)));
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.view===value));
}
const viewButtons=[...document.querySelectorAll('[data-view]')];
for(const [index,button] of viewButtons.entries()){
  button.onclick=()=>{$('decision').value=button.dataset.view;selected.clear();render();};
  button.onkeydown=e=>{
    let next=index;
    if(e.key==='ArrowRight')next=(index+1)%viewButtons.length;
    else if(e.key==='ArrowLeft')next=(index+viewButtons.length-1)%viewButtons.length;
    else if(e.key==='Home')next=0;
    else if(e.key==='End')next=viewButtons.length-1;
    else return;
    e.preventDefault();viewButtons[next].focus();viewButtons[next].click();
  };
}

// This switch translates the agency introduction only; gallery records are untouched.
const introCopy = {
  en: {
    headlineFind: 'We find you work through AI.',
    headlinePay: 'We pay you before the client pays us.',
    headlineModel: 'You model.',
    demoPrefix: 'Our goal: ',
    demoCaption: 'apply within 2 minutes of finding a suitable job for you, through the client’s preferred channel.',
    lead: 'AI-assisted applications. Comp cards matched to the jobs you love. Less scrolling. Less admin.',
    lineStart: 'Your private ',
    lineEnd: ' feed: applications, sent dates, job dates and travel times. We invite you into a job group with the client.',
    fit: 'Already with an agency? We’re happy to send you work, as your agreement allows. No lock-in contracts.',
    promise: 'Find and arrange your own job? Keep 100%. That’s our promise.',
    terms: 'For jobs we arrange: 30% commission. Your 70% paid within 24 hours after the job.'
  },
  th: {
    headlineFind: 'เราใช้ AI หางานให้คุณ',
    headlinePay: 'เราจ่ายให้คุณก่อนลูกค้าจ่ายให้เรา',
    headlineModel: 'คุณโฟกัสที่งานได้เต็มที่',
    demoPrefix: 'เป้าหมายของเรา: ',
    demoCaption: 'สมัครภายใน 2 นาทีหลังพบงานที่เหมาะกับคุณ ผ่านช่องทางที่ลูกค้าต้องการ',
    lead: 'ใช้ AI ช่วยสมัครงาน พร้อมคอมการ์ดที่เหมาะกับงานที่คุณชอบ ไม่ต้องเสียเวลาไล่หางานและสมัครเองทั้งวัน',
    lineStart: 'อัปเดตผ่าน ',
    lineEnd: ' ส่วนตัว: งานที่สมัครให้ วันที่สมัคร วันทำงาน และเวลาเดินทาง พร้อมเชิญคุณเข้ากลุ่มงานกับลูกค้า',
    fit: 'มีเอเจนซี่อยู่แล้ว? เรายินดีส่งงานให้คุณ หากสัญญาของคุณอนุญาต ไม่มีสัญญาผูกมัด',
    promise: 'หางานและจัดการเอง? รับเต็ม 100% นี่คือคำสัญญาของเรา',
    terms: 'งานที่เราจัดหาให้: ค่าคอมมิชชัน 30% คุณรับส่วนแบ่ง 70% ภายใน 24 ชั่วโมงหลังจบงาน'
  }
};
const introLanguageButtons = [...document.querySelectorAll('[data-intro-language]')];
function setIntroLanguage(language) {
  if(!introCopy[language])return;
  const intro=document.querySelector('.agency-intro');
  intro.lang=language;
  if(typeof syncDemoMotion==='function')syncDemoMotion();
  for(const node of intro.querySelectorAll('[data-intro-copy]'))node.textContent=introCopy[language][node.dataset.introCopy];
  for(const button of introLanguageButtons)button.setAttribute('aria-pressed',String(button.dataset.introLanguage===language));
  document.querySelector('.intro-language').style.setProperty('--language-index',language==='th'?'1':'0');
  try{localStorage.setItem('sophs-review-intro-language',language);}catch{}
}
for(const button of introLanguageButtons){
  button.onclick=()=>setIntroLanguage(button.dataset.introLanguage);
  button.onkeydown=e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();
    const next=introLanguageButtons[e.key==='Home'||e.key==='ArrowLeft'?0:1];
    next.focus();setIntroLanguage(next.dataset.introLanguage);
  };
}
try{setIntroLanguage(localStorage.getItem('sophs-review-intro-language')||'en');}catch{}

function syncDemoMotion(){
  const video=$('application-loop'),button=$('demo-motion');
  if(!video||!button)return;
  const thai=document.querySelector('.agency-intro').lang==='th';
  const label=video.paused?(thai?'เล่นวิดีโอ':'Play video'):(thai?'หยุดวิดีโอชั่วคราว':'Pause video');
  button.textContent=video.paused?'▶':'Ⅱ';button.setAttribute('aria-label',label);button.title=label;
}
const demoVideo=$('application-loop');
if(demoVideo){
demoVideo.muted=true;
demoVideo.addEventListener('play',syncDemoMotion);
demoVideo.addEventListener('pause',syncDemoMotion);
$('demo-motion').onclick=()=>{if(demoVideo.paused)demoVideo.play().catch(syncDemoMotion);else demoVideo.pause();};
const demoReducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function respectDemoMotion(){if(demoReducedMotion.matches){demoVideo.autoplay=false;demoVideo.pause();}else{demoVideo.autoplay=true;demoVideo.play().catch(syncDemoMotion);}syncDemoMotion();}
demoReducedMotion.addEventListener('change',respectDemoMotion);
respectDemoMotion();

}
