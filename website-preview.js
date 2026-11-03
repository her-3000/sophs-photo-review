'use strict';
const frames = [...document.querySelectorAll('iframe')];
let refreshing = false;
function sizeScreens() {
  for (const frame of frames) {
    const screen = frame.parentElement;
    const width = Number(frame.dataset.width), height = Number(frame.dataset.height);
    const scale = screen.clientWidth / width;
    const style = getComputedStyle(screen);
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    screen.style.height = (height * scale + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)) + 'px';
  }
}
async function refreshAll(){
 if(refreshing)return;refreshing=true;
 const status=document.querySelector('#preview-status');status.textContent='Refreshing…';
 try{
  const response=await fetch('/preview/document');if(!response.ok)throw Error('Preview unavailable');
  const data=await response.json();
  for(const frame of frames){
   if(frame.dataset.kind==='photos')frame.srcdoc=data.html;
   else if(!frame.src)frame.src=frame.dataset.kind==='login'?'http://127.0.0.1:4176/model-login.html':'http://127.0.0.1:4176/';
  }
  sizeScreens();status.textContent='Local Sophie preview · choices unchanged';
 }catch{status.textContent='Could not load Sophie’s photos. Try Refresh all.';}finally{refreshing=false;}
}
for(const main of document.querySelectorAll('main'))new ResizeObserver(sizeScreens).observe(main);
document.querySelector('#refresh').onclick=refreshAll;
sizeScreens();refreshAll();
for(const group of ['home','login','sophie'])for(const [id,title] of [['computer','Computer preview'],['tablet','iPad preview'],['phone','iPhone preview']]){
 document.querySelector('#'+group+'-'+id+'-size').onchange=event=>{
  const [width,height]=event.target.value.split('x').map(Number);
  const frame=document.querySelector('#'+group+' iframe[title$="'+title+'"]');
  frame.dataset.width=String(width);frame.dataset.height=String(height);
  document.querySelector('#'+group+'-'+id+'-dimensions').textContent=width+' × '+height;sizeScreens();
 };
}
