import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const indexPath = resolve(projectRoot, 'index.html');
const landingCssPath = resolve(projectRoot, 'landing.css');
const landingJsPath = resolve(projectRoot, 'landing.js');
const themePath = resolve(projectRoot, 'src/shared/theme.css');

const failures = [];
const html = readFileSync(indexPath, 'utf8');

for (const file of [landingCssPath, landingJsPath, themePath]) {
  if (!existsSync(file)) failures.push('Missing landing asset: ' + file);
}

for (const reference of ['src/shared/theme.css', 'landing.css', 'landing.js']) {
  if (!html.includes(reference)) failures.push('index.html does not reference ' + reference);
}

if (/<style\b/i.test(html)) failures.push('index.html still contains an inline <style> block');
if (/<script\b(?![^>]*\bsrc=)/i.test(html)) failures.push('index.html still contains an inline <script> block');
if (/\sstyle\s*=/i.test(html)) failures.push('index.html still contains an inline style attribute');
if (/\son[a-z]+\s*=/i.test(html)) failures.push('index.html still contains an inline event handler');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) failures.push('Duplicate IDs: ' + [...new Set(duplicateIds)].join(', '));

const internalLinks = [...html.matchAll(/\bhref=["']#([^"']+)["']/gi)].map((match) => match[1]);
for (const target of internalLinks) {
  if (!ids.includes(target)) failures.push('Missing internal anchor target: #' + target);
}

const externalAnchors = [...html.matchAll(/<a\b[^>]*\bhref=["']https?:\/\/[^"']+["'][^>]*>/gi)]
  .map((match) => match[0]);
for (const anchor of externalAnchors) {
  if (/\btarget=["']_blank["']/i.test(anchor) && !/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(anchor)) {
    failures.push('External _blank link is missing rel="noopener": ' + anchor);
  }
}

const landingJs = readFileSync(landingJsPath, 'utf8');
for (const forbidden of ['chrome.', 'fetch(', 'XMLHttpRequest', 'navigator.sendBeacon']) {
  if (landingJs.includes(forbidden)) failures.push('landing.js must not use ' + forbidden);
}

if (!html.includes('Blocked accounts') || !html.includes('Promoted accounts')
  || !html.includes('Filtered posts') || !html.includes('Hidden posts')
  || !html.includes('Downloaded')) {
  failures.push('Landing preview is missing one or more current popup statistic labels');
}

if (failures.length) {
  console.error('Landing validation failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exitCode = 1;
} else {
  console.log('Landing validation passed.');
}
