// Small source editor for pinned Rules artifacts, not a general Rules parser.
export function blockEnd(text, open) {
  let depth = 0, quote = '', line = false, comment = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (comment) { if (c === '*' && next === '/') { comment = false; i++; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '/' && next === '/') { line = true; i++; continue; }
    if (c === '/' && next === '*') { comment = true; i++; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return i + 1;
  }
  throw Error('RULES_UNCLOSED_PINNED_BLOCK');
}
export function replaceRootFunction(text, name, replacement) {
  const matches = [...text.matchAll(new RegExp('^    function ' + name + '\\([^)]*\\)\\s*\\{', 'gm'))];
  if (matches.length !== 1) throw Error('RULES_ROOT_FUNCTION_SURFACE_CHANGED_' + name);
  const start = matches[0].index, open = start + matches[0][0].lastIndexOf('{');
  return text.slice(0, start) + replacement + text.slice(blockEnd(text, open));
}
export function retainRootMatches(text, allowed) {
  const blocks = [...text.matchAll(/^    match (\/[^\n]*?)\s+\{/gm)].map(m => ({ path: m[1], start: m.index, end: blockEnd(text, m.index + m[0].lastIndexOf('{')) }));
  for (const block of blocks.reverse()) if (!allowed.has(block.path)) text = text.slice(0, block.start) + text.slice(block.end);
  for (const path of allowed) if (!blocks.some(block => block.path === path)) throw Error('RULES_APPROVED_MATCH_MISSING');
  return text;
}
