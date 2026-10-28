import { projects, profile } from './content.js';

const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const apps=['terminal','notes','projects','editor'];
const appNames={terminal:'Terminal',notes:'Notes',projects:'Projects',editor:'Code studio'};
const home='/home/visitor';
export const bedroomNotesKey='penthouse-bedroom-notes-v1';
const noteLimit=20000,sourceLimit=30000;
const sampleHTML='<article class="card">\n  <h1>HTML preview</h1>\n  <p>Edit the HTML or CSS to update this page.</p>\n</article>';
const sampleCSS='body { margin: 0; padding: 28px; background: #ede7dc; color: #263c37; font-family: Georgia, serif; }\n.card { padding: 24px; border: 1px solid #8b9d90; border-radius: 18px; background: #faf7ef; }\n.eyebrow { font: 11px monospace; text-transform: uppercase; letter-spacing: .12em; }\nh1 { font-weight: normal; font-size: 32px; }\n.desktop-text-note { margin-top: 24px; font: 13px/1.6 monospace; white-space: pre-wrap; }';
const sampleText='Text entered here appears below the HTML preview.';
const projectFiles=Object.fromEntries(projects.map(project=>[`${home}/projects/${project.id}.txt`,`${project.title}\n${project.description}\n\n${project.stack.join(' · ')}\n${project.url}`]));
const staticFiles={
  [`${home}/readme.txt`]:'This is a simulated desktop. Try help, ls, cat about.txt, or open projects.',
  [`${home}/about.txt`]:`${profile.name}\n${profile.degree}\n${profile.university} · ${profile.location}`,
  ...projectFiles,
};

export function bedroomMarkup(){
  return `<section class="bedroom-atmosphere" aria-labelledby="bedroom-atmosphere-title">
    <h4 id="bedroom-atmosphere-title">Room settings</h4>
    <div class="bedroom-presets" role="group" aria-label="Bedroom atmosphere presets">
      <button type="button" data-bedroom-preset="rainy-night" aria-pressed="false">Rainy Night</button>
      <button type="button" data-bedroom-preset="golden-hour" aria-pressed="false">Golden Hour</button>
      <button type="button" data-bedroom-preset="late-night-coding" aria-pressed="false">Late-Night Coding</button>
    </div>
    <div class="bedroom-atmosphere-controls">
      <label>Light<select data-bedroom-lighting><option value="local">Local time</option><option value="day">Day</option><option value="night">Night</option></select></label>
      <label>Weather<select data-bedroom-weather><option value="clear">Clear</option><option value="rain">Rain</option></select></label>
      <label>Room sound<select data-bedroom-ambient><option value="off">Off</option><option value="rain">Rain</option><option value="city">City at night</option></select></label>
    </div>
    <div class="bedroom-atmosphere-actions"><button type="button" data-bedroom-desktop>Open bedroom desktop <span aria-hidden="true">↗</span></button></div>
  </section>`;
}

function titlebar(app){
  return `<header class="desktop-window-bar"><button type="button" class="desktop-window-drag" data-window-drag="${app}" aria-describedby="desktop-move-help"><span class="desktop-window-dot" aria-hidden="true"></span><span id="desktop-title-${app}">${appNames[app]}</span><span class="desktop-drag-mark" aria-hidden="true">⠿</span></button><button type="button" data-window-action="minimize" data-app="${app}" aria-label="Minimize ${appNames[app]}">−</button><button type="button" data-window-action="close" data-app="${app}" aria-label="Close ${appNames[app]}">×</button></header>`;
}

