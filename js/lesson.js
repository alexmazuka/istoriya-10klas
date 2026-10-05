/* Сторінка уроку: теорія → практика → домашнє завдання → підсумок.
   На відміну від zoshyt-4klas: (1) урок може бути ЗАБЛОКОВАНИЙ, якщо попередній урок цього ж
   предмета ще не завершено — перевіряється одразу, до рендеру; (2) є блок «Додаткові матеріали». */
(async function () {
  const root = document.getElementById('app');
  try { await H.init(); } catch (e) { root.innerHTML = '<div class="card">Не вдалося завантажити дані: ' + H.esc(e.message) + '</div>'; return; }
  H.requireCode(() => start());

  function start() {
    document.getElementById('hdr').innerHTML = H.header('');
    const id = H.qs('id'); const meta = H.state.byId[id];
    if (!meta) { root.innerHTML = '<div class="card"><h1>Урок не знайдено</h1><a href="index.html">На головну</a></div>'; return; }
    if (H.locked(id)) {
      root.innerHTML = `<div class="card"><h1>🔒 Урок поки заблокований</h1><p>${H.esc(H.lockReason(id))}</p><a class="btn" href="subject.html?s=${meta.subject}">До списку уроків предмета</a></div>`;
      return;
    }
    run(id, meta);
  }

  async function run(id, meta) {
    let L;
    try { L = await H.loadJSON(meta.file); } catch (e) {
      root.innerHTML = `<div class="card"><h1>${H.esc(meta.title)}</h1><p>${H.subjTag(meta.subject)} Тиждень ${meta.week}, ${H.DAYS[meta.day]}</p><div class="notice">Матеріали цього уроку ще готуються.</div><a class="btn sec" href="subject.html?s=${meta.subject}">До списку уроків</a></div>`; return;
    }
    const S = H.state.subjMap[meta.subject];
    document.title = L.title + ' — ' + S.name;
    if (window.AiHelp) window.AiHelp.mount();
    const rec = H.progress.ensure(id); H.progress.save();
    /* батьки повернули урок з іншого пристрою, поки він відкритий, — перезавантажити, щоб почати з потрібного кроку */
    window.addEventListener('h10-remote-update', () => { const cur = H.progress.get(id); if (cur && cur !== rec && JSON.stringify(cur.homework.review || null) !== JSON.stringify(rec.homework.review || null)) location.reload(); });
    const seed = H.hash(id);
    const wasNew = !rec.theory && !rec.practice.done;
    if (wasNew) H.progress.log({ type: 'open', id });

    let tick = 0; setInterval(() => { if (document.visibilityState === 'visible') { rec.time = (rec.time || 0) + 1; if (++tick % 15 === 0) H.progress.set(id, rec); } }, 1000);
    document.addEventListener('visibilitychange', () => H.progress.set(id, rec)); window.addEventListener('beforeunload', () => H.progress.set(id, rec));

    const ordered = H.state.bySubject[meta.subject]; const pos = ordered.findIndex(l => l.id === id); const next = ordered[pos + 1];

    const STEPS = [['theory', '1. Теорія'], ['practice', '2. Практика'], ['homework', '3. Домашнє завдання'], ['summary', '4. Підсумок']];
    let step = !rec.theory ? 'theory' : !rec.practice.done ? 'practice' : !rec.homework.submitted ? 'homework' : 'summary';
    if (H.qs('step')) step = H.qs('step');

    function stepState(s) { if (s === 'theory') return rec.theory ? 'done' : ''; if (s === 'practice') return rec.practice.done ? 'done' : ''; if (s === 'homework') return rec.homework.submitted ? 'done' : ''; return ''; }
    /* повернутий урок: що саме треба переробити і чи вже зроблено */
    const PART_TODO = { theory: 'прочитати теорію', practice: 'виконати практику', homework: 'зробити домашнє' };
    function partDone(p) { return p === 'theory' ? !!rec.theory : p === 'practice' ? !!rec.practice.done : !!rec.homework.submitted; }
    function redoNotice() {
      const parts = H.redoParts(rec); if (!parts.length) return ''; const rv = rec.homework.review;
      return `<div class="notice">↩️ <b>Батьки повернули урок на доопрацювання.</b> Треба ще раз: ${parts.map(p => PART_TODO[p] + (partDone(p) ? ' ✓' : '')).join(', ')}.${rv.comment ? `<br>Коментар: ${H.esc(rv.comment)}` : ''}</div>`;
    }
    function finishRedo() { const parts = H.redoParts(rec); if (parts.length && parts.every(partDone)) { rec.homework.review = null; H.progress.log({ type: 'redo_done', id }); } }
    /* кнопки кроків уроку — однакові вгорі (у шапці) і внизу кожного кроку, щоб не гортати вгору */
    function stepButtons() { return STEPS.map(([k, n]) => `<button data-step="${k}" class="${step === k ? 'on' : ''} ${stepState(k)}">${stepState(k) === 'done' ? '✓ ' : ''}${n}</button>`).join(''); }
    function head() {
      const d = H.dateOf(meta.week, meta.day);
      return `<div class="card"><div class="lesson-head"><div style="flex:1;min-width:240px">${H.subjTag(meta.subject)} <span class="chip">Тиждень ${meta.week} · ${H.DAYS[meta.day]}, ${H.fmt(d)}</span> <span class="chip">⏱ ~${L.minutes} хв</span> <span class="chip" title="Урок № з предмета">Урок ${meta.n} з ${H.state.bySubject[meta.subject].length}</span>
        <h1>${H.esc(L.title)}</h1><small class="muted">${H.esc(meta.section)}</small><div class="goal">${H.md(L.goal)}</div>${redoNotice()}</div></div>
        <div class="steps">${stepButtons()}</div></div>`;
    }

    /* ---------- теорія ---------- */
    function theoryBlock(b) {
      const ttl = b.title ? `<b class="ttl">${H.md(b.title)}</b>` : '';
      switch (b.type) {
        case 'p': return `<p class="blk">${H.md(b.text)}</p>`;
        case 'rule': return `<div class="blk rule">${ttl || '<b class="ttl">Ключова теза</b>'}${H.md(b.text)}</div>`;
        case 'example': return `<div class="blk example">${ttl || '<b class="ttl">Приклад</b>'}<div>${H.md(b.text)}</div></div>`;
        case 'tip': return `<div class="blk tip"><b class="ttl">Варто знати</b>${H.md(b.text)}</div>`;
        case 'list': return `<div class="blk">${ttl}<ul>${b.items.map(i => `<li>${H.md(i)}</li>`).join('')}</ul></div>`;
        case 'steps': return `<div class="blk">${ttl}<ol>${b.items.map(i => `<li>${H.md(i)}</li>`).join('')}</ol></div>`;
        case 'table': return `<div class="blk table-wrap">${ttl}<table><thead><tr>${b.head.map(h => `<th>${H.md(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${H.md(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        case 'reading': return `<div class="blk reading"><h3>${H.esc(b.title)}</h3>${b.author ? `<span class="author">${H.esc(b.author)}${b.genre ? ' · ' + H.esc(b.genre) : ''}</span>` : (b.genre ? `<span class="author">${H.esc(b.genre)}</span>` : '')}${b.text.split(/\n\n+/).map(p => `<p>${H.md(p)}</p>`).join('')}</div>`;
        case 'image': return `<div class="blk image">${H.esc(b.emoji || '🏛️')}<small>${H.md(b.caption)}</small></div>`;
        default: return '';
      }
    }
    function extraBlock() {
      if (!L.extra || !L.extra.length) return '';
      return `<div class="card extra"><h2 style="margin-top:0">Додаткові матеріали</h2><p class="muted">За бажання — щоб зрозуміти тему глибше. Необов'язково для виконання уроку.</p>
        <ul class="extra-list">${L.extra.map(e => `<li><a href="${H.esc(e.url)}" target="_blank" rel="noopener">${e.type === 'video' ? '▶️' : '📄'} ${H.esc(e.title)}</a>${e.note ? `<small class="muted"> — ${H.esc(e.note)}</small>` : ''}</li>`).join('')}</ul></div>`;
    }
    function theoryView() {
      return `<div class="card theory"><h2 style="margin-top:0">Теорія</h2>${L.theory.map(theoryBlock).join('')}
        <p style="margin-top:20px"><button class="btn" id="theoryDone">${rec.theory ? 'До вправ' : 'Я опрацював матеріал — до вправ'}</button></p></div>${extraBlock()}`;
    }

    /* ---------- вправи (практика і домашнє) ---------- */
    function exSet(kind) { return kind === 'practice' ? L.exercises : L.homework; }
    function bucket(kind) { return kind === 'practice' ? rec.practice : rec.homework; }
    function locked(kind) { return kind === 'practice' ? !!rec.practice.done : !!rec.homework.submitted; }

    function exercisesView(kind) {
      const list = exSet(kind), B = bucket(kind), ro = locked(kind);
      const intro = kind === 'practice'
        ? `<h2 style="margin-top:0">Практика</h2><p class="muted">Виконай вправи і натисни «Перевірити» під кожною. Є дві спроби: після першої помилки з'явиться підказка.</p>`
        : `<h2 style="margin-top:0">Домашнє завдання</h2><p class="muted">Виконай самостійно. Письмові відповіді перевірять батьки — аргументуй розгорнуто, спираючись на факти.</p>`;
      let review = '';
      if (kind === 'homework' && rec.homework.review) { const rv = rec.homework.review; review = `<div class="notice" style="border-color:${rv.status === 'ok' ? 'var(--ok)' : 'var(--warn)'}"><b>${rv.status === 'ok' ? 'Батьки перевірили домашнє завдання.' : 'Батьки повернули завдання на доопрацювання.'}</b>${rv.comment ? `<br>Коментар: ${H.esc(rv.comment)}` : ''}<br><small class="muted">${H.fmtDT(rv.at)}</small></div>`; }
      const cards = list.map((ex, i) => EX.render(ex, i, B.answers[i], seed + i * 7, ro)).join('');
      let foot = '';
      if (kind === 'practice') {
        if (rec.practice.done) foot = resultBanner();
        else foot = `<p style="margin-top:18px"><button class="btn ok" id="finish" disabled>Завершити практику</button> <small class="muted" id="finishHint">Спочатку перевір усі вправи.</small></p>`;
      } else {
        if (rec.homework.submitted) foot = `<div class="result-banner"><b>Домашнє завдання здано ${H.fmtDT(rec.homework.submitted)}</b>${rec.homework.score != null ? `<p>Автоперевірка: <b>${rec.homework.score}%</b> ${H.starsHTML(rec.homework.score)}</p>` : ''}<p class="muted">${H.hwStatus(rec) === 'ok' ? 'Батьки вже перевірили.' : 'Батьки побачать твої відповіді у своєму кабінеті.'}</p><p><button class="btn" data-go="summary">До підсумку</button></p></div>`;
        else foot = `<p style="margin-top:18px"><button class="btn ok" id="submitHW" disabled>Здати домашнє завдання</button> <small class="muted" id="finishHint">Спочатку перевір усі завдання.</small></p>`;
      }
      return `<div class="card" id="exwrap" data-kind="${kind}">${intro}${review}${cards}${foot}</div>`;
    }
    function resultBanner() {
      const sc = rec.practice.score, best = rec.practice.best; const st = H.starsOf(sc);
      const msg = sc >= 90 ? 'Відмінно — тему засвоєно глибоко.' : sc >= H.PASS ? 'Добре, тему засвоєно.' : sc >= 50 ? 'Непогано, але варто повторити матеріал.' : 'Тема поки складна — перечитай теорію і спробуй ще раз.';
      return `<div class="result-banner"><h2 style="margin:4px 0">Результат: ${sc}% ${H.starsHTML(sc)}</h2><p>${msg}${rec.practice.attempts > 1 ? ` <small class="muted">Спроба ${rec.practice.attempts}, найкращий результат ${best}%.</small>` : ''}</p>
        <p><button class="btn ghost" id="retry">Повторити практику</button> <button class="btn" data-go="homework">Далі: домашнє завдання</button></p></div>`;
    }
    function afterRender(kind) {
      const wrap = document.getElementById('exwrap'); if (!wrap) return;
      const list = exSet(kind), B = bucket(kind), ro = locked(kind);
      list.forEach((ex, i) => {
        const el = wrap.querySelector(`.ex[data-idx="${i}"]`); const R = B.results[i];
        if (R && R.final) { showFinal(ex, el, R, kind); }
        else if (!ro) { const manual = EX.isManual(ex.type); el.querySelector('.check').innerHTML = `<button class="btn sm" data-check="${i}">${manual ? 'Готово' : 'Перевірити'}</button>${R && R.tries ? '<span class="chip warn">друга спроба</span>' : ''}`; }
        el.addEventListener('change', () => { if (locked(kind)) return; B.answers[i] = EX.collect(ex, el); H.progress.set(id, rec); });
        el.addEventListener('input', () => { if (locked(kind)) return; B.answers[i] = EX.collect(ex, el); if (++tick % 5 === 0) H.progress.set(id, rec); });
      });
      wrap.querySelectorAll('button[data-check]').forEach(b => b.onclick = () => check(kind, Number(b.dataset.check)));
      updateFinish(kind);
      const fin = document.getElementById('finish'); if (fin) fin.onclick = () => finishPractice();
      const sub = document.getElementById('submitHW'); if (sub) sub.onclick = () => submitHomework();
      const rt = document.getElementById('retry'); if (rt) rt.onclick = () => { if (confirm('Почати практику знову? Попередні відповіді очистяться, найкращий результат збережеться.')) { rec.practice.answers = {}; rec.practice.results = {}; rec.practice.done = null; rec.practice.score = null; H.progress.set(id, rec); H.progress.log({ type: 'retry', id }); go('practice'); } };
    }
    function showFinal(ex, el, R, kind) {
      el.classList.add('final', R.score === 1 ? 'good' : R.score > 0 ? 'part' : 'bad'); EX.setReadonly(el, true); el.querySelector('.check').innerHTML = '';
      if (EX.isManual(ex.type)) { EX.feedback(el, 'info', ex.type === 'text' ? `Відповідь збережено — її перевірять батьки.${ex.sample ? `<span class="ans">Орієнтир: <i>${H.md(ex.sample)}</i></span>` : ''}` : 'Виконано.'); return; }
      const lastCorrect = R.res && R.res.score === 1;
      EX.mark(ex, el, R.res || EX.grade(ex, bucket(kind).answers[el.dataset.idx]), !lastCorrect && R.score < 1);
      const pts = Math.round(R.score * 100);
      let html = R.score === 1 ? 'Правильно.' : lastCorrect ? `Правильно — з другої спроби (зараховано ${pts}%).` : R.score > 0 ? `Частково правильно (${pts}%).` : 'Неправильно.';
      if (!lastCorrect && R.score < 1) html += `<span class="ans">Правильна відповідь: ${H.md(EX.answerText(ex))}</span>`;
      if (ex.explain) html += `<div class="explain">${H.md(ex.explain)}</div>`;
      EX.feedback(el, R.score === 1 ? 'good' : R.score > 0 ? 'part' : 'bad', html);
    }
    function check(kind, i) {
      const ex = exSet(kind)[i], B = bucket(kind); const wrap = document.getElementById('exwrap'); const el = wrap.querySelector(`.ex[data-idx="${i}"]`);
      const ans = EX.collect(ex, el); B.answers[i] = ans; const res = EX.grade(ex, ans);
      if (!res.complete) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); EX.feedback(el, 'info', ex.type === 'text' ? `Напиши трохи більше: ${res.have} з ${res.need} символів.` : ex.type === 'checklist' ? 'Відміть усі пункти.' : 'Дай відповідь на всі частини завдання.'); return; }
      const R = B.results[i] || { tries: 0, first: null, score: 0, final: false }; R.tries++;
      if (R.tries === 1) R.first = res.score;
      if (res.manual) { R.score = 1; R.final = true; }
      else if (res.score === 1) { R.score = R.tries === 1 ? 1 : Math.max(R.first, 0.75); R.final = true; }
      else if (R.tries >= 2) { R.score = Math.max(R.first || 0, Math.max(0, res.score - 0.25)); R.final = true; }
      else {
        EX.mark(ex, el, res, false);
        EX.feedback(el, 'part', `Не зовсім. Спробуй ще раз — залишилась одна спроба.${ex.hint ? `<span class="ans">Підказка: ${H.md(ex.hint)}</span>` : ''}`);
        el.querySelector('.check').innerHTML = `<button class="btn sm" data-check="${i}">Перевірити ще раз</button><span class="chip warn">друга спроба</span>`; el.querySelector('button[data-check]').onclick = () => check(kind, i);
        B.results[i] = R; H.progress.set(id, rec); return;
      }
      R.res = { score: res.score, detail: res.detail }; B.results[i] = R; H.progress.set(id, rec); showFinal(ex, el, R, kind); updateFinish(kind);
    }
    function updateFinish(kind) {
      const list = exSet(kind), B = bucket(kind); const allFinal = list.every((_, i) => B.results[i] && B.results[i].final);
      const btn = document.getElementById(kind === 'practice' ? 'finish' : 'submitHW'); const hint = document.getElementById('finishHint');
      if (btn) { btn.disabled = !allFinal; if (hint) hint.textContent = allFinal ? '' : `Перевірено ${list.filter((_, i) => B.results[i] && B.results[i].final).length} з ${list.length}.`; }
    }
    function scoreOf(kind) { const list = exSet(kind), B = bucket(kind); const auto = list.map((ex, i) => [ex, B.results[i]]).filter(([ex]) => EX.isAuto(ex.type)); if (!auto.length) return 100; return Math.round(100 * auto.reduce((s, [, R]) => s + (R ? R.score : 0), 0) / auto.length); }
    function finishPractice() {
      const sc = scoreOf('practice'); rec.practice.score = sc; rec.practice.done = Date.now(); rec.practice.attempts = (rec.practice.attempts || 0) + 1; rec.practice.best = Math.max(rec.practice.best ?? 0, sc);
      finishRedo(); H.progress.set(id, rec); H.progress.log({ type: 'practice', id, score: sc, attempt: rec.practice.attempts, time: rec.time }); go('practice');
    }
    function submitHomework() {
      const list = L.homework, B = rec.homework; const hasAuto = list.some(ex => EX.isAuto(ex.type));
      rec.homework.score = hasAuto ? scoreOf('homework') : null; rec.homework.submitted = Date.now(); finishRedo();
      const texts = list.map((ex, i) => ex.type === 'text' ? { q: ex.q, a: B.answers[i] } : null).filter(Boolean);
      H.progress.set(id, rec); H.progress.log({ type: 'homework', id, score: rec.homework.score, texts, time: rec.time }); H.toast('Домашнє завдання здано', 'ok'); go('summary');
    }

    /* ---------- контекст для ШІ-асистента «Кліо» ---------- */
    function theoryPlain() {
      return (L.theory || []).map(b => {
        switch (b.type) {
          case 'p': case 'rule': case 'tip': case 'example': return (b.title ? b.title + ': ' : '') + b.text;
          case 'list': case 'steps': return (b.title ? b.title + ': ' : '') + (b.items || []).join('; ');
          case 'table': return (b.title ? b.title + ': ' : '') + (b.head || []).join(' | ') + '\n' + (b.rows || []).map(r => r.join(' | ')).join('\n');
          case 'reading': return (b.title || '') + (b.author ? ' (' + b.author + ')' : '') + '\n' + b.text;
          case 'image': return b.caption || '';
          default: return '';
        }
      }).filter(Boolean).join('\n').slice(0, 6000);
    }
    function exQuestions(list) { return (list || []).map(ex => ex.q || '').filter(Boolean); }
    function aiContext() {
      return {
        id, subject: S.name, title: L.title, step,
        theory: (step === 'theory' || step === 'summary') ? theoryPlain() : '',
        questions: step === 'practice' ? exQuestions(L.exercises) : step === 'homework' ? exQuestions(L.homework) : [],
      };
    }

    /* ---------- підсумок ---------- */
    function summaryView() {
      const st = H.statusOf(id); const sc = rec.practice.best;
      let refl = '';
      if (L.reflection && L.reflection.length) refl = `<h3>Для роздумів</h3>${L.reflection.map((q, i) => `<div class="field"><label>${H.md(q)}</label><textarea data-refl="${i}" style="min-height:70px">${H.esc((rec.reflection || {})[i] || '')}</textarea></div>`).join('')}`;
      return `<div class="card"><h2 style="margin-top:0">Підсумок уроку</h2>
        <div class="grid c3"><div class="card" style="margin:0"><small class="muted">Практика</small><div class="big" style="font-size:1.6rem;font-weight:800">${sc != null ? sc + '%' : '—'}</div>${H.starsHTML(sc)}${rec.practice.attempts > 1 ? `<small class="muted">спроб: ${rec.practice.attempts}</small>` : ''}</div>
        <div class="card" style="margin:0"><small class="muted">Домашнє завдання</small><div style="font-weight:800;font-size:1.1rem">${H.hwStatusName(H.hwStatus(rec))}</div>${rec.homework.score != null ? `<small>автоперевірка: ${rec.homework.score}%</small>` : ''}</div>
        <div class="card" style="margin:0"><small class="muted">Час на уроці</small><div style="font-weight:800;font-size:1.1rem">${H.fmtTime(rec.time)}</div><small class="muted">орієнтовно ~${L.minutes} хв</small></div></div>
        ${st === 'done' ? '<p class="notice" style="border-color:var(--ok)">Урок виконано повністю.</p>' : '<p class="notice">Щоб урок зарахувався, потрібно завершити практику і здати домашнє завдання.</p>'}
        ${refl}
        <p style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">${next ? (H.locked(next.id) ? `<button class="btn" disabled title="Відкриється після завершення цього уроку">Наступний урок 🔒</button>` : `<a class="btn" href="${H.lessonURL(next.id)}">Наступний урок ▶</a>`) : ''}<a class="btn sec" href="index.html">📚 До уроків</a><a class="btn ghost" href="subject.html?s=${meta.subject}">Усі уроки предмета</a></p></div>`;
    }

    /* ---------- маршрутизація кроків ---------- */
    function go(s) { step = s; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    function render() {
      let body = step === 'theory' ? theoryView() : step === 'practice' ? exercisesView('practice') : step === 'homework' ? exercisesView('homework') : summaryView();
      root.innerHTML = head() + body + `<div class="card steps-bottom"><small class="muted">Перейти до кроку уроку:</small><div class="steps">${stepButtons()}</div></div>`;
      if (window.AiHelp) window.AiHelp.setContext(aiContext());
      root.querySelectorAll('button[data-step]').forEach(b => b.onclick = () => go(b.dataset.step));
      root.querySelectorAll('button[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
      const td = document.getElementById('theoryDone'); if (td) td.onclick = () => { if (!rec.theory) { rec.theory = Date.now(); finishRedo(); H.progress.set(id, rec); } go('practice'); };
      if (step === 'practice' || step === 'homework') afterRender(step);
      root.querySelectorAll('textarea[data-refl]').forEach(t => t.addEventListener('input', () => { rec.reflection ||= {}; rec.reflection[t.dataset.refl] = t.value; H.progress.set(id, rec); }));
    }
    render();
  }
})();
