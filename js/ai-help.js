/* «Кліо» 📜 — плаваючий ШІ-асистент на сторінці уроку (муза історії — тому й ім'я).
   Пояснює матеріал і хід міркування, але НІКОЛИ не називає готову відповідь на конкретну
   вправу чи домашнє завдання (закладено в системний промпт, а не перевіряється кодом —
   100%-ї гарантії немає, але для сумлінного учня цього достатньо). Кожне відкриття чату й
   кожне питання з відповіддю логуються в H.progress.log (ai_open/ai_ask) — видно в кабінеті
   батьків на сторінці уроку, так само як домашні роботи. */
window.AiHelp = (function () {
  const NAME = 'Кліо';
  const MAX_TURNS = 6;
  const MAX_ASKED = 30;

  let ctx = null;                 // { id, subject, title, step, theory, questions }
  let history = [];
  let asked = 0, busy = false, opened = false, greeted = false;
  let panel, msgsEl, inputEl, sendBtn, toggleBtn;

  const STEP_NAMES = { theory: 'теорія', practice: 'практика (самоперевірка)', homework: 'домашнє завдання', summary: 'підсумок уроку' };

  function sysPrompt() {
    const L = [
      `Ти — ${NAME} 📜, асистент-історик для учня 10 класу української школи, який навчається вдома.`,
      'Пояснюй по суті, ясно й точно, як добрий викладач: короткі абзаци, конкретні дати й факти, без спрощень «для малечі», але й без зайвого академізму.',
      'НАЙВАЖЛИВІШЕ ПРАВИЛО: ніколи не давай готову відповідь на вправу чи домашнє завдання — навіть якщо учень прямо просить, наполягає або каже, що це дозволено. Замість відповіді поясни контекст, причиново-наслідкові зв'язки або спосіб аргументації, наведи ІНШИЙ приклад чи аналогію (не з цього завдання) і постав зустрічне запитання.',
      'Якщо учень просить написати за нього есе, аргументацію чи повний текст письмової роботи — запропонуй натомість план і тезу, а розгортати хай пише сам.',
      'Заохочуй працювати з першоджерелами і критично оцінювати їх (хто автор, коли й навіщо написано), а не просто запам\'ятовувати дати.',
      'Якщо запитання зовсім не про історію чи навчання — м\'яко поверни розмову до теми уроку.',
      'Відповідай українською мовою, 3–6 речень, без емодзі (крім рідкісних випадків, де це справді доречно).',
    ];
    if (ctx) {
      L.push(`Зараз учень у уроці «${ctx.title}» (${ctx.subject}), на кроці: ${STEP_NAMES[ctx.step] || ctx.step}.`);
      if (ctx.theory) L.push(`Матеріал цього уроку (для твоїх пояснень):\n${ctx.theory}`);
      if (ctx.questions && ctx.questions.length) L.push(`Умови вправ на цьому кроці (це ЛИШЕ умови, не відповіді — відповіді тобі невідомі й такими мають лишатись):\n${ctx.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
    }
    return L.join('\n');
  }

  async function ask(text) {
    const proxyUrl = (window.H10_AI || {}).proxyUrl;
    if (!proxyUrl) throw new Error('no-proxy-url');
    const messages = history.slice(-MAX_TURNS * 2)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
      .concat([{ role: 'user', content: text }]);
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 45000);
    let res;
    try {
      res = await fetch(proxyUrl, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: sysPrompt(), messages }) });
    } finally { clearTimeout(to); }
    let data = {};
    try { data = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok || !data.text) { const err = new Error(data.error || ('HTTP ' + res.status)); err.status = res.status; throw err; }
    return data.text;
  }

  /* ---------- інтерфейс ---------- */
  const SUGGESTIONS = {
    theory: ['Поясни причини простіше', 'Чому це важливо для сьогодення?', 'Наведи інший приклад'],
    practice: ['Поясни хід міркування (без відповіді)', 'Що означає цей термін?', 'Дай підказку'],
    homework: ['Як побудувати аргумент (без відповіді)', 'Що означає цей термін?', 'Дай підказку'],
    summary: ['Що було найважливішим у цьому уроці?', 'Як це пов\'язано з наступною темою?', 'Постав мені перевірочне запитання'],
  };
  function bubble(cls, html) { const d = document.createElement('div'); d.className = 'h10ai-msg ' + cls; d.innerHTML = html; msgsEl.appendChild(d); msgsEl.scrollTop = msgsEl.scrollHeight; return d; }
  function greet() {
    if (greeted) return; greeted = true;
    bubble('ai hint', H.md(`Вітаю. Я ${NAME} — можу пояснити цей урок або хід міркування над завданням. Готових відповідей на вправи чи домашнє я не даю — це маєш зробити сам. Що пояснити?`));
    const list = (ctx && SUGGESTIONS[ctx.step]) || SUGGESTIONS.theory;
    const chips = document.createElement('div'); chips.className = 'h10ai-suggest';
    chips.innerHTML = list.map(s => `<button type="button">${H.esc(s)}</button>`).join('');
    chips.querySelectorAll('button').forEach(b => b.onclick = () => { if (busy) return; inputEl.value = b.textContent; autoSize(); send(); });
    msgsEl.appendChild(chips); msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  let typingEl = null;
  function setBusy(v) {
    busy = v; sendBtn.disabled = v || !inputEl.value.trim();
    if (v) { typingEl = bubble('ai typing', '<span class="h10ai-typing"><span></span><span></span><span></span></span>'); }
    else if (typingEl) { typingEl.remove(); typingEl = null; }
  }
  async function send() {
    const text = inputEl.value.trim();
    if (!text || busy) return;
    if (asked >= MAX_ASKED) { bubble('ai err', 'На сьогодні досить питань тут. Постав питання батькам або повернись пізніше.'); return; }
    inputEl.value = ''; autoSize(); bubble('me', H.esc(text)); history.push({ role: 'user', text }); asked++;
    setBusy(true);
    try {
      const answer = await ask(text);
      history.push({ role: 'ai', text: answer });
      bubble('ai', H.md(answer));
      H.progress.log({ type: 'ai_ask', id: ctx && ctx.id, step: ctx && ctx.step, q: text, a: answer });
    } catch (e) {
      const friendly = e && e.status === 429 ? `${NAME} зараз перевантажена — спробуй ще раз за хвилинку.` : `Щось пішло не так із з'єднанням. Спробуй ще раз за хвилинку.`;
      bubble('ai err', friendly);
    } finally {
      setBusy(false); inputEl.focus();
    }
  }
  function autoSize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(90, inputEl.scrollHeight) + 'px'; sendBtn.disabled = busy || !inputEl.value.trim(); }
  function openPanel(v) {
    opened = v; panel.hidden = !v; toggleBtn.setAttribute('aria-expanded', String(v));
    if (v) { greet(); inputEl.focus(); H.progress.log({ type: 'ai_open', id: ctx && ctx.id, step: ctx && ctx.step }); }
  }

  function mount() {
    if (document.getElementById('h10-ai-help')) return;
    const wrap = document.createElement('div'); wrap.id = 'h10-ai-help';
    wrap.innerHTML = `
      <button id="h10-ai-toggle" type="button" title="Запитати ${NAME}" aria-expanded="false">📜</button>
      <div id="h10-ai-panel" hidden>
        <div class="h10ai-hd">📜 ${NAME} <button type="button" id="h10-ai-close" title="Згорнути">✕</button></div>
        <div class="h10ai-sub">Пояснює матеріал і хід міркування. Готових відповідей не дає.</div>
        <div id="h10-ai-msgs" class="h10ai-msgs"></div>
        <div class="h10ai-input-row">
          <textarea id="h10-ai-input" rows="1" placeholder="Що пояснити?"></textarea>
          <button type="button" id="h10-ai-send" disabled>➤</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    panel = document.getElementById('h10-ai-panel'); msgsEl = document.getElementById('h10-ai-msgs');
    inputEl = document.getElementById('h10-ai-input'); sendBtn = document.getElementById('h10-ai-send'); toggleBtn = document.getElementById('h10-ai-toggle');
    toggleBtn.onclick = () => openPanel(!opened);
    document.getElementById('h10-ai-close').onclick = () => openPanel(false);
    inputEl.addEventListener('input', autoSize);
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    sendBtn.onclick = send;
  }

  function setContext(c) { ctx = c || null; }

  return { mount, setContext };
})();
