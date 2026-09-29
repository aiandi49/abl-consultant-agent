/* The guide page. Every word below the hero comes from data/gub.json and is placed with
   textContent, so the data file can be edited without touching this script. */
(function () {
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function safeUrl(u) { return /^https:\/\//.test(String(u || '')) ? u : null; }

  var DATA, PL = {}, filter = 'all';

  fetch('data/gub.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (d) { DATA = d; d.meta.playlists.forEach(function (p) { PL[p.key] = p; }); render(); })
    .catch(function () {
      var n = $('loadNote');
      n.hidden = false;
      n.textContent = location.protocol === 'file:'
        ? 'This guide reads its content from data/gub.json, which browsers block on pages opened straight from a computer. Open it from the deployed site, or run a local server in this folder.'
        : 'The guide content did not load. Refresh the page to try again.';
    });

  function episodes() { return DATA.entries.filter(function (e) { return e.kind === 'episode'; }); }
  function guide(id) { return DATA.entries.find(function (e) { return e.id === id; }); }

  function render() {
    shelf(); legend(); articles(); bars(); playlistCards(); chips(); rows(); pilot();
  }

  /* hero shelf: one tile per published episode */
  function shelf() {
    var box = $('shelf');
    episodes().forEach(function (e) {
      var t = el('a', 'tile pl-' + e.playlist + (e.repeatOf ? ' repeat' : '') + (e.audio ? ' pilot' : ''));
      t.href = '#ep-' + e.n;
      t.setAttribute('role', 'listitem');
      t.setAttribute('aria-label', '#' + e.n + ' ' + e.title + ', ' + PL[e.playlist].name + (e.repeatOf ? ', repeat' : ''));
      t.title = '#' + e.n + ' · ' + e.title;
      t.addEventListener('click', function (ev) {
        ev.preventDefault();
        filter = 'all'; $('search').value = ''; $('hideRepeats').checked = false; chips(); rows();
        var row = $('ep-' + e.n);
        if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('flash'); setTimeout(function () { row.classList.remove('flash'); }, 1800); row.focus({ preventScroll: true }); }
      });
      box.appendChild(t);
    });
  }
  function legend() {
    var ul = $('legend');
    DATA.meta.playlists.forEach(function (p) {
      var li = el('li'); li.appendChild(el('span', 'swatch pl-' + p.key)); li.appendChild(document.createTextNode(p.name)); ul.appendChild(li);
    });
    var r = el('li'); r.appendChild(el('span', 'swatch repeat-swatch')); r.appendChild(document.createTextNode('Repeat')); ul.appendChild(r);
  }

  /* body text: blank-line paragraphs; a run of "1. " lines becomes a numbered list */
  function bodyInto(parent, text) {
    String(text).split(/\n{2,}/).forEach(function (block) {
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^\d+\.\s/.test(l); })) {
        var ol = el('ol', 'steps');
        lines.forEach(function (l) { ol.appendChild(el('li', null, l.replace(/^\d+\.\s/, ''))); });
        parent.appendChild(ol);
      } else parent.appendChild(el('p', null, block));
    });
  }
  function factsInto(parent, details) {
    var keys = Object.keys(details || {}); if (!keys.length) return;
    var dl = el('dl', 'facts');
    keys.forEach(function (k) { var row = el('div'); row.appendChild(el('dt', null, k)); row.appendChild(el('dd', null, details[k])); dl.appendChild(row); });
    parent.appendChild(dl);
  }
  function article(e) {
    var a = el('article', 'article'); a.id = 'about-' + e.id;
    a.appendChild(el('h3', null, e.title));
    a.appendChild(el('p', 'dek', e.summary));
    var body = el('div', 'body'); bodyInto(body, e.body); a.appendChild(body);
    factsInto(a, e.details);
    var src = safeUrl(e.source);
    if (src) { var p = el('p', 'source'); var l = el('a', null, 'Source: ' + new URL(src).hostname.replace(/^www\./, '')); l.href = src; l.rel = 'noopener noreferrer'; l.target = '_blank'; p.appendChild(l); a.appendChild(p); }
    return a;
  }
  function articles() {
    document.querySelectorAll('.articles').forEach(function (box) {
      var sec = box.getAttribute('data-section'), ids = box.getAttribute('data-ids'), skip = (box.getAttribute('data-skip') || '').split(',');
      var list = ids ? ids.split(',').map(guide) : DATA.entries.filter(function (e) { return e.kind === 'guide' && e.section === sec && skip.indexOf(e.id) < 0; });
      list.filter(Boolean).forEach(function (e) { box.appendChild(article(e)); });
    });
    var bx = $('bars'), wrap = el('div', 'articles');
    [guide('catalog'), guide('listeners')].forEach(function (e) { if (e) wrap.appendChild(article(e)); });
    bx.parentNode.insertBefore(wrap, bx);
  }

  /* downloads per episode by theme */
  function bars() {
    var rows = DATA.meta.downloads.map(function (d) { return { t: d.theme, per: d.downloads / d.episodes, d: d }; });
    var max = Math.max.apply(null, rows.map(function (r) { return r.per; }));
    var box = $('bars');
    rows.forEach(function (r) {
      var row = el('div', 'bar');
      row.appendChild(el('span', 'bar-label', r.t));
      var track = el('span', 'bar-track'); var fill = el('span', 'bar-fill'); fill.style.width = (r.per / max * 100).toFixed(1) + '%'; track.appendChild(fill); row.appendChild(track);
      row.appendChild(el('span', 'bar-value', Math.round(r.per) + ' per episode (' + r.d.downloads + ' over ' + r.d.episodes + ')'));
      box.appendChild(row);
    });
  }

  function playlistCards() {
    var box = $('playlistCards');
    DATA.meta.playlists.forEach(function (p) {
      var b = el('button', 'pl-card pl-' + p.key); b.type = 'button';
      b.appendChild(el('span', 'pl-count', String(p.count)));
      b.appendChild(el('span', 'pl-name', p.name));
      b.appendChild(el('span', 'pl-about', p.about));
      b.addEventListener('click', function () { filter = p.key; chips(); rows(); $('count').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      box.appendChild(b);
    });
  }
  function chips() {
    var box = $('chips'); box.textContent = '';
    [{ key: 'all', name: 'All' }].concat(DATA.meta.playlists).forEach(function (p) {
      var b = el('button', 'chip' + (p.key !== 'all' ? ' pl-' + p.key : ''), p.name); b.type = 'button';
      b.setAttribute('aria-pressed', String(filter === p.key));
      b.addEventListener('click', function () { filter = p.key; chips(); rows(); });
      box.appendChild(b);
    });
  }
  function rows() {
    var q = $('search').value.trim().toLowerCase(), hide = $('hideRepeats').checked, body = $('rows');
    body.textContent = '';
    var list = episodes().filter(function (e) {
      if (hide && e.repeatOf) return false;
      if (filter !== 'all' && e.playlist !== filter) return false;
      return !q || (e.title + ' ' + e.guest + ' ' + e.summary).toLowerCase().indexOf(q) > -1;
    });
    list.forEach(function (e) {
      var tr = el('tr'); tr.id = 'ep-' + e.n; tr.tabIndex = -1; if (e.repeatOf) tr.className = 'is-repeat';
      function td(label, cls) { var c = el('td', cls); c.setAttribute('data-label', label); tr.appendChild(c); return c; }
      td('#', 'num').textContent = e.n;
      var t = td('Episode', 'ep');
      var link = el('a', null, e.title); link.href = safeUrl(e.url) || DATA.meta.showUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
      t.appendChild(link); t.appendChild(el('span', 'ep-sum', e.summary));
      if (e.guest && e.guest !== 'Hosts only') t.appendChild(el('span', 'ep-guest', 'With ' + e.guest));
      td('Published', 'date').textContent = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      td('Length', 'len').textContent = e.duration;
      var pl = td('Playlist', 'pl'); pl.appendChild(el('span', 'badge pl-' + e.playlist, PL[e.playlist].name));
      var notes = td('Notes', 'notes');
      if (e.repeatOf) notes.appendChild(el('span', 'warn', e.details.Repeat));
      if (e.audio) notes.appendChild(el('span', 'pilot-tag', 'Pilot episode'));
      if (!e.urlConfirmed) notes.appendChild(el('span', 'muted', 'Links to the show page'));
      if (!notes.childNodes.length) notes.appendChild(el('span', 'muted', '—'));
      body.appendChild(tr);
    });
    $('count').textContent = list.length + (list.length === 1 ? ' episode' : ' episodes') + ' shown' + (hide ? ', repeats hidden' : '');
  }
  document.addEventListener('input', function (e) { if (e.target.id === 'search' && DATA) rows(); });
  document.addEventListener('change', function (e) { if (e.target.id === 'hideRepeats' && DATA) rows(); });

  function pilot() {
    var box = $('pilotCards');
    episodes().filter(function (e) { return e.audio; }).forEach(function (e) {
      var c = el('article', 'pilot-card pl-' + e.playlist);
      c.appendChild(el('span', 'badge pl-' + e.playlist, PL[e.playlist].name));
      c.appendChild(el('h3', null, e.title));
      c.appendChild(el('p', 'meta', 'Episode #' + e.n + ', ' + e.duration + (e.guest !== 'Hosts only' ? ', with ' + e.guest : '')));
      c.appendChild(el('p', null, e.summary));
      var src = safeUrl(e.audio);
      if (src) { var au = el('audio'); au.controls = true; au.preload = 'none'; au.src = src; au.setAttribute('aria-label', 'Play ' + e.title); c.appendChild(au); }
      box.appendChild(c);
    });
  }
})();
