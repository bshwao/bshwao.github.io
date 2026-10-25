export const introSessionKey = 'eh-intro-seen-v1';

export function shouldShowIntro(hash, storage) {
  if (hash && hash !== '#tower') return false;
  try { return storage?.getItem(introSessionKey) !== '1'; }
  catch { return true; }
}

/** A finite, user-paced title page. The city renders before its curtain opens. */
export function createPortfolioIntro({ dialog, page, storage, reducedMotion = () => false, onEntered }) {
  const document = dialog.ownerDocument, window = document.defaultView;
  const button = dialog.querySelector('#intro-enter'), status = dialog.querySelector('#intro-status');
  const buttonMarkup = button.innerHTML;
  let ready = false, requested = false, timer = null, disposed = false;

  function dismiss({ remember = false, focus = false } = {}) {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    const hadFocus = dialog.contains(document.activeElement) || document.activeElement === dialog || document.activeElement === document.body;
    const wasOpen = dialog.open;
    dialog.inert = false;
    dialog.dataset.state = 'closed';
    if (wasOpen) dialog.close();
    delete document.documentElement.dataset.intro;
    page.inert = false;
    requested = false;
    if (remember) {
      try { storage?.setItem(introSessionKey, '1'); } catch { /* The intro still works without storage. */ }
    }
    if (focus && hadFocus && wasOpen) onEntered?.();
  }

  function enter() {
    if (disposed || !dialog.open || dialog.dataset.state === 'leaving') return;
    requested = true;
    if (!ready) {
      button.disabled = true;
      button.textContent = 'Opening the city…';
      status.textContent = 'Preparing the city…';
      return;
    }
    dialog.dataset.motion = reducedMotion() ? 'reduced' : 'full';
    dialog.dataset.state = 'leaving';
    document.documentElement.dataset.intro = 'leaving';
    button.disabled = true;
    const finish = () => dismiss({ remember: true, focus: true });
    if (reducedMotion()) finish();
    else timer = window.setTimeout(finish, 850);
  }

  function show({ waitForReady = false } = {}) {
    if (disposed || dialog.open || typeof dialog.showModal !== 'function') return;
    if (waitForReady) ready = false;
    requested = false;
    button.innerHTML = buttonMarkup;
    button.disabled = false;
    status.textContent = ready ? 'Ready when you are.' : 'Preparing the city…';
    dialog.dataset.motion = reducedMotion() ? 'reduced' : 'full';
    dialog.dataset.state = 'welcome';
    document.documentElement.dataset.intro = 'welcome';
    page.inert = true;
    dialog.showModal();
    button.focus({ preventScroll: true });
  }

  const cancel = event => { event.preventDefault(); enter(); };
  button.addEventListener('click', enter);
  dialog.addEventListener('cancel', cancel);
  const externalClose = () => { if (dialog.dataset.state !== 'closed') dismiss(); };
  dialog.addEventListener('close', externalClose);
  if (shouldShowIntro(window.location.hash, storage)) show();
  else dialog.dataset.state = 'closed';

  return {
    get active() { return dialog.open; },
    ready() {
      ready = true;
      if (!dialog.open) return;
      status.textContent = 'Ready when you are.';
      if (requested) enter();
    },
    show, enter, dismiss,
    dispose() {
      if (disposed) return;
      disposed = true;
      dismiss();
      button.removeEventListener('click', enter);
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('close', externalClose);
    },
  };
}
