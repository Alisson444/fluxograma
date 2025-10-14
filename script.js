/* ===========================
  Taskly - script.js
  Melhorias: dark mode, concluir, notificações (local), export/import, search, cores por matéria.
  Observação: Notifications funcionam em HTTPS / localhost.
============================ */

const diasSemana = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];

// ---------------- utilitários ----------------
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const load = k => JSON.parse(localStorage.getItem(k) || 'null');

// nextDateForWeekday: dado nome do dia "Segunda-feira" e horário "HH:MM", retorna Date da próxima ocorrência
function nextDateForWeekday(dayName, timeHHMM) {
  const today = new Date();
  const hourMin = timeHHMM.split(':').map(n=>parseInt(n,10));
  const targetWeekday = diasSemana.indexOf(dayName);
  if (targetWeekday === -1) return null;
  const daysAhead = (targetWeekday - today.getDay() + 7) % 7;
  const candidate = new Date(today);
  candidate.setDate(today.getDate() + daysAhead);
  candidate.setHours(hourMin[0], hourMin[1], 0, 0);
  // if candidate is earlier than now (same day but time passed), schedule for next week
  if (candidate <= new Date()) candidate.setDate(candidate.getDate() + 7);
  return candidate;
}

// scheduleNotification: calcula ms e faz setTimeout
const scheduledTimers = [];
function scheduleNotification(task, idx) {
  // Only schedule if Notification permission granted
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const when = nextDateForWeekday(task.dia, task.hora);
  if (!when) return;
  const minutesBefore = parseInt(task.lembreteMin || 10, 10) || 0;
  const notifyAt = new Date(when.getTime() - minutesBefore * 60000);
  const now = new Date();
  const ms = notifyAt - now;
  if (ms <= 0 || ms > 1000 * 60 * 60 * 24 * 365) return; // ignore past or insanely far
  const t = setTimeout(()=> {
    const title = `⏰ Lembrete: ${task.materia}`;
    const body = `${task.dia} • ${task.hora} (${minutesBefore} min)`;
    new Notification(title, { body });
  }, ms);
  scheduledTimers.push(t);
}

// cancelScheduledTimers: limpar timers ao recarregar agenda
function cancelScheduledTimers(){ scheduledTimers.forEach(t => clearTimeout(t)); scheduledTimers.length = 0; }

// ----------------- armazenamento -----------------
function obterTarefas(){
  return load('tasks') || [];
}
function salvarTarefas(tasks){
  save('tasks', tasks);
}

// ----------------- tema -----------------
function initTheme(){
  const saved = localStorage.getItem('theme') || 'auto';
  if (saved === 'dark') document.documentElement.setAttribute('data-theme','dark');
  if (saved === 'light') document.documentElement.removeAttribute('data-theme');
  // button hookup
  qs('#theme-toggle').addEventListener('click', ()=>{
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','light'); }
    else { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); }
  });
}

// ----------------- UI Navegação -----------------
function mostrarTela(id){
  qsa('.screen').forEach(s => s.classList.remove('active'));
  qs(`#${id}`).classList.add('active');
  // update agenda when opening it
  if (id === 'agenda') carregarAgenda();
}

// bottom menu
qsa('.menu-btn').forEach(b => b.addEventListener('click', ()=> mostrarTela(b.dataset.screen)));


// ----------------- Form / CRUD -----------------
function resetForm(){
  qs('#task-form').reset();
  qs('#task-index').value = -1;
  mostrarTela('home');
}

qs('#task-form').addEventListener('submit', function(e){
  e.preventDefault();
  const idx = parseInt(qs('#task-index').value,10);
  const materia = qs('#materia').value.trim();
  const cor = qs('#cor').value || '#4CAF50';
  const dia = qs('#dia').value;
  const hora = qs('#hora').value;
  const lembreteMin = parseInt(qs('#lembrete-min').value,10) || 10;

  if (!materia || !hora || !dia) return alert('Preencha todos os campos!');

  const tasks = obterTarefas();
  if (idx >= 0 && idx < tasks.length){
    tasks[idx] = { ...tasks[idx], materia, cor, dia, hora, lembreteMin };
    alert('✏️ Tarefa atualizada!');
  } else {
    tasks.push({ materia, cor, dia, hora, lembreteMin, completed:false, createdAt: new Date().toISOString() });
    alert('✅ Tarefa adicionada!');
  }
  salvarTarefas(tasks);
  resetForm();
  carregarAgenda();
});

// Editar
function abrirEdicao(index){
  const tasks = obterTarefas();
  const t = tasks[index];
  if (!t) return;
  qs('#task-index').value = index;
  qs('#materia').value = t.materia;
  qs('#cor').value = t.cor || '#4CAF50';
  qs('#dia').value = t.dia;
  qs('#hora').value = t.hora;
  qs('#lembrete-min').value = t.lembreteMin || 10;
  mostrarTela('adicionar-tarefa');
}

