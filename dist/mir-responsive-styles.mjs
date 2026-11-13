// Adapt MIR's own styles to a live same-document viewport. No Atelier CSS is copied.
const rootSelector = selector => selector
  .replace(/:root\b/g, ':scope')
  .replace(/(^|[\s>+~,(])(?:html|body)(?=[.#:[\s>+~),]|$)/g, '$1:scope')
  .replace(/(:scope(?:\[[^\]]*\])*)\s+(?:>\s*)?:scope/g, '$1')
  .replace(/:scope\s+(?:>\s*)?:scope/g, ':scope');
const units = text => text.replace(/(\d*\.?\d+)(?:d|s|l)?vw\b/g, '$1cqw').replace(/(\d*\.?\d+)(?:d|s|l)?vh\b/g, '$1cqh');
function rulesText(rules, base) {
  return [...rules].map(rule => {
    if (rule.type === 3) return rulesText(rule.styleSheet.cssRules, rule.href);
    if (rule.type === 1) return `${rootSelector(rule.selectorText)}{${units(rule.style.cssText)}}`;
    if (rule.type === 4) {
      const body=rulesText(rule.cssRules,base);
      return rule.conditionText.split(',').map(branch=>{
        const terms=branch.trim().split(/\s+and\s+/i),size=[],environment=[];
        for(const term of terms)(/^\((?:(?:min|max)-)?(?:width|height|orientation|aspect-ratio)\s*[:<=>]/i.test(term)?size:environment).push(term);
        let content=size.length?`@container mir-page ${size.join(' and ')}{${body}}`:body;
        if(environment.length)content=`@media ${environment.join(' and ')}{${content}}`;
        return content;
      }).join('\n');
    }
    if (rule.cssRules && rule.type !== 7 && rule.type !== 8) {
      return rule.cssText.slice(0,rule.cssText.indexOf('{')+1)+rulesText(rule.cssRules,base)+'}';
    }
    return rule.cssText;
  }).join('\n').replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (match, quote, url) => `url("${new URL(url, base).href}")`);
}
export function isolatePageStyles(doc=document) {
  const sheets = [...doc.styleSheets];
  const text = sheets.map(sheet => rulesText(sheet.cssRules, sheet.href || doc.baseURI)).join('\n');
  const style = doc.createElement('style');
  style.dataset.mirResponsiveStyles = 'true';
  style.textContent = `@scope ([data-mir-responsive-page]) {${text}}`;
  doc.head.append(style);
  for (const sheet of sheets) sheet.disabled = true;
  return () => { style.remove(); for (const sheet of sheets) sheet.disabled = false; };
}
