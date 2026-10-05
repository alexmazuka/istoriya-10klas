/* Кабінет батьків: огляд, уроки з деталями відповідей, журнал, звіти, налаштування */
(async function () {
  const root = document.getElementById('app');
  try { await H.init(); } catch (e) { root.innerHTML = '<div class="card">Помилка: ' + H.esc(e.message) + '</div>'; return; }
  document.getElementById('hdr').innerHTML = H.header('parent'); document.getElementById('ftr').innerHTML = H.footer();
  H.requireCode(() => start());

  function start() {
  const lessonCache = {};
  async function lesson(id) { if (!lessonCache[id]) { try { lessonCache[id] = await H.loadJSON(H.state.byId[id].file); } catch (e) { lessonCache[id] = null; } } return lessonCache[id]; }

  /* ---- PIN (перевіряється як SHA-256 хеш, сам PIN ніде на сторінці не зберігається і не показується) ---- */
  if (sessionStorage.getItem('h10.parent') !== '1') {
    root.innerHTML = `<div class="card" style="max-width:460px;margin:40px auto"><h1>Кабінет батьків</h1><p class="muted">Тут видно, як учень опрацьовує уроки й домашні завдання. Цей розділ лише для дорослих — введіть PIN, який вам повідомили окремо.</p><div class="field"><input id="pin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"></div><button class="btn" id="go">Увійти</button> <span id="err" class="pill-bad"></span></div>`;
    const tryPin = async () => { const btn = document.getElementById('go'); btn.disabled = true; const ok = await H.settings.checkPin(document.getElementById('pin').value); btn.disabled = false; if (ok) { sessionStorage.setItem('h10.parent', '1'); location.reload(); } else { document.getElementById('err').textContent = 'Невірний PIN'; document.getElementById('pin').value = ''; document.getElementById('pin').focus(); } };
    document.getElementById('go').onclick = tryPin; document.getElementById('pin').onkeydown = e => { if (e.key === 'Enter') tryPin(); }; document.getElementById('pin').focus();
    return;
  }

  const TABS = [['overview', 'Огляд'], ['lessons', 'Уроки і домашні'], ['journal', 'Журнал'], ['report', 'Звіт і резервна копія'], ['settings', 'Налаштування']];
  let tab = H.qs('tab') || 'overview'; let week = Number(H.qs('w')) || H.currentWeek(); let onlyHW = false; let openId = H.qs('id') || null; let flash = null;
  function tabsHTML() { return `<div class="tabs">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}<button class="btn sm ghost" id="exit" style="margin-left:auto">Вийти з кабінету</button></div>`; }

  /* ---- Огляд ---- */
  function overview() {
    const A = H.summary(); const od = H.overdue(); const log = H.progress.load().log; const last = log.length ? log[log.length - 1] : null; const s = H.settings.get();
    const waiting = H.state.plan.filter(l => H.hwStatus(H.progress.get(l.id)) === 'submitted');
    const cards = [[`${A.done} / ${A.total}`, 'уроків виконано', `<div class="bar"><i style="width:${A.pct}%"></i></div>`], [A.avg != null ? A.avg + '%' : '—', 'середній бал за практику', ''], [waiting.length, 'домашніх очікують перевірки', waiting.length ? `<a href="parent.html?tab=lessons&hw=1">переглянути →</a>` : ''], [od.length, 'уроків прострочено', od.length ? `<a href="week.html?w=${od[0].week}">тиждень ${od[0].week} →</a>` : ''], [H.fmtTime(A.time), 'часу за уроками', ''], [H.streak() + ' дн.', 'серія навчальних днів', last ? `<small class="muted">остання активність: ${H.fmtDT(last.t)}</small>` : '']];
    const subjRows = H.state.subjects.map(sub => { const S = H.summary(l => l.subject === sub.id); return `<tr><td>${sub.icon} ${H.esc(sub.name)}</td><td>${S.done}/${S.total}</td><td style="min-width:120px"><div class="bar"><i style="width:${S.pct}%;background:${sub.color}"></i></div></td><td>${S.avg != null ? S.avg + '%' : '—'}</td><td>${S.hwOk}/${S.hwOk + S.hwWait}</td><td>${H.fmtTime(S.time)}</td></tr>`; }).join('');
    const weekCells = H.state.cal.weeks.map(w => { const S = H.summary(l => l.week === w.week); const iso = H.isoDate(H.dateOf(w.week, w.days[w.days.length - 1])); const past = iso < H.isoDate(H.today()); const col = S.total === 0 ? '#d1d5db' : S.pct === 100 ? 'var(--ok)' : past && S.pct < 100 ? 'var(--bad)' : S.pct > 0 ? 'var(--accent2)' : '#d1d5db'; return `<a href="parent.html?tab=lessons&w=${w.week}" title="Тиждень ${w.week}: ${S.done}/${S.total}" style="display:block;text-align:center;padding:8px 4px;border-radius:8px;background:#fff;border:2px solid ${col};color:inherit"><b>${w.week}</b><br><small>${S.done}/${S.total}</small></a>`; }).join('');
    return `<div class="grid c3">${cards.map(c => `<div class="card" style="margin:0"><div style="font-size:1.6rem;font-weight:800">${c[0]}</div><small class="muted">${c[1]}</small>${c[2]}</div>`).join('')}</div>
      <div class="card"><h2 style="margin-top:0">Тижні року</h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(60px,1fr))">${weekCells}</div><small class="muted">зелений — тиждень виконано повністю; червоний — тиждень минув, є невиконані уроки; жовтий — у процесі; сірий — уроки ще не додані (заплановано на пізніше).</small></div>
      <div class="card"><h2 style="margin-top:0">За предметами</h2><div class="table-wrap"><table><thead><tr><th>Предмет</th><th>Уроки</th><th></th><th>Сер. бал</th><th>ДЗ перевірено</th><th>Час</th></tr></thead><tbody>${subjRows}</tbody></table></div></div>
      <div class="notice" style="border-color:${syncColor()}">${syncBadge()} Код доступу: <b>${H.esc(s.joinCode || '—')}</b> · оновлено: ${H.fmtDT(s.lastSync)}</div>`;
  }

  /* ---- Уроки ---- */
  function lessonsTab() {
    const wi = H.weekInfo(week); let ls = H.state.byWeek[week] || []; if (onlyHW) ls = H.state.plan.filter(l => H.hwStatus(H.progress.get(l.id)) === 'submitted');
    const nav = H.state.cal.weeks.map(w => `<button class="chip" data-w="${w.week}" style="border:0;cursor:pointer;${w.week === week && !onlyHW ? 'outline:2px solid var(--accent)' : ''}">${w.week}</button>`).join(' ');
    const rows = ls.map(l => { const r = H.progress.get(l.id); const st = H.statusOf(l.id); const h = H.hwStatus(r); const hwCls = h === 'ok' ? 'pill-ok' : h === 'submitted' ? 'pill-warn' : h === 'redo' ? 'pill-bad' : 'muted'; const lk = H.locked(l.id);
      return `<tr style="${openId === l.id ? 'background:#eef2ff' : ''}"><td>${H.DAYS_SHORT[l.day]}<br><small class="muted">${H.fmt(H.dateOf(l.week, l.day), { day: 'numeric', month: 'short' })}</small></td><td>${H.subjTag(l.subject)}</td><td><b>${H.esc(l.title)}</b>${lk ? ' <small class="muted">(заблоковано для учня)</small>' : ''}</td><td title="${H.statusName(st)}">${H.statusIcon(st)} <small>${H.statusName(st).split(',')[0]}</small></td><td>${r && r.practice.best != null ? `<b>${r.practice.best}%</b> ${H.starsHTML(r.practice.best)}${r.practice.attempts > 1 ? `<br><small class="muted">спроб: ${r.practice.attempts}</small>` : ''}` : '—'}</td><td class="${hwCls}">${H.hwStatusName(h)}${r && r.homework.score != null ? `<br><small class="muted">авто: ${r.homework.score}%</small>` : ''}</td><td>${r ? H.fmtTime(r.time) : '—'}<br><small class="muted">${r ? H.fmtDT(r.last) : ''}</small></td><td><button class="btn sm sec" data-open="${l.id}">Деталі</button></td></tr>`; }).join('');
    return `<div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${nav}<label style="margin-left:auto;display:flex;gap:6px;align-items:center"><input type="checkbox" id="onlyHW" ${onlyHW ? 'checked' : ''}> лише ДЗ на перевірку</label></div>
      <h2>${onlyHW ? 'Домашні завдання, що очікують перевірки' : `Тиждень ${week}: ${wi ? H.fmt(H.dateOf(week, wi.days[0])) + ' – ' + H.fmt(H.dateOf(week, wi.days[wi.days.length - 1])) : ''}`}</h2>
      <div class="table-wrap"><table><thead><tr><th>День</th><th>Предмет</th><th>Урок</th><th>Статус</th><th>Практика</th><th>Домашнє</th><th>Час / активність</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="muted">Немає уроків (можливо, контент цього тижня ще не додано)</td></tr>'}</tbody></table></div></div><div id="detail"></div>`;
  }
  /* повернення на доопрацювання: що саме повернути; попередня спроба зберігається для батьків */
  const PARTS = [['theory', '📖 Теорію — прочитати ще раз'], ['practice', '✏️ Практику — виконати заново'], ['homework', '🏠 Домашнє — зробити заново']];
  const PART_SHORT = { theory: 'теорія', practice: 'практика', homework: 'домашнє' };
  function partsHTML(rv) { const redo = rv && rv.status === 'redo'; const cur = redo ? (rv.parts || ['homework']) : null; return `<div class="field rv-parts" ${redo ? '' : 'hidden'}><b>Що повернути:</b>${PARTS.map(([k, n]) => `<label><input type="checkbox" name="rvp" value="${k}" ${!cur || cur.includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div>`; }
  function returnLesson(r, parts, comment) {
    const snap = { at: Date.now(), comment, parts };
    if (parts.includes('practice')) snap.practice = { answers: r.practice.answers, results: r.practice.results, score: r.practice.score };
    if (parts.includes('homework')) snap.homework = { answers: r.homework.answers, results: r.homework.results, score: r.homework.score, submitted: r.homework.submitted };
    r.returned = (r.returned || []).concat([snap]).slice(-5);
    if (parts.includes('theory')) r.theory = null;
    if (parts.includes('practice')) Object.assign(r.practice, { answers: {}, results: {}, score: null, done: null });
    if (parts.includes('homework')) Object.assign(r.homework, { answers: {}, results: {}, score: null, submitted: null });
  }
  async function detail(id) {
    const box = document.getElementById('detail'); const meta = H.state.byId[id]; const r = H.progress.get(id); const L = await lesson(id);
    if (!L) { box.innerHTML = '<div class="card">Файл уроку недоступний.</div>'; return; }
    const block = (kind, list, B) => list.map((ex, i) => { const R = (B.results || {})[i]; const ua = EX.userAnswerText(ex, (B.answers || {})[i]); const manual = EX.isManual(ex.type);
      const verdict = !R || !R.final ? '<span class="muted">не виконано</span>' : manual ? '<span class="pill-warn">на перевірку</span>' : R.score === 1 ? `<span class="pill-ok">правильно${R.tries > 1 ? ' (2-га спроба)' : ''}</span>` : R.score > 0 ? `<span class="pill-warn">частково ${Math.round(R.score * 100)}%</span>` : '<span class="pill-bad">неправильно</span>';
      return `<div class="ans-row"><div class="q">${i + 1}. ${H.md(ex.q || '')} <small>[${ex.type}]</small> — ${verdict}</div><div class="child">${H.esc(ua)}</div>${(!R || R.score < 1 || manual) && ex.type !== 'checklist' ? `<small class="muted">${manual ? 'Орієнтир' : 'Правильно'}: ${H.esc(EX.answerText(ex))}</small>` : ''}</div>`; }).join('');
    const rv = r && r.homework.review;
    const STEP_UA = { theory: 'теорія', practice: 'практика', homework: 'домашнє', summary: 'підсумок' };
    const log = H.progress.load().log || [];
    const aiAsks = log.filter(e => e.type === 'ai_ask' && e.id === id);
    const aiOpens = log.filter(e => e.type === 'ai_open' && e.id === id).length;
    const aiBlock = (aiAsks.length || aiOpens) ? `<div class="card" style="background:#f6f3ee"><h3 style="margin-top:0">Кліо (ШІ-асистент)</h3><p class="muted">Відкривав чат: ${aiOpens} раз(ів) · Запитань поставлено: ${aiAsks.length}</p>${aiAsks.map(e => `<div class="ans-row"><div class="q">Учень: ${H.md(e.q)} <small class="muted">(крок: ${STEP_UA[e.step] || e.step || '?'})</small></div><div class="child">Кліо: ${H.md(e.a)}</div><small class="muted">${H.fmtDT(e.t)}</small></div>`).join('')}</div>` : '';
    box.innerHTML = `<div class="card detail"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h2 style="margin:0">${H.subjTag(meta.subject)} ${H.esc(L.title)}</h2><span><a class="btn sm ghost" href="${H.lessonURL(id)}" target="_blank">Відкрити урок ↗</a> <button class="btn sm danger" id="resetLesson">Скинути прогрес уроку</button></span></div>
      ${!r ? '<p class="muted">Учень ще не відкривав цей урок.</p>' : `<p class="muted">Відкрито: ${H.fmtDT(r.opened)} · матеріал опрацьовано: ${r.theory ? H.fmtDT(r.theory) : 'ні'} · час: ${H.fmtTime(r.time)}</p>
      <h3>Практика ${r.practice.done ? `— ${r.practice.score}% (найкращий ${r.practice.best}%, спроб ${r.practice.attempts}), завершено ${H.fmtDT(r.practice.done)}` : '— не завершено'}</h3>${block('practice', L.exercises, r.practice)}
      <h3>Домашнє завдання — ${H.hwStatusName(H.hwStatus(r))}${r.homework.submitted ? ', здано ' + H.fmtDT(r.homework.submitted) : ''}</h3>${block('homework', L.homework, r.homework)}
      ${r.homework.submitted || rv ? `<div class="card" style="background:#f9fafb"><h3 style="margin-top:0">Перевірка батьків</h3>${rv ? `<p class="muted">Поточна оцінка: <b>${rv.status === 'ok' ? 'прийнято' : 'повернуто'}</b> ${H.fmtDT(rv.at)}${rv.comment ? ' — ' + H.esc(rv.comment) : ''}</p>` : ''}<div class="field"><label><input type="radio" name="rv" value="ok" ${!rv || rv.status === 'ok' ? 'checked' : ''}> Прийнято</label><label><input type="radio" name="rv" value="redo" ${rv && rv.status === 'redo' ? 'checked' : ''}> Повернути на доопрацювання (учень зможе переробити)</label></div>${partsHTML(rv)}<div class="field"><label>Коментар для учня</label><textarea id="rvc" style="min-height:70px">${H.esc(rv ? rv.comment || '' : '')}</textarea></div><button class="btn ok" id="saveRv">Зберегти перевірку</button></div>` : ''}
      ${(r && r.returned || []).length ? `<details class="prev"><summary>Попередні спроби (${r.returned.length})</summary>${r.returned.slice().reverse().map(s => `<div class="prev-item"><p class="muted">Повернуто ${H.fmtDT(s.at)}: ${(s.parts || ['homework']).map(p => PART_SHORT[p]).join(', ')}${s.comment ? ' — «' + H.esc(s.comment) + '»' : ''}</p>${s.practice ? `<h4>Практика${s.practice.score != null ? ' — ' + s.practice.score + '%' : ''}</h4>${block('practice', L.exercises, s.practice)}` : ''}${s.homework ? `<h4>Домашнє</h4>${block('homework', L.homework, s.homework)}` : ''}</div>`).join('')}</details>` : ''}
      ${aiBlock}
      ${r.reflection ? `<h3>Роздуми</h3>${Object.entries(r.reflection).map(([i, v]) => `<div class="child">${H.esc((L.reflection || [])[i] || '')}<br><b>${H.esc(v)}</b></div>`).join('')}` : ''}`}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.querySelectorAll('input[name=rv]').forEach(i => i.onchange = () => { const p = box.querySelector('.rv-parts'); if (p) p.hidden = box.querySelector('input[name=rv]:checked').value !== 'redo'; });
    const sv = document.getElementById('saveRv'); if (sv) sv.onclick = () => { const status = box.querySelector('input[name=rv]:checked').value; const comment = document.getElementById('rvc').value.trim(); const parts = status === 'redo' ? [...box.querySelectorAll('input[name=rvp]:checked')].map(i => i.value) : [];
      if (status === 'redo' && !parts.length) { H.toast('Позначте, що саме повернути: теорію, практику чи домашнє', 'bad'); return; }
      if (status === 'redo') returnLesson(r, parts, comment);
      r.homework.review = status === 'redo' ? { status, comment, at: Date.now(), parts } : { status, comment, at: Date.now() }; H.progress.set(id, r); H.progress.log({ type: 'review', id, status, comment, parts }); openId = null; const u = new URL(location.href); if (u.searchParams.has('id')) { u.searchParams.delete('id'); history.replaceState(null, '', u.pathname + u.search); }
      flash = status === 'redo' ? { cls: '', html: `↩️ <b>«${H.esc(L.title)}»</b>: повернуто учню на доопрацювання — ${parts.map(p => PART_SHORT[p]).join(', ')}.${comment ? ' Ваш коментар буде видно в уроці.' : ''}` } : { cls: 'done', html: `✅ <b>«${H.esc(L.title)}»</b>: домашнє прийнято.` };
      render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.getElementById('resetLesson').onclick = () => { if (confirm('Видалити весь прогрес цього уроку? Учень проходитиме його з початку.')) { H.progress.remove(id); H.progress.log({ type: 'reset', id }); render(); } };
  }

  /* ---- Журнал ---- */
  function journal() {
    const log = H.progress.load().log.slice().reverse().slice(0, 300);
    const name = t => ({ open: 'відкрив урок', practice: 'завершив практику', homework: 'здав домашнє', retry: 'повторює практику', review: 'перевірка батьків', reset: 'скинуто прогрес', import: 'імпорт даних', ai_open: 'відкрив чат з Кліо', ai_ask: 'запитав Кліо' }[t] || t);
    return `<div class="card"><h2 style="margin-top:0">Журнал подій</h2><div class="table-wrap"><table><thead><tr><th>Коли</th><th>Подія</th><th>Урок</th><th>Результат</th></tr></thead><tbody>${log.map(e => { const l = e.id ? H.state.byId[e.id] : null; return `<tr><td>${H.fmtDT(e.t)}</td><td>${name(e.type)}</td><td>${l ? H.subjTag(l.subject) + ' ' + H.esc(l.title) : ''}</td><td>${e.score != null ? e.score + '%' : ''}${e.status ? (e.status === 'ok' ? 'прийнято' : 'повернуто') + (e.comment ? ': ' + H.esc(e.comment) : '') : ''}${e.attempt > 1 ? ' (спроба ' + e.attempt + ')' : ''}${e.q ? H.esc(e.q.slice(0, 60)) + (e.q.length > 60 ? '…' : '') : ''}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">Подій ще немає</td></tr>'}</tbody></table></div></div>`;
  }

  /* ---- Звіт ---- */
  function reportText(w) {
    const s = H.settings.get(); const wi = H.weekInfo(w); const ls = H.state.byWeek[w] || []; const S = H.summary(l => l.week === w);
    const lines = [`Звіт про навчання — ${s.name || 'учень'}, 10 клас (історія)`, `Тиждень ${w}${wi ? ' (' + H.fmt(H.dateOf(w, wi.days[0])) + ' – ' + H.fmt(H.dateOf(w, wi.days[wi.days.length - 1])) + ')' : ''}`, '', `Виконано уроків: ${S.done} з ${S.total} (${S.pct}%)`, `Середній бал за практику: ${S.avg != null ? S.avg + '%' : '—'}`, `Домашні завдання: здано ${S.hwOk + S.hwWait}, перевірено ${S.hwOk}`, `Час за уроками: ${H.fmtTime(S.time)}`, '', 'За предметами:'];
    H.state.subjects.forEach(sub => { const P = H.summary(l => l.week === w && l.subject === sub.id); if (P.total) lines.push(`• ${sub.name}: ${P.done}/${P.total}${P.avg != null ? ', сер. ' + P.avg + '%' : ''}`); });
    const nd = ls.filter(l => H.statusOf(l.id) !== 'done'); if (nd.length) { lines.push('', 'Не виконано:'); nd.forEach(l => lines.push(`• ${H.DAYS_SHORT[l.day]} — ${H.state.subjMap[l.subject].name}: ${l.title}`)); }
    const od = H.overdue().filter(l => l.week < w); if (od.length) lines.push('', `Борги з попередніх тижнів: ${od.length}`);
    const A = H.summary(); lines.push('', `Разом: ${A.done}/${A.total} уроків, ${A.stars} зірок, серія ${H.streak()} дн.`);
    return lines.join('\n');
  }
  function report() {
    return `<div class="card"><h2 style="margin-top:0">Звіт за тиждень</h2><div style="display:flex;gap:6px;flex-wrap:wrap">${H.state.cal.weeks.map(w => `<button class="chip" data-rw="${w.week}" style="border:0;cursor:pointer;${w.week === week ? 'outline:2px solid var(--accent)' : ''}">${w.week}</button>`).join('')}</div>
      <textarea id="rep" class="field" style="width:100%;min-height:260px;margin-top:10px;font-family:ui-monospace,monospace;font-size:.9rem">${H.esc(reportText(week))}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="copy">Копіювати</button><a class="btn sec" id="tg" target="_blank" href="#">Надіслати в Telegram</a><a class="btn sec" id="mail" href="#">Надіслати e-mail</a></div></div>
      <div class="card"><h2 style="margin-top:0">Резервна копія прогресу</h2><p class="muted">Прогрес зберігається у браузері цього пристрою і синхронізується через код доступу. Резервна копія — додаткова підстраховка.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="exp">Експортувати JSON</button><label class="btn sec">Імпортувати JSON<input type="file" id="imp" accept="application/json" hidden></label></div></div>`;
  }

  /* ---- Синхронізація (стан) ---- */
  function syncColor() { const st = H.sync.status(); return st === 'on' ? 'var(--ok)' : st === 'error' ? 'var(--bad)' : st === 'connecting' ? 'var(--accent2)' : 'var(--line)'; }
  function syncBadge() { const st = H.sync.status(); return { on: '●', connecting: '…', error: '!', off: '○' }[st] || st; }
  function syncStatusText() { const st = H.sync.status(); return { on: 'Підключено, дані в реальному часі', connecting: 'Підключення…', error: "Немає зв'язку (перевірте інтернет)", off: 'Вимкнено' }[st] || st; }

  /* ---- Налаштування ---- */
  function settingsTab() {
    const s = H.settings.get();
    return `<div class="card"><h2 style="margin-top:0">Профіль</h2>
      <div class="field"><label>Ім'я учня</label><input id="nm" value="${H.esc(s.name || '')}"></div>
      <div class="field"><label>Новий PIN кабінету батьків (4–8 цифр)</label><input id="pin" inputmode="numeric" placeholder="залишити без змін" autocomplete="off"><small class="muted">PIN зберігається лише як хеш — навіть у коді сторінки немає числа, яке можна побачити.</small></div>
      <div class="field"><label>Повторіть новий PIN</label><input id="pin2" inputmode="numeric" placeholder="залишити без змін" autocomplete="off"></div>
      <div class="field"><label>Тестова «сьогоднішня» дата (лише для перевірки, формат РРРР-ММ-ДД; порожньо = реальна дата)</label><input id="fake" value="${H.esc(s.fakeToday || '')}" placeholder="2026-09-14"></div>
      <button class="btn ok" id="save">Зберегти</button></div>
      <div class="card"><h2 style="margin-top:0">Код доступу до акаунта</h2>
      <p class="muted">Цей код вводять на КОЖНОМУ пристрої — учня й батьків — щоб прогрес і кабінет батьків були спільними.</p>
      <div class="field"><label>Поточний код цього акаунта</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><code style="font-size:1.2rem;font-weight:800;letter-spacing:.05em;background:#f3f4f6;padding:6px 14px;border-radius:8px">${H.esc(s.joinCode || '—')}</code><span style="color:${syncColor()}">● ${syncStatusText()}</span><button class="btn sec sm" id="copyCode">Копіювати код</button></div>
      <small class="muted">Останнє надсилання: ${H.fmtDT(s.lastPush)} · останнє отримання: ${H.fmtDT(s.lastSync)}</small></div></div>
      <div class="card" style="border-left:6px solid var(--bad)"><h2 style="margin-top:0">Небезпечна зона</h2><p class="muted">Повне скидання видаляє весь прогрес і журнал на цьому пристрої (і на всіх пристроях з цим кодом). Спочатку зробіть експорт у вкладці «Звіт».</p><button class="btn danger" id="wipe">Скинути весь прогрес</button></div>`;
  }

  /* ---- рендер ---- */
  /* одноразова плашка з результатом дії (напр. після перевірки домашнього) */
  function flashHTML() { if (!flash) return ''; const f = flash; flash = null; return `<div class="notice ${f.cls}" role="status">${f.html}</div>`; }
  function render() {
    root.innerHTML = `<h1 style="margin:10px 0 4px">Кабінет батьків</h1>` + tabsHTML() + flashHTML() + (tab === 'overview' ? overview() : tab === 'lessons' ? lessonsTab() : tab === 'journal' ? journal() : tab === 'report' ? report() : settingsTab());
    root.querySelectorAll('button[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; openId = null; render(); });
    document.getElementById('exit').onclick = () => { sessionStorage.removeItem('h10.parent'); location.href = 'index.html'; };
    root.querySelectorAll('button[data-w]').forEach(b => b.onclick = () => { week = Number(b.dataset.w); onlyHW = false; openId = null; render(); });
    root.querySelectorAll('button[data-rw]').forEach(b => b.onclick = () => { week = Number(b.dataset.rw); render(); });
    root.querySelectorAll('button[data-open]').forEach(b => b.onclick = () => { openId = b.dataset.open; render(); detail(openId); });
    const oh = document.getElementById('onlyHW'); if (oh) oh.onchange = () => { onlyHW = oh.checked; render(); };
    if (tab === 'lessons' && openId) detail(openId);
    if (tab === 'report') {
      const txt = () => document.getElementById('rep').value;
      document.getElementById('copy').onclick = () => navigator.clipboard.writeText(txt()).then(() => H.toast('Скопійовано', 'ok'));
      const upd = () => { document.getElementById('tg').href = 'https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname.replace(/parent\.html$/, '')) + '&text=' + encodeURIComponent(txt()); document.getElementById('mail').href = 'mailto:?subject=' + encodeURIComponent('Звіт про навчання, тиждень ' + week) + '&body=' + encodeURIComponent(txt()); };
      upd(); document.getElementById('rep').oninput = upd;
      document.getElementById('exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([H.progress.exportJSON()], { type: 'application/json' })); a.download = `istoriya-10klas-progress-${H.isoDate(new Date())}.json`; a.click(); };
      document.getElementById('imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const n = H.progress.merge(t); H.progress.log({ type: 'import', n }); H.toast(`Імпортовано: оновлено ${n} уроків`, 'ok'); render(); } catch (err) { alert('Не вдалося імпортувати: ' + err.message); } }); };
    }
    if (tab === 'settings') {
      document.getElementById('save').onclick = async () => {
        const p = { name: document.getElementById('nm').value.trim(), fakeToday: document.getElementById('fake').value.trim() };
        const pin = document.getElementById('pin').value.trim(), pin2 = document.getElementById('pin2').value.trim();
        if (pin || pin2) {
          if (!/^\d{4,8}$/.test(pin)) { alert('PIN — від 4 до 8 цифр'); return; }
          if (pin !== pin2) { alert('PIN і повторення PIN не збігаються'); return; }
        }
        H.settings.patch(p);
        if (pin) await H.settings.setPin(pin);
        H.toast('Збережено', 'ok'); document.getElementById('hdr').innerHTML = H.header('parent'); render();
      };
      const cc = document.getElementById('copyCode'); if (cc) cc.onclick = () => navigator.clipboard.writeText(H.settings.get().joinCode || '').then(() => H.toast('Код скопійовано', 'ok'));
      document.getElementById('wipe').onclick = () => { if (confirm('Точно видалити ВЕСЬ прогрес?') && prompt('Введіть слово ВИДАЛИТИ для підтвердження') === 'ВИДАЛИТИ') { H.progress.reset(); H.toast('Прогрес скинуто'); render(); } };
    }
  }
  if (H.qs('hw') === '1') { tab = 'lessons'; onlyHW = true; }
  window.addEventListener('h10-remote-update', () => { if (tab === 'overview' || tab === 'settings') render(); });
  window.addEventListener('h10-sync-status', () => { if (tab === 'settings') render(); });
  render();
  }
})();
