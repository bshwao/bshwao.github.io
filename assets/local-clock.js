const pad = value => String(value).padStart(2, '0');

/** Device-local wall time, with fixed UTC-05:00 when local date fields fail. */
export function readLocalClock(date = new Date()) {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('A valid clock timestamp is required');
  let hours, minutes, seconds, source = 'local';
  try {
    hours = date.getHours(); minutes = date.getMinutes(); seconds = date.getSeconds();
    if (![hours, minutes, seconds, date.getTimezoneOffset()].every(Number.isFinite)
        || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59)
      throw new TypeError('Local time is unavailable');
  } catch {
    const eastern = new Date(timestamp - 5 * 60 * 60 * 1000);
    hours = eastern.getUTCHours(); minutes = eastern.getUTCMinutes(); seconds = eastern.getUTCSeconds();
    source = 'est';
  }
  const text = `${pad(hours % 12 || 12)}:${pad(minutes)}:${pad(seconds)} ${hours >= 12 ? 'PM' : 'AM'}${source === 'est' ? ' EST' : ''}`;
  return { text, source, dateTime: new Date(timestamp).toISOString(),
    title: source === 'est' ? 'Eastern Standard Time (UTC−05:00)' : 'Current time on your device' };
}

/** A DOM-only clock: no scene renders, animation loop or work in hidden tabs. */
export function createLocalClock(element, {
  now = () => new Date(), schedule = setTimeout, cancel = clearTimeout,
  document: ownerDocument = element.ownerDocument,
} = {}) {
  let timer = null, disposed = false;
  function refresh() {
    if (timer !== null) { cancel(timer); timer = null; }
    if (disposed || ownerDocument.hidden) return;
    const date = now(), state = readLocalClock(date);
    if (element.textContent !== state.text) element.textContent = state.text;
    element.dateTime = state.dateTime;
    element.title = state.title;
    element.dataset.source = state.source;
    timer = schedule(refresh, 1010 - date.getTime() % 1000);
  }
  ownerDocument.addEventListener('visibilitychange', refresh);
  refresh();
  return { refresh, dispose() {
    disposed = true;
    if (timer !== null) cancel(timer);
    timer = null;
    ownerDocument.removeEventListener('visibilitychange', refresh);
  } };
}