export function desktopMarkup(){
  return `<section class="penthouse-desktop" aria-labelledby="bedroom-desktop-name">
    <header class="desktop-topline"><div><p class="desktop-eyebrow">Penthouse / personal computer</p><h3 id="bedroom-desktop-name">Desktop</h3></div><div class="desktop-layout-controls"><button type="button" data-desktop-restore>Restore windows</button><button type="button" data-desktop-reset>Reset layout</button></div></header>
    <p class="desktop-instructions" id="desktop-move-help">Drag a window title to move it. With its title focused, use arrow keys to move, Shift for a larger step, or Home to reset its position. On small screens, apps stack.</p>
    <nav class="desktop-launchers" aria-label="Desktop apps">${apps.map((app,index)=>`<button type="button" data-desktop-launch="${app}" aria-controls="desktop-window-${app}"><span aria-hidden="true">${['>_','✎','▤','&lt;/&gt;'][index]}</span>${appNames[app]}</button>`).join('')}</nav>
    <div class="desktop-workspace">
      <section class="desktop-window desktop-terminal" id="desktop-window-terminal" data-desktop-window="terminal" aria-labelledby="desktop-title-terminal" tabindex="-1">${titlebar('terminal')}<div class="desktop-window-body"><p class="desktop-app-caption">Simulated terminal.</p><pre class="desktop-terminal-output" data-terminal-output role="log" aria-label="Terminal output" aria-live="polite" aria-relevant="additions text"></pre><form class="desktop-terminal-form" data-terminal-form><label for="desktop-terminal-input"><span aria-hidden="true">visitor ~ $</span><span class="desktop-sr-only">Terminal command</span></label><input id="desktop-terminal-input" data-terminal-input type="text" maxlength="500" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Try help"><button type="submit">Run</button></form></div></section>
      <section class="desktop-window desktop-notes" id="desktop-window-notes" data-desktop-window="notes" aria-labelledby="desktop-title-notes" tabindex="-1">${titlebar('notes')}<div class="desktop-window-body"><label class="desktop-field-label" for="desktop-notes-text">Notes</label><textarea id="desktop-notes-text" data-desktop-notes maxlength="${noteLimit}" spellcheck="true"></textarea><div class="desktop-notes-footer"><p data-notes-status role="status" aria-live="polite"></p><span data-notes-count>0 / ${noteLimit}</span></div><p class="desktop-app-caption">Saved automatically on this device when browser storage is available.</p></div></section>
      <section class="desktop-window desktop-projects" id="desktop-window-projects" data-desktop-window="projects" aria-labelledby="desktop-title-projects" tabindex="-1" hidden>${titlebar('projects')}<div class="desktop-window-body"><ul class="desktop-project-list">${projects.map((project,index)=>`<li><button type="button" data-project-select="${escapeHTML(project.id)}" aria-pressed="${index===0}"><span>${escapeHTML(project.title)}</span><small>${escapeHTML(project.year)}</small></button></li>`).join('')}</ul><article class="desktop-project-detail"><h4 data-project-title></h4><p data-project-description></p><p class="desktop-project-stack" data-project-stack></p><a data-project-link target="_blank" rel="noopener noreferrer">View project source <span aria-hidden="true">↗</span></a></article></div></section>
      <section class="desktop-window desktop-editor" id="desktop-window-editor" data-desktop-window="editor" aria-labelledby="desktop-title-editor" tabindex="-1" hidden>${titlebar('editor')}<div class="desktop-window-body"><div class="desktop-editor-tabs" role="tablist" aria-label="Code studio files">${['html','css','text'].map((type,index)=>`<button type="button" id="desktop-tab-${type}" data-editor-tab="${type}" role="tab" aria-selected="${index===0}" aria-controls="desktop-panel-${type}" tabindex="${index===0?0:-1}">${type==='text'?'Text':type.toUpperCase()}</button>`).join('')}</div>${['html','css','text'].map((type,index)=>`<div id="desktop-panel-${type}" class="desktop-editor-panel" role="tabpanel" aria-labelledby="desktop-tab-${type}"${index?' hidden':''}><label class="desktop-sr-only" for="desktop-source-${type}">${type==='text'?'Plain text':type.toUpperCase()} source</label><textarea id="desktop-source-${type}" data-editor-source="${type}" maxlength="${sourceLimit}" spellcheck="false" autocapitalize="off" autocomplete="off">${escapeHTML({html:sampleHTML,css:sampleCSS,text:sampleText}[type])}</textarea></div>`).join('')}<div class="desktop-editor-tools"><button type="button" data-editor-preview>Update preview</button><button type="button" data-editor-sample>Restore sample</button><span data-editor-status role="status" aria-live="polite">Preview ready.</span></div><iframe class="desktop-editor-preview" data-editor-frame title="Your HTML, CSS, and text preview" sandbox="" referrerpolicy="no-referrer"></iframe><p class="desktop-app-caption">Preview updates as you type. Scripts and external assets are disabled. Code stays in this session.</p></div></section>
    </div>
    <footer class="desktop-taskbar"><span class="desktop-taskbar-label">Open apps</span><div data-desktop-tasks></div><p data-desktop-status role="status" aria-live="polite">Terminal and Notes are open.</p></footer>
  </section>`;
}

