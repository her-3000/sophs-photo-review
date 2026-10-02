'use strict';
const $ = id => document.getElementById(id);
const typeNames = {'digitals':'Digitals','extras':'Extras','commercial-lifestyle':'Commercials','e-commerce':'E-commerce','runway':'Runway','music-video':'Music videos','dancing':'Dancing','pageant':'Pageants','fashion-editorial':'Fashion / editorial','beauty':'Beauty','activewear':'Activewear','swimwear':'Swimwear','behind-the-scenes':'Behind the scenes','personal':'Casual','other':'Other'};
const useNames = {'comp-card':'Comp card','website':'Website','portfolio':'Portfolio'};
const primaryTypes = ['digitals','extras','commercial-lifestyle','e-commerce','runway','music-video','dancing','pageant','fashion-editorial','beauty','personal'];
const frameNames = {'close-up':'Close-up','mid-length':'Mid-length','full-length':'Full-length','three-quarter-length':'Three-quarter length','other':'Other framing'};
const angleNames = {'front':'Front','three-quarter':'Three-quarter','side':'Side','rear':'Rear'};
const makeupNames = {'makeup':'Makeup','no-makeup':'No makeup'};
const footwearNames = {'shoes':'Shoes','barefoot':'No shoes','not-visible':'Feet not visible'};
const clothingNames = {'casual':'Casual','streetwear':'Streetwear','runway-wear':'Runway wear','formal-evening':'Gowns','jeans':'Jeans','trousers':'Trousers','shorts':'Shorts','skirt-dress':'Skirt / dress','swimwear':'Swimwear','activewear':'Activewear','other':'Other clothing'};
let photoOwner = 'Model';
let photos = [], selections = {}, suggestions = {}, links = [], editing = null, busy = false, adding = false;
const pending = new Set(), selected = new Set(), categoryFilters = new Set();
let bulkBusy = false, jumpFrame;
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
  updateReviewProgress();
}
function element(tag, text, cls) { const e = document.createElement(tag); if(text !== undefined) e.textContent = text; if(cls) e.className=cls; return e; }
function choice(p) { return selections[p.filename] || {decision:'unreviewed',frame:'',angle:'unknown',makeup:'unknown',footwear:'unknown',clothing:'unknown',types:[],uses:[],smile:false,notes:'',labelsReviewed:false}; }
function labelled(s,details=false) {
  const framing=shotLabel(s);
  return [...(s.types||[]).map(t=>typeNames[t]),framing,...(details?[makeupNames[s.makeup],footwearNames[s.footwear],clothingNames[s.clothing],...(s.uses||[]).map(t=>useNames[t]),s.smile?'Smiling':null]:(s.uses||[]).filter(t=>t!=='portfolio').map(t=>useNames[t]))].filter(Boolean);
}
function hasTag(s,tag) {return ['frame','angle','makeup','footwear','clothing'].some(k=>s[k]===tag)||(s.types||[]).includes(tag)||(s.uses||[]).includes(tag);}
function matches(p) {
  const s=choice(p), year=$('year').value, d=$('decision').value;
  const query=$('detail-search').value.trim().toLowerCase();
  const haystack=[s.notes,...labelled(s,true),p.filename,s.smile?'smile smiling':''].join(' ').toLowerCase();
  const detailMatch=!query||query.split(/\s+/).every(term=>haystack.includes(term));
  return detailMatch && (year==='all'||(year==='unknown'?!/^\d{4}/.test(p.date):p.date.startsWith(year))) && (d==='all'||(d==='not-rejected'?s.decision!=='reject':d==='keep'?['keep','favourite'].includes(s.decision):s.decision===d)) && (!categoryFilters.size||[...categoryFilters].some(tag=>hasTag(s,tag)||(!s.labelsReviewed&&hasTag(suggestions[p.filename]||{},tag))));
}
let saveFeedbackTimer;
function saveStatus(text, state) {
  clearTimeout(saveFeedbackTimer);
  const status=$('save-status');
  status.textContent=text;status.dataset.state=state;
  status.className=state==='error'?'error':'';
  if(state==='saved')saveFeedbackTimer=setTimeout(()=>{status.textContent='';delete status.dataset.state;},5000);
}
async function save(p,s) {
  if(pending.has(p.filename)) return false;
  pending.add(p.filename); saveStatus('Saving…','saving'); render();
  try {
    const r=await fetch('/api/selection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:p.filename,selection:s})});
    if(!r.ok) throw Error();
    selections[p.filename]=s; saveStatus(pending.size>1?'Saving…':'Saved on this Mac.',pending.size>1?'saving':'saved'); return true;
  } catch { saveStatus('Could not save. Your last saved choice is unchanged. Please try again.','error'); return false; }
  finally {pending.delete(p.filename);render();}
}
function openLabels(p) {
  for(const detail of $('labels').querySelectorAll('details'))detail.open=false;
  $('quick-shot').value=''; editing=p; const s=choice(p), suggestion=suggestions[p.filename]; $('label-title').textContent='Labels · photo '+(photos.indexOf(p)+1);
  for(const key of ['frame','angle','makeup','footwear','clothing']) $(key).value=s[key];
  for(const group of ['types','uses']) for(const box of $(group).querySelectorAll('input')) box.checked=s[group].includes(box.value);
  $('smile').checked=s.smile; $('notes').value=s.notes;
  $('suggestion-detail').textContent=suggestion?'Suggested: '+labelled(suggestion).join(' / ')+(suggestion.reason?' · Check: '+suggestion.reason:''):'Not visually classified yet. You can add labels yourself.';
  syncLabelSelects(); $('apply-suggestions').hidden=!suggestion; $('label-save-status').textContent=''; $('labels').showModal();
}
function render() {
  syncViewTabs();
  syncFilterSliders();
  const shown=photos.filter(matches), counts={}; for(const p of photos){const d=choice(p).decision;counts[d]=(counts[d]||0)+1;}
  $('summary').textContent=shown.length+' matching · '+photos.length+' total · '+(counts.keep||0)+' kept · '+(counts.favourite||0)+' favourites · '+(counts.reject||0)+' rejected · '+(counts.unreviewed||0)+' not reviewed';
  const grid=$('grid'); grid.replaceChildren();
  for(const p of shown) {
    const s=choice(p), n=photos.indexOf(p)+1, card=element('article',undefined,'photo'); card.dataset.decision=s.decision;
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
// Dismiss only taps that start and finish outside the photo viewer.
function outsideViewer(event){
  const box=$('viewer').getBoundingClientRect();
  return event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom;
}
let viewerBackdropPress=false;
$('viewer').addEventListener('pointerdown',event=>{viewerBackdropPress=outsideViewer(event);});
$('viewer').addEventListener('click',event=>{
  if(viewerBackdropPress&&outsideViewer(event))$('viewer').close();
  viewerBackdropPress=false;
});
$('viewer').addEventListener('pointercancel',()=>{viewerBackdropPress=false;});

$('apply-suggestions').onclick=()=>{
  const s=suggestions[editing.filename]; if(!s)return;
  for(const key of ['frame','angle','makeup','footwear','clothing']) $(key).value=s[key]||'unknown';
  // Existing manual type labels stay selected when suggestions are applied.
  for(const box of $('types').querySelectorAll('input')) if((s.types||[]).includes(box.value))box.checked=true;
  syncLabelSelects();
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
$('quick-shot').onchange=()=>{const preset=shotPresets[$('quick-shot').value];if(preset)for(const [key,value]of Object.entries(preset))$(key).value=value;syncLabelSelects();};
$('apply-bulk').onclick=async()=>{
  if($('apply-bulk').disabled)return;
  const names=[...selected];bulkBusy=true;saveStatus('Saving labels…','saving');render();
  try{
    const r=await fetch('/api/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filenames:names,category:$('bulk-category').value,shot:$('bulk-shot').value})});
    if(!r.ok)throw Error();const data=await r.json();Object.assign(selections,data.selections);selected.clear();saveStatus('Labels saved for '+names.length+' photos.','saved');
  }catch{saveStatus('Could not save labels. Your selection is still here; please try again.','error');}
  finally{bulkBusy=false;render();}
};

function renderLinks(){
  $('saved-links').hidden=!links.length;$('links-list').replaceChildren();
  for(const link of links){const a=element('a',link.title);a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';$('links-list').append(a);}
}
function attachmentStatus(text,error=false){$('attachment-status').textContent=text;$('attachment-status').className=error?'error':'';}
function setAdding(value){adding=value;$('photo-files').disabled=value;$('save-link').disabled=value;$('close-attachments').disabled=value;updateReviewProgress();}
$('add-media').onclick=()=>$('attachments').showModal();
$('close-attachments').onclick=()=>$('attachments').close();
$('attachments').addEventListener('cancel',e=>{if(adding)e.preventDefault();});
$('photo-files').onchange=async()=>{
  const files=[...$('photo-files').files];if(adding||!files.length)return;
  setAdding(true);let added=0,duplicates=0,failures=[];
  for(const [i,file] of files.entries()){
    attachmentStatus('Saving photo '+(i+1)+' of '+files.length+'…');
    try{
      if(file.size>100*1024*1024)throw Error(file.name+': over 100 MB — save an album link instead');
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

// Keep each preview screen's filters across live document refreshes.
const categoryStorageKey='sophs-review-categories:'+document.title+':'+(window.frameElement?.title||'main');
try{for(const value of JSON.parse(sessionStorage.getItem(categoryStorageKey)||'[]'))if([...$('tag').options].some(option=>option.value===value&&value!=='all'))categoryFilters.add(value);}catch{}
function rememberCategories(){try{sessionStorage.setItem(categoryStorageKey,JSON.stringify([...categoryFilters]));}catch{}}
// Pill filters share the existing filter values; only their presentation changes.
const filterSliders=[];
function syncFilterSliders(){
  for(const {select,track,thumb,buttons} of filterSliders){
    const active=buttons.find(button=>button.dataset.filterValue===select.value);
    for(const button of buttons){const chosen=select.id==='tag'?(button.dataset.filterValue==='all'?!categoryFilters.size:categoryFilters.has(button.dataset.filterValue)):button===active;button.setAttribute('aria-pressed',String(chosen));button.tabIndex=select.id==='tag'||chosen?0:-1;}
    if(active){thumb.style.width=active.offsetWidth+'px';thumb.style.height=active.offsetHeight+'px';thumb.style.transform=`translate(${active.offsetLeft}px,${active.offsetTop}px)`;}
  }
}
for(const [id,optionsId] of [['year','year-options'],['tag','category-options']]){
  const select=$(id),track=$(optionsId),thumb=track.querySelector('.filter-thumb'),buttons=[];
  for(const option of select.options){
    const button=element('button',option.textContent,'filter-option');button.type='button';button.dataset.filterValue=option.value;
    if(option.value==='2026')button.textContent='2026';
    button.onclick=()=>{if(id==='tag'){if(option.value==='all')categoryFilters.clear();else if(categoryFilters.has(option.value))categoryFilters.delete(option.value);else categoryFilters.add(option.value);rememberCategories();}else select.value=option.value;selected.clear();render();button.scrollIntoView({block:'nearest',inline:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
    buttons.push(button);track.append(button);
  }
  for(const [index,button] of buttons.entries())button.onkeydown=event=>{
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%buttons.length;
    else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=buttons.length-1;
    else return;
    event.preventDefault();buttons[next].focus({preventScroll:true});if(id==='tag')buttons[next].scrollIntoView({block:'nearest',inline:'nearest'});else buttons[next].click();
  };
  filterSliders.push({select,track,thumb,buttons});
}
const filterResizeObserver=new ResizeObserver(syncFilterSliders);
for(const {track} of filterSliders)filterResizeObserver.observe(track);
syncFilterSliders();

const categoryScroller=document.querySelector('.category-slider');
const categoryScrollMark=document.querySelector('.category-scroll-indicator span');
function updateCategoryScroll(){
  const width=categoryScroller.clientWidth, total=categoryScroller.scrollWidth;
  const ratio=Math.min(1,width/total);
  categoryScrollMark.style.width=(ratio*100)+'%';
  categoryScrollMark.style.transform=`translateX(${categoryScroller.scrollLeft/total*100/ratio}%)`;
  categoryScrollMark.parentElement.hidden=ratio>=1;
}
categoryScroller.addEventListener('scroll',updateCategoryScroll,{passive:true});
new ResizeObserver(updateCategoryScroll).observe(categoryScroller);
updateCategoryScroll();

// This switch translates the agency introduction only; gallery records are untouched.
const introCopy = {
  en: {
    headlineFind: 'AI finds your next job.',
    headlinePay: 'We pay you first.',
    headlineModel: 'You model.',
    demoPrefix: 'Goal: ',
    demoCaption: 'Apply within 20 minutes.',
    lead: 'Comp cards matched to each job.',
    lineStart: '',
    lineEnd: ' updates: applications, dates & travel times.',
    promise: 'Find and arrange your own jobs? Keep 100%.',
    reviewTitle: 'Your comp-card photos',
    reviewHelp: 'Upload in bulk. Keep or reject each photo.',
    reviewSave: 'Check AI labels. Choose your favourites.',
    finishTitle: 'Your photos. Your choice.',
    finishHelp: 'Keep or reject every photo before applying your changes.',
    applyChanges: 'Apply changes',
    share: 'Jobs we arrange: you keep 70%. We take 30%.',
    terms: 'Paid within 24 hours after the job.'
  },
  th: {
    headlineFind: 'AI หางานให้คุณ',
    headlinePay: 'เราจ่ายให้คุณก่อน',
    headlineModel: 'คุณทำงานโมเดล',
    demoPrefix: 'เป้าหมาย: ',
    demoCaption: 'สมัครภายใน 20 นาที',
    lead: 'คอมการ์ดที่เหมาะกับแต่ละงาน',
    lineStart: 'อัปเดตผ่าน ',
    lineEnd: ' : งานที่สมัคร วันที่ และเวลาเดินทาง',
    promise: 'หางานและจัดการเอง? รับเต็ม 100%',
    reviewTitle: 'รูปสำหรับคอมการ์ดของคุณ',
    reviewHelp: 'อัปโหลดหลายรูป เลือกเก็บหรือคัดออกทีละรูป',
    reviewSave: 'ตรวจหมวดหมู่จาก AI แล้วเลือกรูปโปรด',
    finishTitle: 'รูปของคุณ คุณเลือกเอง',
    finishHelp: 'เลือกเก็บหรือคัดออกให้ครบทุกรูปก่อนยืนยัน',
    applyChanges: 'ยืนยันการเปลี่ยนแปลง',
    share: 'งานที่เราจัดหา: คุณรับ 70% เรารับ 30%',
    terms: 'รับเงินภายใน 24 ชั่วโมงหลังจบงาน'
  }
};
const introLanguageButtons = [...document.querySelectorAll('[data-intro-language]')];
function setIntroLanguage(language) {
  if(!introCopy[language])return;
  const intro=document.querySelector('.agency-intro');
  intro.lang=language;
  if(typeof syncDemoMotion==='function')syncDemoMotion();
  document.querySelector('.review-guide').lang=language;
  document.querySelector('.review-finish').lang=language;
  for(const node of document.querySelectorAll('[data-intro-copy]'))node.textContent=introCopy[language][node.dataset.introCopy];
  for(const button of introLanguageButtons)button.setAttribute('aria-pressed',String(button.dataset.introLanguage===language));
  document.querySelector('.intro-language').style.setProperty('--language-index',language==='th'?'1':'0');
  updateReviewProgress();
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

function updateJumpVisibility(){
  const rect=$('confirm-review').getBoundingClientRect();
  const height=document.documentElement.clientHeight;
  const galleryVisible=$('grid').getBoundingClientRect().top<height-180;
  document.querySelector('.review-follow').hidden=!galleryVisible||(rect.top>=0&&rect.bottom<=height);
}
function scheduleJumpVisibility(){cancelAnimationFrame(jumpFrame);jumpFrame=requestAnimationFrame(updateJumpVisibility);}
window.addEventListener('scroll',scheduleJumpVisibility,{passive:true});
window.addEventListener('resize',scheduleJumpVisibility);

function updateReviewProgress(){
  const kept=photos.filter(p=>['keep','favourite'].includes(choice(p).decision)).length;
  const remaining=photos.filter(p=>choice(p).decision==='unreviewed').length;
  const thai=document.querySelector('.review-guide').lang==='th';
  $('review-progress').textContent=thai?`${kept} รูปที่เก็บ · ${remaining} รูปที่ยังไม่เลือก`:`${kept} kept · ${remaining} left to review`;
  $('follow-progress').textContent=thai?`${remaining} รูปที่เหลือ`:(remaining?`${remaining} left to review`:'Ready to apply');
  $('confirm-review').disabled=!photos.length||remaining>0||bulkBusy||pending.size>0||adding;
  scheduleJumpVisibility();
}
$('confirm-review').onclick=async()=>{
  if($('confirm-review').disabled)return;
  bulkBusy=true;$('review-status').textContent='Applying saved suggestions…';render();
  try{
    const r=await fetch('/api/apply-suggestions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const data=await r.json();if(!r.ok)throw Error(data.error);
    Object.assign(selections,data.selections);
    const thai=document.querySelector('.review-guide').lang==='th';
    $('review-status').className='';
    $('review-status').textContent=thai?`เพิ่มป้ายให้ ${data.applied} รูป · คงป้ายที่ยืนยันแล้ว ${data.preserved} รูป`:`Suggestions applied to ${data.applied} photos. ${data.preserved} photos with confirmed labels kept unchanged.`;
    if(data.missing)$('review-status').textContent+=thai?` อีก ${data.missing} รูปยังต้องมีป้ายแนะนำ`:` ${data.missing} kept photos still need suggestions.`;
    saveStatus(data.applied?'Changes applied and saved on this Mac.':'Your saved labels are up to date.','saved');
  }catch(error){$('review-status').className='error';$('review-status').textContent=error.message||'Could not apply changes. Please try again.';}
  finally{bulkBusy=false;render();}
};

// Keep the jump inside this document, including the live srcdoc previews.
document.querySelector('.review-jump').onclick=e=>{
  e.preventDefault();
  $('apply-changes').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  $('apply-changes').focus({preventScroll:true});
};


// Readable, touch-sized choices instead of the platform's tiny select popup.
const labelSelectControls=[];
function syncLabelSelects(){
  for(const {select,trigger,list,buttons} of labelSelectControls){
    const selectedText=select.selectedOptions[0]?.textContent||'Not sure';
    trigger.querySelector('.label-select-value').textContent=selectedText;
    trigger.setAttribute('aria-label',select.parentElement.childNodes[0].textContent.trim()+': '+selectedText);
    for(const button of buttons)button.setAttribute('aria-selected',String(button.dataset.value===select.value));
    list.hidden=true;trigger.setAttribute('aria-expanded','false');
  }
}
for(const select of document.querySelectorAll('#labels select')){
  const wrapper=element('div',undefined,'label-select');
  const trigger=element('button',undefined,'label-select-trigger');trigger.type='button';
  const name=select.parentElement.childNodes[0].textContent.trim();
  trigger.setAttribute('aria-label',name);trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const value=element('span',undefined,'label-select-value');
  const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');
  arrow.classList.add('label-select-arrow');arrow.setAttribute('viewBox','0 0 20 12');arrow.setAttribute('aria-hidden','true');
  const chevron=document.createElementNS('http://www.w3.org/2000/svg','path');
  chevron.setAttribute('d','M3 3 10 9 17 3');chevron.setAttribute('fill','none');chevron.setAttribute('stroke','currentColor');chevron.setAttribute('stroke-width','1.7');chevron.setAttribute('stroke-linecap','round');chevron.setAttribute('stroke-linejoin','round');
  arrow.append(chevron);trigger.append(value,arrow);
  const list=element('div',undefined,'label-select-options');list.id=select.id+'-choices';list.setAttribute('role','listbox');list.setAttribute('aria-label',name+' choices');list.hidden=true;
  trigger.setAttribute('aria-controls',list.id);
  const buttons=[];
  for(const option of select.options){
    if(option.hidden)continue;
    const button=element('button',option.textContent);button.type='button';button.dataset.value=option.value;button.setAttribute('role','option');
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));syncLabelSelects();trigger.focus({preventScroll:true});};
    button.onkeydown=event=>{
      const index=buttons.indexOf(button);let next;
      if(event.key==='ArrowDown')next=(index+1)%buttons.length;
      else if(event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=buttons.length-1;
      else if(event.key==='Escape'){event.preventDefault();syncLabelSelects();trigger.focus({preventScroll:true});return;}
      else return;
      event.preventDefault();buttons[next].focus();
    };
    buttons.push(button);list.append(button);
  }
  trigger.onclick=()=>{const opening=list.hidden;syncLabelSelects();list.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening)list.scrollIntoView({block:'nearest',inline:'nearest'});};
  trigger.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();syncLabelSelects();list.hidden=false;trigger.setAttribute('aria-expanded','true');(buttons.find(b=>b.dataset.value===select.value)||buttons[0]).focus();}};
  select.hidden=true;select.after(wrapper);wrapper.append(trigger,list);
  select.addEventListener('change',syncLabelSelects);
  labelSelectControls.push({select,trigger,list,buttons});
}
syncLabelSelects();
