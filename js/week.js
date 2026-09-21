/* Розклад тижня */
(async function () {
  const root = document.getElementById('app');
  try { await H.init(); } catch (e) { root.innerHTML = '<div class="card">Помилка: ' + H.esc(e.message) + '</div>'; return; }
  document.getElementById('hdr').innerHTML = H.header('week'); document.getElementById('ftr').innerHTML = H.footer();
  H.requireCode(() => {
  const weeks = H.state.cal.weeks; let w = Number(H.qs('w')) || H.currentWeek(); if (!weeks.find(x => x.week === w)) w = 1;
  function render() {
    const wi = H.weekInfo(w); const S = H.summary(l => l.week === w); const q = H.quarterOf(w); const todayIso = H.isoDate(H.today());
    const nav = weeks.map(x => { const s = H.summary(l => l.week === x.week); return `<a href="week.html?w=${x.week}" class="chip ${x.week === w ? 'ok' : ''}" title="${s.done}/${s.total}" style="${s.pct === 100 ? 'background:var(--okbg);color:var(--ok)' : ''}${x.week === w ? ';outline:2px solid var(--accent)' : ''}">${x.week}</a>`; }).join(' ');
    const first = H.dateOf(w, wi.days[0]), last = H.dateOf(w, wi.days[wi.days.length - 1]);
    const cols = wi.days.map(d => { const date = H.dateOf(w, d); const iso = H.isoDate(date); const ls = H.lessonsOn(w, d); const isToday = iso === todayIso; const past = iso < todayIso; const done = ls.filter(l => H.statusOf(l.id) === 'done').length;
      return `<div class="card day-col" style="margin:0;${isToday ? 'outline:3px solid var(--accent2)' : ''}"><h3>${H.DAYS[d]} <small class="muted">${H.fmt(date, { day: 'numeric', month: 'short' })}</small>${isToday ? ' <span class="chip warn">сьогодні</span>' : ''}</h3><small class="muted">${done}/${ls.length} виконано${past && done < ls.length ? ' · <span class="pill-bad">є борги</span>' : ''}</small>${ls.map(l => H.lessonRow(l)).join('')}</div>`; }).join('');
    const between = weeks.find(x => x.week === w + 1) && H.state.cal.holidays.find(h => h.from > H.isoDate(last) && h.from < weeks.find(x => x.week === w + 1).monday);
    root.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><h1 style="margin:0">Тиждень ${w}</h1><small class="muted">${H.fmt(first)} – ${H.fmt(last)} · ${q.name}${wi.note ? ' · ' + H.esc(wi.note) : ''}</small></div><div class="hero"><div class="ring" style="--p:${S.pct}"><span>${S.done}/${S.total}</span></div></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0">${nav}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${w > 1 ? `<a class="btn ghost sm" href="week.html?w=${w - 1}">◀ Тиждень ${w - 1}</a>` : ''}${w < weeks.length ? `<a class="btn ghost sm" href="week.html?w=${w + 1}">Тиждень ${w + 1} ▶</a>` : ''}</div>
      ${between ? `<p class="notice">🍁 Після цього тижня — ${between.name.toLowerCase()}: ${H.fmt(H.parseDate(between.from))} – ${H.fmt(H.parseDate(between.to))}.</p>` : ''}</div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${cols}</div>
      <p class="muted" style="margin-top:14px">Позначки: ○ не розпочато · ◔ розпочато · ◑ практика виконана, ДЗ не здано · ● виконано. ${H.esc(H.state.timetableNote)}</p>`;
  }
  render();
  });
})();