function resolveVirtualPath(value='.'){
  let path=value==='~'?home:value.startsWith('~/')?`${home}/${value.slice(2)}`:value.startsWith('/')?value:`${home}/${value}`;
  const parts=[];
  for(const part of path.split('/')){if(!part||part==='.')continue;if(part==='..')parts.pop();else parts.push(part);}
  return `/${parts.join('/')}`;
}

/** This parser reads only the virtual files below. It never executes visitor input. */
export function runDesktopCommand(value,{notes=''}={}){
  const line=String(value).slice(0,500).trim();
  const words=[...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(match=>match[1]??match[2]??match[3]);
  const command=words.shift()||'',argument=words.join(' '),path=resolveVirtualPath(argument||'.');
  const files={...staticFiles,[`${home}/notes.txt`]:String(notes).slice(0,noteLimit)};
  const result=(output='',extra={})=>({output,clear:false,open:null,...extra});
  if(!command)return result();
  if(command==='help')return result('Commands\n  help                  Show this list\n  pwd                   Print the virtual home folder\n  ls [folder]           List files\n  cat <file>            Read a text file\n  open <app or project> Open notes, projects, editor, terminal, or a project file\n  clear                 Clear this terminal\n\nTry: ls projects  ·  cat about.txt  ·  open notes\nThis simulated terminal has no access to your computer or a real shell.');
  if(command==='pwd')return result(home);
  if(command==='clear')return result('',{clear:true});
  if(command==='ls'){
    if(Object.hasOwn(files,path))return result(path.split('/').at(-1));
    const prefix=path==='/'?'/':`${path}/`,entries=[...new Set(Object.keys(files).filter(file=>file.startsWith(prefix)).map(file=>{const rest=file.slice(prefix.length),slash=rest.indexOf('/');return slash<0?rest:`${rest.slice(0,slash)}/`;}))];
    return result(entries.length?entries.sort().join('  '):`ls: ${argument||'.'}: folder not found`);
  }
  if(command==='cat')return result(!argument?'Usage: cat <file>':Object.hasOwn(files,path)?files[path]:`cat: ${argument}: file not found`);
  if(command==='open'){
    const alias=argument==='code'?'editor':argument;
    if(apps.includes(alias))return result(`Opening ${appNames[alias]}.`,{open:{app:alias}});
    if(path===`${home}/notes.txt`)return result('Opening Notes.',{open:{app:'notes'}});
    const project=projects.find(item=>path===`${home}/projects/${item.id}.txt`||argument===item.id);
    if(project)return result(`Opening ${project.title}.`,{open:{app:'projects',projectId:project.id}});
    return result('Open an app: terminal, notes, projects, editor; or a file listed in projects/.');
  }
  return result(`${command}: command not found. Type help for this desktop’s commands.`);
}

function cleanPreviewCSS(value){
  return String(value).slice(0,sourceLimit).replace(/\0/g,'').replace(/<\s*\/\s*style/gi,'').replace(/@import\b[^;{}]*(?:;|$)/gi,'').replace(/url\s*\([^)]*\)/gi,'none');
}

