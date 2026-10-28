import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { projects } from '../assets/content.js';
import { bedroomMarkup, desktopMarkup, createDesktop, runDesktopCommand, buildPreviewDocument, sanitizePreviewHTML, bedroomNotesKey } from '../assets/penthouse-bedroom.js';

function fixture(storage={getItem:()=>null,setItem(){}}){
  const dom=new JSDOM(`<main>${desktopMarkup()}</main>`,{url:'https://example.test/'});
  const document=dom.window.document,container=document.querySelector('main'),desktop=createDesktop(container,{storage});
  const find=selector=>container.querySelector(selector);
  const input=(selector,value)=>{const element=find(selector);element.value=value;element.dispatchEvent(new dom.window.Event('input',{bubbles:true}));return element;};
  const key=(selector,value,options={})=>find(selector).dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options}));
  return {dom,document,container,desktop,find,input,key,close(){desktop.dispose();dom.window.close();}};
}

test('bedroom controls expose the scene integrations and a desktop without nesting dialogs',()=>{
  const dom=new JSDOM(`<main>${bedroomMarkup()}${desktopMarkup()}</main>`),document=dom.window.document;
  try{
    assert.deepEqual([...document.querySelectorAll('[data-bedroom-preset]')].map(button=>button.dataset.bedroomPreset),['rainy-night','golden-hour','late-night-coding']);
    assert.deepEqual([...document.querySelector('[data-bedroom-lighting]').options].map(option=>option.value),['local','day','night']);
    assert.deepEqual([...document.querySelector('[data-bedroom-weather]').options].map(option=>option.value),['clear','rain']);
    assert.deepEqual([...document.querySelector('[data-bedroom-ambient]').options].map(option=>option.value),['off','rain','city']);
    assert.equal(document.querySelector('[data-bedroom-lofi]'),null);
    assert.ok(document.querySelector('[data-bedroom-desktop]'));
    assert.equal(document.querySelectorAll('dialog').length,0);
    assert.equal(document.querySelectorAll('[data-desktop-launch]').length,4);
    assert.ok([...document.querySelectorAll('textarea,input,select')].every(element=>element.labels.length>0),'Every editor and control has a real label');
  }finally{dom.window.close();}
});