// Excluir
function excluirTarefa(index){
  if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
  const tasks = obterTarefas();
  tasks.splice(index,1);
  salvarTarefas(tasks);
  carregarAgenda();
}

// Toggle completar
function toggleCompletar(index, checked){
  const tasks = obterTarefas();
  if (!tasks[index]) return;
  tasks[index].completed = !!checked;
  tasks[index].completedAt = tasks[index].completed ? new Date().toISOString() : null;
  salvarTarefas(tasks);
  carregarAgenda();
}

// ----------------- Render agenda -----------------
function carregarAgenda(filterText = ''){
  cancelScheduledTimers();
  const tasks = obterTarefas();
  const container = qs('#agenda-container');
  container.innerHTML = '';

  // build days order Mon-Sun (or keep starting Sunday?)
  const daysOrder = ["Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado","Domingo"];
  daysOrder.forEach(day => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-card card';
    const title = document.createElement('h3');
    title.textContent = day;
    dayDiv.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'task-list';

    const tasksDoDia = tasks
      .map((t,i)=> ({...t, __idx:i}))
      .filter(t => t.dia === day)
      .filter(t => t.materia.toLowerCase().includes(filterText.toLowerCase()));

    if (tasksDoDia.length === 0){
      const p = document.createElement('div');
      p.style.color = 'var(--muted)';
      p.textContent = 'Nenhuma tarefa';
      dayDiv.appendChild(p);
    } else {
      tasksDoDia.sort((a,b)=> a.hora.localeCompare(b.hora));
      tasksDoDia.forEach(t => {
        const li = renderTaskItem(t);
        ul.appendChild(li);
        // schedule notification for each task
        scheduleNotification(t, t.__idx);
      });
      dayDiv.appendChild(ul);
    }
    container.appendChild(dayDiv);
  });

  // stats
  updateStats(tasks);
}

// renderTaskItem: cria LI com template
function renderTaskItem(task){
  const tpl = qs('#task-template').content.cloneNode(true);
  const li = tpl.querySelector('li');
  const checkbox = li.querySelector('.complete-checkbox');
  const subjectSpan = li.querySelector('.label-subject');
  const timeSpan = li.querySelector('.label-time');
  const daySpan = li.querySelector('.label-day');
  const editBtn = li.querySelector('.btn-edit');
  const delBtn = li.querySelector('.btn-delete');

  subjectSpan.textContent = task.materia;
  subjectSpan.style.background = task.cor || '#4CAF50';
  timeSpan.textContent = `• ${task.hora}`;
  daySpan.textContent = task.dia;

  checkbox.checked = !!task.completed;
  if (task.completed) li.classList.add('completed');

  const idx = task.__idx;
  checkbox.addEventListener('change', (e)=> toggleCompletar(idx, e.target.checked));
  editBtn.addEventListener('click', ()=> abrirEdicao(idx));
  delBtn.addEventListener('click', ()=> excluirTarefa(idx));

  return li;
}

// ----------------- search -----------------
qs('#search').addEventListener('input', (e)=> {
  carregarAgenda(e.target.value);
});

// ----------------- export / import -----------------
qs('#export-btn').addEventListener('click', ()=> {
  const data = JSON.stringify(obterTarefas(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskly-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

qs('#import-btn').addEventListener('click', ()=> qs('#import-file').click());
qs('#import-file').addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('Formato inválido');
      if (!confirm('Importar irá substituir suas tarefas atuais. Continuar?')) return;
      salvarTarefas(imported);
      carregarAgenda();
      alert('Importação concluída!');
    } catch (err) {
      alert('Erro ao importar: ' + err.message);
    }
  };
  reader.readAsText(f);
});

// ----------------- notifications permission -----------------
qs('#notify-perm').addEventListener('click', async ()=>{
  if (!("Notification" in window)) return alert('Notificações não são suportadas neste navegador.');
  const perm = await Notification.requestPermission();
  if (perm === 'granted') alert('🔔 Permissão concedida! Notificações locais serão exibidas quando for hora.');
  else alert('Permissão negada ou bloqueada.');
});

// update stats
function updateStats(tasks){
  const total = tasks.length;
  const done = tasks.filter(t=>t.completed).length;
  const upcoming = tasks.filter(t => !t.completed).length;
  qs('#stats-text').textContent = `Total: ${total} • Concluídas: ${done} • Pendentes: ${upcoming}`;
}

// on load
window.addEventListener('load', ()=>{
  initTheme();

  // restore search state
  const searchEl = qs('#search');
  const initialSearch = searchEl.value || '';
  carregarAgenda(initialSearch);

  // set up keyboard: "/" focar busca
  window.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
      e.preventDefault();
      qs('#search').focus();
    }
  });

  // if the page is visible again, update agenda / re-schedule
  document.addEventListener('visibilitychange', ()=> {
    if (document.visibilityState === 'visible') carregarAgenda(qs('#search').value);
  });
});