/** An allowlist removes active markup before it enters the separate, opaque preview. */
export function sanitizePreviewHTML(value,document){
  const template=document.createElement('template');
  template.innerHTML=String(value).slice(0,sourceLimit);
  const allowed=new Set('a abbr b blockquote br caption code col colgroup dd del details div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i kbd li main mark nav ol p pre s samp section small span strong sub summary sup table tbody td th thead tr u ul'.split(' '));
  const discard=new Set('script style iframe object embed link meta base template noscript svg math img picture source audio video track canvas form input textarea select button'.split(' '));
  function clean(parent){
    for(const node of [...parent.childNodes]){
      if(node.nodeType===3)continue;
      if(node.nodeType!==1){node.remove();continue;}
      const tag=node.localName.toLowerCase();
      if(discard.has(tag)){node.remove();continue;}
      clean(node);
      if(!allowed.has(tag)){node.replaceWith(...node.childNodes);continue;}
      for(const attribute of [...node.attributes]){
        const name=attribute.name,value=attribute.value;
        if(['class','id','title','lang'].includes(name))continue;
        if(name==='dir'&&['ltr','rtl','auto'].includes(value))continue;
        if(name==='href'&&tag==='a'&&/^#[\w:.-]*$/.test(value))continue;
        if(name==='open'&&tag==='details')continue;
        if(['colspan','rowspan','span'].includes(name)&&/^\d{1,2}$/.test(value))continue;
        if(name==='scope'&&['row','col','rowgroup','colgroup'].includes(value))continue;
        if(name==='style'){node.setAttribute(name,cleanPreviewCSS(value));continue;}
        node.removeAttribute(name);
      }
    }
  }
  clean(template.content);
  return template.innerHTML;
}

export function buildPreviewDocument({html='',css='',text=''}={},document){
  if(!document?.createElement)throw new TypeError('A document is required to build a safe preview.');
  const policy="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; media-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Code studio preview</title><style>${cleanPreviewCSS(css)}</style></head><body>${sanitizePreviewHTML(html,document)}${text?`<div class="desktop-text-note">${escapeHTML(String(text).slice(0,sourceLimit))}</div>`:''}</body></html>`;
}

export function createDesktop(container,options={}){
  const document=container.ownerDocument,view=document.defaultView;
  let root=container.matches('.penthouse-desktop')?container:container.querySelector('.penthouse-desktop');
  if(!root){container.insertAdjacentHTML('beforeend',desktopMarkup());root=container.querySelector('.penthouse-desktop');}
  let storage;
  try{storage=Object.hasOwn(options,'storage')?options.storage:view?.localStorage;}catch{/* Some browsers deny the localStorage getter. */}
  const workspace=root.querySelector('.desktop-workspace'),status=root.querySelector('[data-desktop-status]'),tasks=root.querySelector('[data-desktop-tasks]');
  const notes=root.querySelector('[data-desktop-notes]'),notesStatus=root.querySelector('[data-notes-status]'),noteCount=root.querySelector('[data-notes-count]');
  const output=root.querySelector('[data-terminal-output]'),commandInput=root.querySelector('[data-terminal-input]');
  const sources=Object.fromEntries([...root.querySelectorAll('[data-editor-source]')].map(element=>[element.dataset.editorSource,element]));
  const frame=root.querySelector('[data-editor-frame]'),editorStatus=root.querySelector('[data-editor-status]');
  const defaults={terminal:{x:.02,y:16,width:510},notes:{x:.43,y:132,width:420},projects:{x:.12,y:72,width:470},editor:{x:.4,y:72,width:550}};
  const windows=new Map(apps.map(app=>[app,{element:root.querySelector(`[data-desktop-window="${app}"]`),open:['terminal','notes'].includes(app),minimized:false,x:0,y:0,z:0}]));
  const history=[];let historyIndex=0,historyDraft='',top=0,active='terminal',drag=null,previewTimer=null,disposed=false;
  const listeners=[];
  function listen(element,type,handler,options){element.addEventListener(type,handler,options);listeners.push(()=>element.removeEventListener(type,handler,options));}
  const announce=text=>{status.textContent=text;};
  function bounds(app){
    const element=windows.get(app).element,rect=workspace.getBoundingClientRect(),windowRect=element.getBoundingClientRect();
    const width=rect.width||workspace.clientWidth||Math.min(view?.innerWidth||1000,1040),height=rect.height||workspace.clientHeight||550;
    return {width,maxX:Math.max(0,width-(windowRect.width||Math.min(defaults[app].width,width-24))),maxY:Math.max(0,height-(windowRect.height||365))};
  }
  function place(app,x,y){const state=windows.get(app),box=bounds(app);state.x=Math.round(Math.max(0,Math.min(x,box.maxX)));state.y=Math.round(Math.max(0,Math.min(y,box.maxY)));state.element.style.left=`${state.x}px`;state.element.style.top=`${state.y}px`;}
  function resetPosition(app){const box=bounds(app);place(app,box.width*defaults[app].x,defaults[app].y);}
  function taskbar(){
    const buttons=apps.filter(app=>windows.get(app).open).map(app=>{const state=windows.get(app);return `<button type="button" data-desktop-task="${app}" aria-controls="desktop-window-${app}" aria-pressed="${active===app&&!state.minimized}" aria-label="${state.minimized?'Restore':'Focus'} ${appNames[app]}">${appNames[app]}${state.minimized?' <span aria-hidden="true">↥</span>':''}</button>`;}).join('');
    tasks.innerHTML=buttons||'<span class="desktop-no-apps">Choose an app above.</span>';
  }
  function focusWindow(app,focusContent=false){
    const state=windows.get(app);if(!state?.open||state.minimized)return;
    active=app;state.z=++top;state.element.style.zIndex=String(top);
    for(const [name,item]of windows)item.element.dataset.active=String(name===app);
    taskbar();
    if(focusContent){const target=app==='terminal'?commandInput:app==='notes'?notes:app==='editor'?root.querySelector('[data-editor-tab][aria-selected="true"]'):state.element.querySelector('[data-project-select][aria-pressed="true"]');(target||state.element).focus({preventScroll:true});}
  }
  function launch(app,focus=true){const state=windows.get(app);if(!state)return;state.open=true;state.minimized=false;state.element.hidden=false;place(app,state.x,state.y);focusWindow(app,focus);announce(`${appNames[app]} is open.`);}
  function hideWindow(app,minimize){
    const state=windows.get(app);state.minimized=minimize;state.open=minimize;state.element.hidden=true;
    if(active===app)active=null;
    taskbar();
    const target=root.querySelector(minimize?`[data-desktop-task="${app}"]`:`[data-desktop-launch="${app}"]`);target?.focus({preventScroll:true});
    announce(`${appNames[app]} ${minimize?'minimized. Restore it from Open apps.':'closed. Its work is kept for this visit.'}`);
  }
  function showProject(id){
    const project=projects.find(item=>item.id===id)||projects[0];if(!project)return;
    root.querySelector('[data-project-title]').textContent=project.title;
    root.querySelector('[data-project-description]').textContent=project.description;
    root.querySelector('[data-project-stack]').textContent=project.stack.join(' · ');
    root.querySelector('[data-project-link]').href=project.url;
    for(const button of root.querySelectorAll('[data-project-select]'))button.setAttribute('aria-pressed',String(button.dataset.projectSelect===project.id));
  }
  function updateNotes(persist=false){
    if(notes.value.length>noteLimit)notes.value=notes.value.slice(0,noteLimit);
    noteCount.textContent=`${notes.value.length} / ${noteLimit}`;
    if(persist){
      try{if(!storage?.setItem)throw new Error('Storage unavailable');storage.setItem(bedroomNotesKey,notes.value);notesStatus.textContent='Saved on this device.';}
      catch{notesStatus.textContent='Kept for this visit. Browser storage is unavailable.';}
    }
  }
  function updatePreview(){
    if(disposed)return;
    if(previewTimer!==null){view.clearTimeout(previewTimer);previewTimer=null;}
    frame.srcdoc=buildPreviewDocument(Object.fromEntries(Object.entries(sources).map(([key,element])=>[key,element.value])),document);
    editorStatus.textContent='Preview updated.';
  }
  function setEditorTab(type,focus=false){
    for(const button of root.querySelectorAll('[data-editor-tab]')){const selected=button.dataset.editorTab===type;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;root.querySelector(`#desktop-panel-${button.dataset.editorTab}`).hidden=!selected;if(selected&&focus)button.focus();}
  }
  function appendTerminal(text){output.textContent=(output.textContent+text).slice(-24000);output.scrollTop=output.scrollHeight;}
  const onClick=event=>{
    const target=event.target.closest('button');if(!target||!root.contains(target))return;
    if(target.dataset.desktopLaunch)launch(target.dataset.desktopLaunch);
    else if(target.dataset.desktopTask)launch(target.dataset.desktopTask);
    else if(target.dataset.windowAction)hideWindow(target.dataset.app,target.dataset.windowAction==='minimize');
    else if(target.hasAttribute('data-desktop-restore')){for(const app of apps)launch(app,false);announce('All four windows restored.');root.querySelector('[data-window-drag="editor"]').focus({preventScroll:true});}
    else if(target.hasAttribute('data-desktop-reset')){for(const app of apps)resetPosition(app);announce('Window positions reset. Your work is kept.');}
    else if(target.dataset.projectSelect)showProject(target.dataset.projectSelect);
    else if(target.dataset.editorTab)setEditorTab(target.dataset.editorTab);
    else if(target.hasAttribute('data-editor-preview'))updatePreview();
    else if(target.hasAttribute('data-editor-sample')){sources.html.value=sampleHTML;sources.css.value=sampleCSS;sources.text.value=sampleText;updatePreview();editorStatus.textContent='Sample restored.';}
  };
  listen(root,'click',onClick);
  listen(root,'focusin',event=>{const element=event.target.closest('[data-desktop-window]');if(element&&active!==element.dataset.desktopWindow)focusWindow(element.dataset.desktopWindow);});
  listen(root,'pointerdown',event=>{
    const element=event.target.closest('[data-desktop-window]');if(element)focusWindow(element.dataset.desktopWindow);
    const handle=event.target.closest('[data-window-drag]');if(!handle||event.button!==0)return;
    event.preventDefault();const app=handle.dataset.windowDrag,state=windows.get(app);handle.focus({preventScroll:true});drag={app,x:event.clientX,y:event.clientY,startX:state.x,startY:state.y,pointerId:event.pointerId,handle};
    try{handle.setPointerCapture?.(event.pointerId);}catch{/* Capture is optional on older browsers. */}
  });
  listen(view,'pointermove',event=>{if(!drag||event.pointerId!==drag.pointerId)return;place(drag.app,drag.startX+event.clientX-drag.x,drag.startY+event.clientY-drag.y);});
  const endDrag=event=>{if(!drag||event.pointerId!==drag.pointerId)return;try{drag.handle.releasePointerCapture?.(drag.pointerId);}catch{}drag=null;};
  listen(view,'pointerup',endDrag);listen(view,'pointercancel',endDrag);
  const fitWindows=()=>{for(const [app,state]of windows)place(app,state.x,state.y);};
  listen(view,'resize',fitWindows);
  // Dialogs have no layout while closed; fit once their workspace becomes visible.
  const resizeObserver=view.ResizeObserver?new view.ResizeObserver(fitWindows):null;
  resizeObserver?.observe(workspace);
  listen(root,'keydown',event=>{
    const handle=event.target.closest('[data-window-drag]');
    if(handle&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)){
      event.preventDefault();const app=handle.dataset.windowDrag,state=windows.get(app),step=event.shiftKey?48:16;
      if(event.key==='Home')resetPosition(app);else place(app,state.x+({ArrowLeft:-step,ArrowRight:step}[event.key]||0),state.y+({ArrowUp:-step,ArrowDown:step}[event.key]||0));
      announce(`${appNames[app]} position: ${state.x}, ${state.y}.`);
    }
    const tab=event.target.closest('[data-editor-tab]');
    if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();const types=['html','css','text'],index=types.indexOf(tab.dataset.editorTab),next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;setEditorTab(types[next],true);
    }
    if(event.target===commandInput&&['ArrowUp','ArrowDown'].includes(event.key)&&history.length){
      event.preventDefault();if(historyIndex===history.length)historyDraft=commandInput.value;historyIndex=Math.max(0,Math.min(history.length,historyIndex+(event.key==='ArrowUp'?-1:1)));commandInput.value=historyIndex===history.length?historyDraft:history[historyIndex];
    }
  });
  listen(root.querySelector('[data-terminal-form]'),'submit',event=>{
    event.preventDefault();const line=commandInput.value.slice(0,500);if(!line.trim())return;
    history.push(line);if(history.length>60)history.shift();historyIndex=history.length;historyDraft='';commandInput.value='';
    const result=runDesktopCommand(line,{notes:notes.value});
    if(result.clear)output.textContent='';else appendTerminal(`\nvisitor ~ $ ${line}\n${result.output}\n`);
    if(result.open){if(result.open.projectId)showProject(result.open.projectId);launch(result.open.app);}
  });
  listen(notes,'input',()=>updateNotes(true));
  for(const source of Object.values(sources))listen(source,'input',()=>{editorStatus.textContent='Updating preview…';if(previewTimer!==null)view.clearTimeout(previewTimer);previewTimer=view.setTimeout(updatePreview,250);});
  try{if(!storage?.getItem)throw new Error('Storage unavailable');const saved=storage.getItem(bedroomNotesKey);notes.value=typeof saved==='string'?saved.slice(0,noteLimit):'';notesStatus.textContent=typeof saved==='string'?'Saved note loaded.':'Ready. Notes save on this device.';}
  catch{notesStatus.textContent='Kept for this visit. Browser storage is unavailable.';}
  updateNotes();showProject(projects[0]?.id);updatePreview();
  output.textContent='BEDROOM TERMINAL / visitor\nType help for available commands.\n';
  for(const [app,state]of windows){state.element.hidden=!state.open;resetPosition(app);}
  focusWindow('notes');focusWindow('terminal');
  return {dispose(){if(disposed)return;disposed=true;for(const remove of listeners)remove();resizeObserver?.disconnect();if(previewTimer!==null)view.clearTimeout(previewTimer);drag=null;}};
}
