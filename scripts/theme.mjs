import { readFile, writeFile } from 'node:fs/promises';
import { themeCSS, palette } from '../assets/color-theme.js';
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${palette.paper}"/><path d="M32 2 35 17 41 19 43 34 50 36 55 59H32Z" fill="${palette.teal}"/><g fill="none" stroke="${palette.ink}" stroke-width="1.1"><path d="m10 59 4-27 7-2 2-13 6-2 3-13 3 15 6 2 2 15 7 2 5 23ZM32 2v57M14 33l36 3M13 40l38 3M12 47l41 3M11 54l43 3M23 18l18 2M22 24l20 2M21 30l22 2M22 30l-3 29M29 15l-2 44M35 17l2 42M41 33l5 26"/></g></svg>\n`;
for (const [file, generated] of [['theme.css', themeCSS()], ['favicon.svg', favicon]]) {
  const target = new URL(`../assets/${file}`, import.meta.url);
  if (process.argv.includes('--check')) {
    const current = await readFile(target, 'utf8');
    if (current.replaceAll('\r\n', '\n') !== generated) throw new Error('Run npm run theme to regenerate the color tokens and icon');
  } else await writeFile(target, generated);
}
console.log(process.argv.includes('--check') ? 'Shared color tokens and icon match the authoritative palette.' : 'Generated color tokens and icon.');