test('terminal commands read an isolated virtual filesystem and return only named application actions',()=>{
  assert.equal(runDesktopCommand('pwd').output,'/home/visitor');
  assert.match(runDesktopCommand('help').output,/no access to your computer or a real shell/);
  assert.match(runDesktopCommand('ls').output,/about\.txt.*notes\.txt.*projects\//);
  assert.equal(runDesktopCommand('ls /').output,'home/');
  assert.equal(runDesktopCommand('ls /home').output,'visitor/');
  assert.equal(runDesktopCommand('ls ../..').output,'home/');
  assert.equal(runDesktopCommand('ls /../../..').output,'home/','Parent traversal stays within the virtual root');
  for(const project of projects){
    assert.ok(runDesktopCommand('ls projects').output.includes(`${project.id}.txt`));
    assert.ok(runDesktopCommand(`cat projects/${project.id}.txt`).output.includes(project.url));
    assert.deepEqual(runDesktopCommand(`open projects/${project.id}.txt`).open,{app:'projects',projectId:project.id});
  }
  assert.equal(runDesktopCommand('cat notes.txt',{notes:'a session note'}).output,'a session note');
  assert.equal(runDesktopCommand('cat "./about.txt"').output,runDesktopCommand('cat ~/about.txt').output);
  for(const path of ['/etc/passwd','../../../../Windows/win.ini','C:\\Users\\private','https://example.test/secrets'])assert.match(runDesktopCommand(`cat ${path}`).output,/file not found/);
  for(const command of ['eval alert(1)','fetch https://example.test','$(whoami)','ls; cat /etc/passwd','<script>alert(1)</script>']){
    const result=runDesktopCommand(command);assert.match(result.output,/command not found/);assert.equal(result.open,null);
  }
  assert.equal(runDesktopCommand('open javascript:alert(1)').open,null);
  assert.deepEqual(runDesktopCommand('open code').open,{app:'editor'});
  assert.deepEqual(runDesktopCommand('clear'),{output:'',clear:true,open:null});
  assert.equal(runDesktopCommand('pwd').output,'/home/visitor','Host paths and prior commands cannot change its virtual home');
});

test('preview strips active markup and external resources and adds a restrictive CSP before user content',()=>{
  const dom=new JSDOM(''),document=dom.window.document;
  try{
    const html='<h1 onclick="alert(1)" style="color: red; background: url(https://example.test/a)">Hello</h1><script>parent.document.body.remove()</script><iframe src="https://example.test"></iframe><img src="https://example.test/a"><svg onload="alert(1)"></svg><form action="https://example.test"><input></form><a href="javascript:alert(1)" target="_top" ping="https://example.test">unsafe</a><a href="#local" onclick="alert(1)">local</a><custom-tag>kept text</custom-tag><!-- hidden -->';
    const clean=sanitizePreviewHTML(html,document),fragment=JSDOM.fragment(clean);
    assert.equal(fragment.querySelectorAll('script,iframe,img,svg,form,input,custom-tag').length,0);
    assert.equal(fragment.querySelectorAll('[onclick],[target],[ping],[src]').length,0);
    assert.equal(fragment.querySelector('a').hasAttribute('href'),false);
    assert.equal(fragment.querySelectorAll('a')[1].getAttribute('href'),'#local');
    assert.ok(fragment.textContent.includes('kept text'));
    assert.equal(fragment.querySelector('h1').style.color,'red');
    assert.ok(!clean.includes('https://'));
    const source=buildPreviewDocument({html,css:'@import "https://example.test/style"; body { color: green; background: url(https://example.test/bg); } </style><script>alert(1)</script>',text:'<script>plain text</script>'},document);
    const preview=new JSDOM(source),previewDocument=preview.window.document;
    try{
      assert.equal(previewDocument.querySelectorAll('script,iframe,img,svg,form,input').length,0);
      const csp=previewDocument.querySelector('meta[http-equiv="Content-Security-Policy"]');
      for(const directive of ["default-src 'none'","script-src 'none'","connect-src 'none'","base-uri 'none'","form-action 'none'"])assert.ok(csp.content.includes(directive));
      assert.ok(source.indexOf('Content-Security-Policy')<source.indexOf('<h1'));
      assert.ok(previewDocument.querySelector('.desktop-text-note').textContent.includes('<script>plain text</script>'));
      assert.ok(!previewDocument.querySelector('style').textContent.includes('@import'));
    }finally{preview.window.close();}
  }finally{dom.window.close();}
});

test('notes persist locally and retain a visible session-only fallback when storage fails or its getter is denied',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  let app=fixture(storage);
  try{app.input('[data-desktop-notes]','A small plan.');assert.equal(values.get(bedroomNotesKey),'A small plan.');assert.equal(app.find('[data-notes-status]').textContent,'Saved on this device.');}
  finally{app.close();}
  app=fixture(storage);
  try{assert.equal(app.find('[data-desktop-notes]').value,'A small plan.');assert.match(app.find('[data-notes-status]').textContent,/loaded/);}
  finally{app.close();}
  app=fixture({getItem(){throw Error('denied');},setItem(){throw Error('quota');}});
  try{
    app.input('[data-desktop-notes]','Still here.');assert.match(app.find('[data-notes-status]').textContent,/Kept for this visit/);
    app.find('[data-window-action="close"][data-app="notes"]').click();app.find('[data-desktop-launch="notes"]').click();
    assert.equal(app.find('[data-desktop-notes]').value,'Still here.');
    app.input('[data-desktop-notes]','x'.repeat(20001));assert.equal(app.find('[data-desktop-notes]').value.length,20000);
    assert.equal(app.find('[data-notes-count]').textContent,'20000 / 20000');
  }finally{app.close();}
  const dom=new JSDOM(`<main>${desktopMarkup()}</main>`,{url:'https://example.test/'});
  Object.defineProperty(dom.window,'localStorage',{get(){throw Error('denied getter');}});
  const desktop=createDesktop(dom.window.document.querySelector('main'));
  try{assert.match(dom.window.document.querySelector('[data-notes-status]').textContent,/Browser storage is unavailable/);}
  finally{desktop.dispose();dom.window.close();}
});

