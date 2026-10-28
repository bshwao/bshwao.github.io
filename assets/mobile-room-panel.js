/** Mobile reading and scene controls; changing views never remounts activities. */
export function createMobileRoomPanel(page) {
  const win=page.ownerDocument.defaultView;
  const media=win.matchMedia('(max-width: 760px), (max-width: 1000px) and (max-height: 520px), (max-width: 1000px) and (orientation: portrait)');
  const controls=page.querySelector('#room-panel-views'),scroll=page.querySelector('#interior-scroll');
  const navigation=page.querySelector('#station-navigation');
  let current='split';
  function refreshNavigation(){
    const active=navigation.querySelector('[aria-pressed="true"]');
    if(!active||navigation.scrollWidth<=navigation.clientWidth)return;
    const item=active.getBoundingClientRect(),bounds=navigation.getBoundingClientRect();
    if(item.left<bounds.left)navigation.scrollLeft-=bounds.left-item.left;
    else if(item.right>bounds.right)navigation.scrollLeft+=item.right-bounds.right;
  }
  function sync(){
    scroll.inert=media.matches&&current==='scene';
    if(!media.matches&&controls.contains(page.ownerDocument.activeElement))
      page.querySelector('#interior-room-title')?.focus({preventScroll:true});
    refreshNavigation();
  }
  function setView(value){
    if(!['scene','split','read'].includes(value))return;
    current=value;page.dataset.roomPanel=value;
    for(const button of controls.querySelectorAll('[data-panel-view]'))button.setAttribute('aria-pressed',String(button.dataset.panelView===value));
    if(value==='scene'&&scroll.contains(page.ownerDocument.activeElement))controls.querySelector('[data-panel-view="scene"]').focus({preventScroll:true});
    sync();
  }
  function click(event){const button=event.target.closest('[data-panel-view]');if(button)setView(button.dataset.panelView);}
  controls.addEventListener('click',click);media.addEventListener('change',sync);win.addEventListener('resize',sync);
  setView('split');
  return {
    setView,refreshNavigation,
    revealForFocus(){if(media.matches&&current==='scene')setView('split');},
    dispose(){controls.removeEventListener('click',click);media.removeEventListener('change',sync);win.removeEventListener('resize',sync);scroll.inert=false;},
  };
}
