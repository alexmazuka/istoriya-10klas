/* Головна: сьогодні, борги, прогрес, предмети */
(async function () {
  const root = document.getElementById('app');
  try { await H.init(); } catch (e) { root.innerHTML = '<div class="card">Не вдалося завантажити дані: ' + H.esc(e.message) + '</div>'; return; }
  document.getElementById('hdr').innerHTML = H.header('home'); document.getElementById('ftr').innerHTML = H.footer();
  H.requireCode(() => {
    H.askName(() => { document.getElementById('hdr').innerHTML = H.header('home'); render(); });
  });

  function render() {
    const t = H.today(); const slot = H.slotOf(t); const hol = H.holidayOn(t); const iso = H.isoDate(t);
    const hour = new Date().getHours(); const greet = hour < 12 ? 'Доброго ранку' : hour < 18 ? 'Добрий день' : 'Добрий вечір';
    let todayHTML;
    if (slot) {
      const ls = H.lessonsOn(slot.week, slot.day); const done = ls.filter(l => H.statusOf(l.id) === 'done').length;
      todayHTML = `<div class="hero"><div class="ring" style="--p:${ls.length ? Math.round(100 * done / ls.length) : 0}"><span>${done}/${ls.length}</span></div><div><h1 style="margin:0">${H.DAYS[slot.day]}, ${H.fmt(t)}</h1><small class="muted">Тиждень ${slot.week} · ${H.quarterOf(slot.week).name} · ${ls.length} ${ls.length === 1 ? 'урок' : 'уроки'} за розкладом</small></div></div>
        <div style="margin-top:10px">${ls.map(l => H.lessonRow(l)).join('')}</div>
        ${done === ls.length && ls.length ? '<p class="notice" style="border-color:var(--ok)">Усі уроки на сьогодні виконано.</p>' : ''}`;
    } else {
      const nxt = H.nextSchoolDay(t);
      let why = iso < H.state.cal.start ? `Курс починається <b>1 вересня 2026</b>.` : iso > H.state.cal.end ? `Семестр завершено 23 грудня.` : hol ? `Зараз <b>${hol.name.toLowerCase()}</b> (${H.fmt(H.parseDate(hol.from))} – ${H.fmt(H.parseDate(hol.to))}).` : `Сьогодні <b>вихідний</b> за розкладом цих двох предметів.`;
      todayHTML = `<h1 style="margin:0">${H.fmt(t, { weekday: 'long', day: 'numeric', month: 'long' })}</h1><p>${why}</p>` + (nxt ? `<p class="muted">Наступний навчальний день — ${H.DAYS[nxt.day].toLowerCase()}, ${H.fmt(H.parseDate(nxt.iso))} (тиждень ${nxt.week}):</p>${H.lessonsOn(nxt.week, nxt.day).map(l => H.lessonRow(l)).join('')}` : '');
    }
    const od = H.overdue(); const cw = H.currentWeek(); const W = H.summary(l => l.week === cw); const A = H.summary();
    const odHTML = od.length ? `<div class="card" style="border-left:6px solid var(--bad)"><h2 style="margin-top:0">Треба надолужити: ${od.length} ${od.length === 1 ? 'урок' : od.length < 5 ? 'уроки' : 'уроків'}</h2><p class="muted">Ці уроки були в розкладі раніше, але ще не виконані.</p>${od.slice(0, 6).map(l => H.lessonRow(l, { date: true })).join('')}${od.length > 6 ? `<p><a href="week.html?w=${od[0].week}">Показати всі в розкладі тижнів →</a></p>` : ''}</div>` : (A.done ? '<div class="card" style="border-left:6px solid var(--ok)"><b>Боргів немає — усе виконано за графіком.</b></div>' : '');
    const subjHTML = H.state.subjects.map(sub => { const S = H.summary(l => l.subject === sub.id); return `<a class="card" href="subject.html?s=${sub.id}" style="margin:0;color:inherit;display:block"><div style="display:flex;justify-content:space-between;align-items:center"><b>${sub.icon} ${H.esc(sub.name)}</b><small class="muted">${S.done}/${S.total}</small></div><div class="bar" style="margin:8px 0 4px"><i style="width:${S.pct}%;background:${sub.color}"></i></div><small class="muted">${S.avg != null ? 'середній бал ' + S.avg + '%' : 'ще не розпочато'}</small></a>`; }).join('');
    const bd = H.badges(); const earned = bd.filter(b => b.earned);
    root.innerHTML = `<div class="card today-box">${todayHTML}</div>${odHTML}
      <div class="grid c2"><div class="card" style="margin:0"><h2 style="margin-top:0">Тиждень ${cw}</h2><div class="hero"><div class="ring" style="--p:${W.pct}"><span>${W.pct}%</span></div><div><b>${W.done} з ${W.total}</b> уроків виконано<br><small class="muted">${W.avg != null ? 'середній результат ' + W.avg + '%' : ''}${W.hwWait ? ' · ' + W.hwWait + ' ДЗ очікують перевірки' : ''}</small></div></div><p><a class="btn sec" href="week.html?w=${cw}">Розклад тижня</a></p></div>
      <div class="card" style="margin:0"><h2 style="margin-top:0">Семестр</h2><div class="hero"><div class="ring" style="--p:${A.pct}"><span>${A.pct}%</span></div><div><b>${A.done} з ${A.total}</b> уроків<br><small class="muted">зірок: ${A.stars} · час: ${H.fmtTime(A.time)} · серія: ${H.streak()} дн.</small></div></div><p><a class="btn sec" href="achievements.html">Нагороди: ${earned.length}/${bd.length}</a></p></div></div>
      <h2>Предмети</h2><div class="grid c2">${subjHTML}</div>
      ${earned.length ? `<h2>Останні нагороди</h2><div class="grid c4">${earned.slice(-4).map(b => `<div class="badge earned"><span class="ic">${b.icon}</span><div><b>${b.name}</b><br><small class="muted">${b.desc}</small></div></div>`).join('')}</div>` : ''}`;
  }
})();