test('windows launch, focus, minimize, close and restore without destroying application state',()=>{
  const app=fixture();
  try{
    const window=name=>app.find(`[data-desktop-window="${name}"]`);
    assert.equal(window('terminal').hidden,false);assert.equal(window('notes').hidden,false);assert.equal(window('editor').hidden,true);
    app.find('[data-desktop-launch="editor"]').click();assert.equal(window('editor').hidden,false);assert.equal(window('editor').dataset.active,'true');
    app.input('[data-editor-source="html"]','<h1>A session sketch</h1>');
    app.find('[data-editor-preview]').click();
    assert.ok(app.find('[data-editor-frame]').srcdoc.includes('A session sketch'));
    assert.equal(app.find('[data-editor-frame]').getAttribute('sandbox'),'');
    app.find('[data-window-action="close"][data-app="editor"]').click();assert.equal(window('editor').hidden,true);assert.equal(app.find('[data-desktop-task="editor"]'),null);
    assert.equal(app.document.activeElement,app.find('[data-desktop-launch="editor"]'));
    app.find('[data-desktop-launch="editor"]').click();assert.equal(app.find('[data-editor-source="html"]').value,'<h1>A session sketch</h1>');
    app.find('[data-window-action="minimize"][data-app="editor"]').click();assert.equal(window('editor').hidden,true);
    assert.match(app.find('[data-desktop-task="editor"]').getAttribute('aria-label'),/Restore/);
    app.find('[data-desktop-task="editor"]').click();assert.equal(window('editor').hidden,false);
    app.find('[data-desktop-reset]').click();assert.equal(app.find('[data-editor-source="html"]').value,'<h1>A session sketch</h1>');
    app.find('[data-desktop-restore]').click();assert.ok([...app.container.querySelectorAll('[data-desktop-window]')].every(element=>!element.hidden));
    app.find(`[data-project-select="${projects[1].id}"]`).click();assert.equal(app.find('[data-project-title]').textContent,projects[1].title);
    assert.equal(app.find('[data-project-link]').href,projects[1].url);
    app.desktop.dispose();app.desktop.dispose();
    app.find('[data-window-action="close"][data-app="editor"]').click();assert.equal(window('editor').hidden,false,'Disposed listeners no longer mutate the desktop');
  }finally{app.close();}
});

test('window movement has bounded keyboard and pointer controls, and editor tabs support arrow navigation',()=>{
  const app=fixture();
  try{
    const workspace=app.find('.desktop-workspace'),terminal=app.find('[data-desktop-window="terminal"]');
    workspace.getBoundingClientRect=()=>({width:1000,height:550});terminal.getBoundingClientRect=()=>({width:510,height:350});
    const handle='[data-window-drag="terminal"]';
    app.key(handle,'Home');const initial=parseInt(terminal.style.left);
    app.key(handle,'ArrowRight');assert.equal(parseInt(terminal.style.left),initial+16);
    app.key(handle,'ArrowDown',{shiftKey:true});assert.equal(parseInt(terminal.style.top),64);
    for(let index=0;index<40;index++)app.key(handle,'ArrowRight',{shiftKey:true});assert.equal(parseInt(terminal.style.left),490);
    for(let index=0;index<40;index++)app.key(handle,'ArrowUp',{shiftKey:true});assert.equal(parseInt(terminal.style.top),0);
    app.key(handle,'Home');
    function pointer(target,type,x,y){const event=new app.dom.window.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:4});target.dispatchEvent(event);}
    pointer(app.find(handle),'pointerdown',30,40);pointer(app.dom.window,'pointermove',110,100);pointer(app.dom.window,'pointerup',110,100);
    assert.equal(parseInt(terminal.style.left),initial+80);assert.equal(parseInt(terminal.style.top),76);
    app.find('[data-desktop-launch="editor"]').click();app.key('[data-editor-tab="html"]','ArrowRight');
    assert.equal(app.find('[data-editor-tab="css"]').getAttribute('aria-selected'),'true');assert.equal(app.find('#desktop-panel-css').hidden,false);assert.equal(app.find('#desktop-panel-html').hidden,true);
    assert.equal(app.document.activeElement,app.find('[data-editor-tab="css"]'));
    app.key('[data-editor-tab="css"]','End');assert.equal(app.find('[data-editor-tab="text"]').getAttribute('aria-selected'),'true');
  }finally{app.close();}
});

test('terminal renders input as text, opens project files, recalls history and clears only its output',()=>{
  const app=fixture();
  const command=value=>{app.find('[data-terminal-input]').value=value;app.find('[data-terminal-form]').dispatchEvent(new app.dom.window.Event('submit',{bubbles:true,cancelable:true}));};
  try{
    app.input('[data-desktop-notes]','Do not clear this note.');
    command('<img src=x onerror=alert(1)>');assert.equal(app.find('[data-terminal-output]').querySelector('img'),null);assert.match(app.find('[data-terminal-output]').textContent,/<img src=x/);
    command(`open projects/${projects[1].id}.txt`);assert.equal(app.find('[data-desktop-window="projects"]').hidden,false);assert.equal(app.find('[data-project-title]').textContent,projects[1].title);
    app.key('[data-terminal-input]','ArrowUp');assert.equal(app.find('[data-terminal-input]').value,`open projects/${projects[1].id}.txt`);
    command('cat notes.txt');assert.match(app.find('[data-terminal-output]').textContent,/Do not clear this note/);
    command('clear');assert.equal(app.find('[data-terminal-output]').textContent,'');assert.equal(app.find('[data-desktop-notes]').value,'Do not clear this note.');
  }finally{app.close();}
});
