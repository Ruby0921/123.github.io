// Add Taiwanese Zhuyin above Chinese text throughout the existing math site.
(async function () {
  const SOURCE = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.26.0/dist/index.mjs';
  let pinyin;
  try {
    ({ pinyin } = await import(SOURCE));
  } catch (e) {
    console.warn('Zhuyin helper could not load pronunciation data:', e);
    return;
  }

  const initialMap = {
    zh:'ㄓ', ch:'ㄔ', sh:'ㄕ', b:'ㄅ', p:'ㄆ', m:'ㄇ', f:'ㄈ',
    d:'ㄉ', t:'ㄊ', n:'ㄋ', l:'ㄌ', g:'ㄍ', k:'ㄎ', h:'ㄏ',
    j:'ㄐ', q:'ㄑ', x:'ㄒ', r:'ㄖ', z:'ㄗ', c:'ㄘ', s:'ㄙ'
  };
  const finalMap = {
    a:'ㄚ', o:'ㄛ', e:'ㄜ', ai:'ㄞ', ei:'ㄟ', ao:'ㄠ', ou:'ㄡ',
    an:'ㄢ', en:'ㄣ', ang:'ㄤ', eng:'ㄥ', er:'ㄦ',
    i:'ㄧ', ia:'ㄧㄚ', ie:'ㄧㄝ', iao:'ㄧㄠ', iu:'ㄧㄡ',
    ian:'ㄧㄢ', in:'ㄧㄣ', iang:'ㄧㄤ', ing:'ㄧㄥ', iong:'ㄩㄥ',
    u:'ㄨ', ua:'ㄨㄚ', uo:'ㄨㄛ', uai:'ㄨㄞ', ui:'ㄨㄟ',
    uan:'ㄨㄢ', un:'ㄨㄣ', uang:'ㄨㄤ', ong:'ㄨㄥ',
    ü:'ㄩ', üe:'ㄩㄝ', üan:'ㄩㄢ', ün:'ㄩㄣ'
  };
  const yMap = { yi:'ㄧ', ya:'ㄧㄚ', ye:'ㄧㄝ', yao:'ㄧㄠ', you:'ㄧㄡ',
    yan:'ㄧㄢ', yin:'ㄧㄣ', yang:'ㄧㄤ', ying:'ㄧㄥ', yong:'ㄩㄥ',
    yu:'ㄩ', yue:'ㄩㄝ', yuan:'ㄩㄢ', yun:'ㄩㄣ' };
  const wMap = { wu:'ㄨ', wa:'ㄨㄚ', wo:'ㄨㄛ', wai:'ㄨㄞ', wei:'ㄨㄟ',
    wan:'ㄨㄢ', wen:'ㄨㄣ', wang:'ㄨㄤ', weng:'ㄨㄥ' };
  function syllableToZhuyin(raw) {
    let s = String(raw || '').toLowerCase().replace(/u:/g, 'ü');
    const toneMatch = s.match(/[1-5]$/);
    const tone = toneMatch ? Number(toneMatch[0]) : 5;
    if (toneMatch) s = s.slice(0, -1);
    if (s === 'ê') return 'ㄝ' + toneMark(tone);
    let body = '';
    if (yMap[s]) body = yMap[s];
    else if (wMap[s]) body = wMap[s];
    else {
      let initial = '';
      for (const candidate of Object.keys(initialMap).sort((a,b)=>b.length-a.length)) {
        if (s.startsWith(candidate)) { initial = candidate; break; }
      }
      let final = s.slice(initial.length);
      if (['j','q','x'].includes(initial) && final.startsWith('u')) final = 'ü' + final.slice(1);
      if (['zh','ch','sh','r','z','c','s'].includes(initial) && final === 'i') final = '';
      if (final === 'iou') final = 'iu';
      if (final === 'uei') final = 'ui';
      if (final === 'uen') final = 'un';
      body = (initialMap[initial] || '') + (finalMap[final] || '');
      if (!body) return '';
    }
    return toneMark(tone) + body;
  }
  function toneMark(tone) {
    return tone === 2 ? 'ˊ' : tone === 3 ? 'ˇ' : tone === 4 ? 'ˋ' : tone === 5 ? '˙' : '';
  }
  function isHan(ch) { return /[\u3400-\u9fff]/.test(ch); }

  function annotateTextNode(node) {
    const text = node.nodeValue;
    if (!text || !isHan(text[0]) && !Array.from(text).some(isHan)) return;
    const chars = Array.from(text);
    const readings = pinyin(text, { type: 'array', toneType: 'num', v: 'ü' });
    if (!Array.isArray(readings)) return;
    const frag = document.createDocumentFragment();
    let changed = false;
    chars.forEach((ch, i) => {
      if (!isHan(ch)) {
        frag.append(document.createTextNode(ch));
        return;
      }
      const zh = syllableToZhuyin(readings[i]);
      if (!zh) {
        frag.append(document.createTextNode(ch));
        return;
      }
      changed = true;
      const ruby = document.createElement('ruby');
      ruby.className = 'site-zhuyin';
      ruby.append(document.createTextNode(ch));
      const rt = document.createElement('rt');
      rt.textContent = zh;
      ruby.append(rt);
      frag.append(ruby);
    });
    if (changed && node.parentNode) node.parentNode.replaceChild(frag, node);
  }

  function scan(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || !node.nodeValue.trim() ||
          p.closest('script,style,noscript,textarea,input,select,option,rt,ruby,[contenteditable="true"]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(annotateTextNode);
  }

  const style = document.createElement('style');
  style.textContent = '.site-zhuyin{ruby-position:over;-webkit-ruby-position:over;ruby-align:center}.site-zhuyin rt{font-family:Arial,"Noto Sans TC",sans-serif;font-size:.48em;line-height:1;color:#52657a;font-weight:400;letter-spacing:0}';
  document.head.appendChild(style);
  scan(document.body);
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) annotateTextNode(node);
        else if (node.nodeType === Node.ELEMENT_NODE && !node.closest('ruby')) scan(node);
      }
    }
    observer.observe(document.body, { childList:true, subtree:true });
  });
  observer.observe(document.body, { childList:true, subtree:true });
})();