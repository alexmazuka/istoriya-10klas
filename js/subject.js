/* Предмети: перелік і всі уроки предмета */
(async function () {
  const root = document.getElementById('app');
  try { await H.init(); } catch (e) { root.innerHTML = '<div class="card">Помилка: ' + H.esc(e.message) + '</div>'; return; }
  document.getElementById('hdr').innerHTML = H.header('subject'); document.getElementById('ftr').innerHTML = H.footer();
  H.requireCode(() => {
  const sid = H.qs('s');
  if (!sid || !H.state.subjMap[sid]) {
    root.innerHTML = `<div class="card"><h1>Предмети</h1><p class="muted">${H.esc(H.state.program)}. Навантаження — 25 годин на тиждень.</p></div><div class="grid c2">${H.state.subjects.map(sub => { const S = H.summary(l => l.subject === sub.id); return `<a class="card" href="subject.html?s=${sub.id}" style="margin:0;color:inherit;display:block"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1.1rem">${sub.icon} ${H.esc(sub.name)}</b><span class="chip">${sub.hours} год/тиж</span></div><div class="bar" style="margin:10px 0 6px"><i style="width:${S.pct}%;background:${sub.color}"></i></div><small class="muted">${S.done} з ${S.total} уроків${S.avg != null ? ' · середній бал ' + S.avg + '%' : ''} · ${H.esc(sub.textbook)}</small></a>`; }).join('')}</div>`;
    return;
  }
  const sub = H.state.subjMap[sid]; const ls = H.state.bySubject[sid]; const S = H.summary(l => l.subject === sid);
  const sections = []; ls.forEach(l => { let s = sections[sections.length - 1]; if (!s || s.name !== l.section) { s = { name: l.section, items: [] }; sections.push(s); } s.items.push(l); });
  document.title = sub.name + ' — Уроки історії';
  root.innerHTML = `<div class="card"><div class="hero"><div class="ring" style="--p:${S.pct};background:conic-gradient(${sub.color} calc(var(--p)*1%),#e5e7eb 0)"><span>${S.pct}%</span></div><div><h1 style="margin:0">${sub.icon} ${H.esc(sub.name)}</h1><small class="muted">${sub.hours} год/тиждень · ${ls.length} уроків у семестрі · виконано ${S.done}${S.avg != null ? ' · середній бал ' + S.avg + '%' : ''} · ${H.esc(sub.textbook)}</small></div></div></div>
    ${sections.map(sec => { const d = sec.items.filter(l => H.statusOf(l.id) === 'done').length; return `<div class="card"><h2 style="margin-top:0">${H.esc(sec.name)} <small class="muted">${d}/${sec.items.length}</small></h2>${sec.items.map(l => H.lessonRow(l, { date: true })).join('')}</div>`; }).join('')}`;
  });
})();
