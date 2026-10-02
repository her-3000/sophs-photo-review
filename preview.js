'use strict';
const frames = [...document.querySelectorAll('iframe')];
let version = '', refreshing = false;
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
async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  const status = document.querySelector('#preview-status');
  status.textContent = 'Refreshing…';
  try {
    const response = await fetch('/preview/document');
    if (!response.ok) throw new Error('Preview unavailable');
    const data = await response.json();
    for (const frame of frames) {
      let position = {x: 0, y: 0};
      try { position = {x: frame.contentWindow.scrollX, y: frame.contentWindow.scrollY}; } catch {}
      frame.onload = () => { frame.contentWindow.scrollTo(position.x, position.y); };
      frame.srcdoc = data.html;
    }
    sizeScreens();
    status.textContent = 'Live · refreshes with edits';
  } catch { status.textContent = 'Could not refresh. Try Refresh all.'; }
  finally { refreshing = false; }
}
async function checkChanges() {
  try {
    const response = await fetch('/preview/version');
    if (!response.ok) return;
    const data = await response.json();
    if (data.version !== version) { version = data.version; await refreshAll(); }
  } catch {}
}
new ResizeObserver(sizeScreens).observe(document.querySelector('main'));
document.querySelector('#refresh').onclick = refreshAll;
sizeScreens();
checkChanges();
setInterval(checkChanges, 2000);
