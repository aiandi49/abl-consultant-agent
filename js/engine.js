/* Consultant Agent — behavior.
   The conversation lives in sessionStorage. Replies come from /api/chat. Every line that starts
   with "MATCH:" is removed from the visible reply; valid ones fill the three cards, sorted by score.
   Everything shown on screen is placed with textContent. */
(function () {
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var KEY = 'abl-consultant-v1';
  var INTRO = 'Hello, I\u2019m the consultant for Abundance Legacy\u2019s podcast relaunch. Tell me what you want to get done \u2014 a first batch of episodes, the YouTube clean-up, rights, the pilot, or turning viewers into givers \u2014 and I\u2019ll come back with a specific recommendation and a next step for today.';
  var MATCH_LINE = /^\s*(?:[-*\u2022>]\s*)?(?:\*\*|__|`)?\s*MATCH\s*:/i;
  var CIRC = 251.33;
  var GUB = {}, PL = {}, SECTION = { start: 'Start here', youtube: 'YouTube', rights: 'Rights', money: 'Money', plan: 'The plan' };

  var state = load();
  function load() {
    try { var s = JSON.parse(sessionStorage.getItem(KEY)); if (s && Array.isArray(s.thread)) return s; } catch (e) {}
    return { thread: [], matches: [], selected: null };
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ───────── MATCH lines ───────── */
  function splitReply(text) {
    var shown = [], found = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      if (!MATCH_LINE.test(line)) { shown.push(line); return; }
      var a = line.indexOf('{'), b = line.lastIndexOf('}');
      if (a < 0 || b <= a) return;
      try {
        var m = JSON.parse(line.slice(a, b + 1));
        if (!m || typeof m.id !== 'string' || !GUB[m.id]) return;
        var score = Math.round(Number(m.score));
        var details = {};
        if (m.details && typeof m.details === 'object') Object.keys(m.details).slice(0, 6).forEach(function (k) {
          var v = m.details[k]; if (typeof v === 'string' || typeof v === 'number') details[String(k).slice(0, 40)] = String(v).slice(0, 240);
        });
        found.push({ id: m.id, score: isFinite(score) ? Math.max(0, Math.min(100, score)) : 0, why: typeof m.why === 'string' ? m.why.slice(0, 300) : '', details: details });
      } catch (e) { /* malformed line: already removed from view */ }
    });
    var seen = {};
    found = found.filter(function (m) { if (seen[m.id]) return false; seen[m.id] = 1; return true; })
      .sort(function (x, y) { return y.score - x.score; });
    return { body: shown.join('\n').replace(/\s+$/, ''), matches: found };
  }

  /* ───────── light formatting, built node by node ───────── */
  function inline(parent, text) {
    String(text).split(/(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|https:\/\/[^\s<>()"]+[^\s<>()".,;:!?])/).forEach(function (part) {
      if (!part) return;
      if (/^\*\*[^*]+\*\*$/.test(part)) parent.appendChild(el('strong', null, part.slice(2, -2)));
      else if (/^\*[^*]+\*$/.test(part)) parent.appendChild(el('em', null, part.slice(1, -1)));
      else if (/^https:\/\//.test(part)) { var a = el('a', null, part); a.href = part; a.target = '_blank'; a.rel = 'noopener noreferrer'; parent.appendChild(a); }
      else parent.appendChild(document.createTextNode(part));
    });
  }
  function renderText(parent, text) {
    String(text).split(/```[a-zA-Z]*\n?/).forEach(function (chunk, i) {
      if (i % 2 === 1) {
        var d = el('div', 'draft');
        var b = el('button', 'copy', 'Copy'); b.type = 'button'; b.setAttribute('aria-label', 'Copy this draft');
        d.appendChild(b); d.appendChild(el('pre', null, chunk.replace(/\s+$/, '')));
        parent.appendChild(d); return;
      }
      chunk.split(/\n{2,}/).forEach(function (block) {
        block = block.replace(/^\n+|\n+$/g, ''); if (!block.trim()) return;
        var lines = block.split('\n');
        if (lines.every(function (l) { return /^\s*[-*\u2022]\s+/.test(l); })) {
          var ul = el('ul'); lines.forEach(function (l) { var li = el('li'); inline(li, l.replace(/^\s*[-*\u2022]\s+/, '')); ul.appendChild(li); }); parent.appendChild(ul); return;
        }
        if (lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); })) {
          var ol = el('ol'); lines.forEach(function (l) { var li = el('li'); inline(li, l.replace(/^\s*\d+[.)]\s+/, '')); ol.appendChild(li); }); parent.appendChild(ol); return;
        }
        var p = el('p');
        lines.forEach(function (l, j) { if (j) p.appendChild(document.createElement('br')); inline(p, l.replace(/^#+\s*/, '')); });
        parent.appendChild(p);
      });
    });
  }

  /* ───────── chat ───────── */
  var box = $('messages'), input = $('chatInput'), sendBtn = $('sendBtn'), busy = false;
  function bubble(role, text, cls) {
    var d = el('div', 'msg ' + role + (cls ? ' ' + cls : ''));
    if (role === 'user') d.textContent = text; else renderText(d, text);
    box.appendChild(d); box.scrollTop = box.scrollHeight; return d;
  }
  function countLabel() { var n = state.thread.length; $('countLabel').textContent = n ? n + (n === 1 ? ' message' : ' messages') : 'No messages yet'; }
  function renderThread() {
    box.textContent = '';
    bubble('assistant', INTRO);
    state.thread.forEach(function (m) { bubble(m.role, m.role === 'user' ? m.content : (m.shown != null ? m.shown : splitReply(m.content).body)); });
    countLabel(); renderCards();
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.copy'); if (!b) return;
    var text = b.parentNode.querySelector('pre').textContent;
    function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { b.textContent = 'Select and copy'; });
    else b.textContent = 'Select and copy';
  });

  /* ───────── cards ───────── */
  function current() {
    var list = state.matches || [];
    return list.filter(function (m) { return m.id === state.selected; })[0] || list[0] || null;
  }
  function kindLabel(e) { return e.kind === 'episode' ? 'Episode ' + e.n : (SECTION[e.section] || 'Guide'); }
  function renderCards() {
    var m = current(), e = m ? GUB[m.id] : null;
    if (!e) m = null;
    var cover = $('cover'), audio = $('matchAudio'), link = $('matchLink');
    cover.className = 'cover' + (e ? (e.kind === 'episode' ? ' pl-' + e.playlist : ' is-guide') : '');
    $('coverKind').textContent = e ? (e.kind === 'episode' ? (PL[e.playlist] ? PL[e.playlist].name : 'Episode') : 'From the guide') : 'Guide';
    $('coverTitle').textContent = e ? e.title : 'Waiting for your first question';

    var name = $('matchName');
    name.textContent = e ? e.title : 'Waiting for your first question';
    name.classList.toggle('empty', !e);
    $('matchMeta').textContent = !e ? '' : e.kind === 'episode'
      ? 'Episode ' + e.n + ' of 99, published ' + e.date + ', ' + e.duration + (e.guest && e.guest !== 'Hosts only' ? ', with ' + e.guest : '')
      : kindLabel(e) + ' section of the guide';
    $('matchWhy').textContent = m ? (m.why || e.summary) : 'The consultant\u2019s best match appears here, with its audio when it\u2019s a pilot episode.';

    if (e && e.audio && /^https:\/\//.test(e.audio)) {
      if (audio.getAttribute('src') !== e.audio) audio.setAttribute('src', e.audio);
      audio.setAttribute('aria-label', 'Play ' + e.title); audio.hidden = false;
    } else { audio.pause && audio.pause(); audio.removeAttribute('src'); audio.hidden = true; }

    if (e) {
      if (e.kind === 'episode') { link.href = /^https:\/\//.test(e.url) ? e.url : 'guide.html#playlists'; link.textContent = e.urlConfirmed ? 'Listen on Buzzsprout' : 'Open the show on Buzzsprout'; link.target = '_blank'; }
      else { link.href = 'guide.html#about-' + e.id; link.textContent = 'Read it in the guide'; link.removeAttribute('target'); }
      link.hidden = false;
    } else link.hidden = true;

    /* shortlist */
    var top = state.matches && state.matches[0];
    var v = top ? top.score : null;
    $('arc').setAttribute('stroke-dashoffset', String(CIRC * (1 - (v || 0) / 100)));
    $('pct').textContent = v == null ? '\u2014' : v + '%';
    $('donut').setAttribute('aria-label', v == null ? 'Top match fit: not scored yet' : 'Top match fit: ' + v + ' percent, the consultant\u2019s estimate');
    $('shortText').textContent = top ? 'Ranked by fit to your last recommendation. Tap one to see its details.' : 'Matches are ranked by how well they fit your question.';
    var ol = $('shortlist'); ol.textContent = '';
    (state.matches || []).forEach(function (x) {
      var ent = GUB[x.id]; if (!ent) return;
      var li = el('li'), b = el('button', 'pick'); b.type = 'button'; b.setAttribute('data-id', x.id);
      b.setAttribute('aria-pressed', String(m && m.id === x.id));
      b.appendChild(el('span', 'pick-title', ent.title));
      b.appendChild(el('span', 'pick-score', x.score + '%'));
      b.appendChild(el('span', 'pick-kind', kindLabel(ent)));
      li.appendChild(b); ol.appendChild(li);
    });
    if (!ol.childNodes.length) { var empty = el('li', 'empty-li', 'No matches yet.'); ol.appendChild(empty); }

    /* details */
    $('detailKind').textContent = e ? kindLabel(e) : '\u2014';
    $('detailTitle').textContent = e ? e.title : 'Nothing selected yet';
    $('detailSum').textContent = e ? e.summary : 'Ask the consultant a question. The details of whichever match you pick land here.';
    var facts = $('facts'); facts.textContent = '';
    if (e) {
      var merged = {}, k;
      for (k in (e.details || {})) merged[k] = e.details[k];
      for (k in (m.details || {})) if (k.toLowerCase() !== 'next step') merged[k] = m.details[k];
      Object.keys(merged).slice(0, 9).forEach(function (key) {
        var row = el('div'); row.appendChild(el('dt', null, key)); row.appendChild(el('dd', null, merged[key])); facts.appendChild(row);
      });
    }
    var next = m && m.details ? (m.details['Next step'] || m.details['Next Step'] || m.details['next step']) : null;
    $('nextText').textContent = next || (e ? 'Ask the consultant for the next step on this one.' : 'Tell the consultant what you want to get done.');
  }
  $('shortlist').addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.pick'); if (!b) return;
    state.selected = b.getAttribute('data-id'); save(); renderCards();
  });

  /* ───────── sending ───────── */
  function chip(mode) { var c = $('countChip'); c.classList.remove('live', 'error'); if (mode) c.classList.add(mode); }
  function grow() {
    input.style.height = 'auto';
    var need = input.scrollHeight + (input.offsetHeight - input.clientHeight);
    input.style.height = Math.min(need, 160) + 'px';
    input.style.overflowY = need > 160 ? 'auto' : 'hidden';
  }
  function send() {
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true;
    state.thread.push({ role: 'user', content: text.slice(0, 4000) }); save();
    bubble('user', text); input.value = ''; grow(); countLabel();
    var wait = el('div', 'msg assistant thinking'); wait.appendChild(el('span', 'spin')); wait.appendChild(el('span', null, 'Reading the guide\u2026'));
    box.appendChild(wait); box.scrollTop = box.scrollHeight;
    var payload = state.thread.slice(-30).map(function (m) { return { role: m.role, content: m.content }; });
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: payload }) })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = JSON.parse(t); } catch (e) {}
          if (!r.ok || !j || typeof j.text !== 'string') throw new Error(j && typeof j.error === 'string' ? j.error : 'The consultant could not answer (status ' + r.status + ').');
          return j.text;
        });
      })
      .then(function (reply) {
        wait.remove();
        var p = splitReply(reply);
        state.thread.push({ role: 'assistant', content: reply, shown: p.body });
        if (p.matches.length) { state.matches = p.matches; state.selected = p.matches[0].id; }
        save(); chip('live');
        bubble('assistant', p.body || 'Here\u2019s what fits best \u2014 see the cards.'); countLabel(); renderCards();
      })
      .catch(function (err) {
        wait.remove(); state.thread.pop(); save(); countLabel();
        input.value = text; grow(); chip('error');
        bubble('assistant', location.protocol === 'file:'
          ? 'The consultant needs this site\u2019s server to answer, and a page opened straight from a computer doesn\u2019t have one. Once the project is deployed on Vercel with its key set, it works. Your message is back in the box.'
          : String(err && err.message || 'The consultant could not answer.') + ' Your message is back in the box \u2014 press Send to try again.', 'error');
      })
      .then(function () { busy = false; sendBtn.disabled = false; });
  }
  /* full-page reading view for the chat */
  var chatCard = document.querySelector('.chat'), expandBtn = $('expandBtn');
  function setExpanded(on) {
    chatCard.classList.toggle('expanded', on);
    document.documentElement.classList.toggle('chat-open', on);
    expandBtn.setAttribute('aria-pressed', String(on));
    expandBtn.setAttribute('aria-label', on ? 'Close full page chat' : 'Open the chat full page');
    expandBtn.title = on ? 'Close full page' : 'Open the chat full page';
    expandBtn.querySelector('.expand-label').textContent = on ? 'Close' : 'Full page';
    box.scrollTop = box.scrollHeight;
    input.focus({ preventScroll: true });
  }
  expandBtn.addEventListener('click', function () { setExpanded(!chatCard.classList.contains('expanded')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && chatCard.classList.contains('expanded')) setExpanded(false); });

  input.addEventListener('input', grow);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  sendBtn.addEventListener('click', send);
  $('resetBtn').addEventListener('click', function () { if (busy) return; state = { thread: [], matches: [], selected: null }; save(); chip(null); renderThread(); });

  /* the cards read titles, audio and facts from the same file the server reads */
  fetch('data/gub.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (d) {
      d.entries.forEach(function (e) { GUB[e.id] = e; });
      d.meta.playlists.forEach(function (p) { PL[p.key] = p; });
      state.matches = (state.matches || []).filter(function (m) { return GUB[m.id]; });
      renderThread();
    })
    .catch(function () { renderThread(); });
  renderThread();

  window.ABL_CONSULTANT = { splitReply: splitReply };
})();
