/*
 * Client-side search for hugo-theme-retrocss.
 *
 * The index is a page resource emitted by layouts/search.html, so there is no
 * build step and no library to load. Scoring is deliberately plain: a title hit
 * outranks a tag hit, which outranks a body hit, and every term has to appear
 * somewhere for a page to qualify.
 */
(function () {
  'use strict';

  var form = document.querySelector('[data-search-index]');
  var input = document.getElementById('search-input');
  var status = document.getElementById('search-status');
  var results = document.getElementById('search-results');
  if (!form || !input || !results || !status) return;

  var WEIGHTS = { title: 8, tags: 4, summary: 2, body: 1 };
  var index = null;

  function load() {
    if (index) return Promise.resolve(index);
    return fetch(form.getAttribute('data-search-index'))
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.json();
      })
      .then(function (data) {
        index = data;
        return index;
      });
  }

  function score(page, terms) {
    var haystacks = {
      title: (page.title || '').toLowerCase(),
      tags: (page.tags || []).join(' ').toLowerCase(),
      summary: (page.summary || '').toLowerCase(),
      body: (page.body || '').toLowerCase(),
    };
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var hit = 0;
      for (var field in WEIGHTS) {
        if (haystacks[field].indexOf(term) !== -1) hit += WEIGHTS[field];
      }
      // Every term must land somewhere, so "retro tokens" cannot match a page
      // that only mentions tokens.
      if (hit === 0) return 0;
      total += hit;
    }
    return total;
  }

  /** Text around the first hit, with the term marked. Escaped, never innerHTML'd raw. */
  function excerpt(page, term) {
    var body = page.summary || page.body || '';
    var at = body.toLowerCase().indexOf(term);
    if (at === -1) return body.slice(0, 160);
    var start = Math.max(0, at - 60);
    return (start > 0 ? '…' : '') + body.slice(start, start + 180) + (body.length > start + 180 ? '…' : '');
  }

  function render(matches, query) {
    results.textContent = '';
    if (!matches.length) {
      status.textContent = form.getAttribute('data-no-results') || 'No pages match that search.';
      return;
    }
    status.textContent = matches.length + ' ' + (form.getAttribute('data-results-label') || 'results');

    var list = document.createElement('div');
    matches.forEach(function (page) {
      var card = document.createElement('article');
      card.className = 'retro-card search-result';

      var content = document.createElement('div');
      content.className = 'retro-card-content';

      var heading = document.createElement('h2');
      var link = document.createElement('a');
      link.href = page.url;
      link.textContent = page.title;
      heading.appendChild(link);
      content.appendChild(heading);

      if (page.date) {
        var meta = document.createElement('div');
        meta.className = 'post-meta';
        var time = document.createElement('time');
        time.dateTime = page.date;
        time.textContent = page.date;
        meta.appendChild(time);
        content.appendChild(meta);
      }

      var p = document.createElement('p');
      // textContent, not innerHTML: the index carries page copy, and a post
      // that quotes markup would otherwise inject it into this page.
      p.textContent = excerpt(page, query.split(/\s+/)[0]);
      content.appendChild(p);

      (page.tags || []).slice(0, 4).forEach(function (tag) {
        var badge = document.createElement('span');
        badge.className = 'retro-badge';
        badge.textContent = tag;
        content.appendChild(badge);
        content.appendChild(document.createTextNode(' '));
      });

      card.appendChild(content);
      list.appendChild(card);
    });
    results.appendChild(list);
  }

  function run(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      results.textContent = '';
      status.textContent = form.getAttribute('data-prompt') || 'Type to search.';
      return;
    }
    load()
      .then(function (pages) {
        var terms = q.split(/\s+/);
        var matches = pages
          .map(function (page) { return { page: page, score: score(page, terms) }; })
          .filter(function (m) { return m.score > 0; })
          .sort(function (a, b) { return b.score - a.score; })
          .map(function (m) { return m.page; });
        render(matches, q);
      })
      .catch(function (err) {
        status.textContent = 'Search is unavailable (' + err.message + ').';
      });
  }

  var debounce;
  input.addEventListener('input', function () {
    clearTimeout(debounce);
    var value = input.value;
    debounce = setTimeout(function () {
      run(value);
      // Keeps the address bar shareable without adding a history entry per
      // keystroke.
      var url = new URL(window.location.href);
      if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
      window.history.replaceState(null, '', url);
    }, 150);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    run(input.value);
  });

  // Deep link: /search/?q=tokens
  var initial = new URLSearchParams(window.location.search).get('q');
  if (initial) {
    input.value = initial;
    run(initial);
  }
})();
