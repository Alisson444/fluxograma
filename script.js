// ============================
// Taskly - script.js
// ============================

// ============================
// Variáveis Globais
// ============================
let currentScreen = 'home';
let tasks = []; // array localStorage
let theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);

// ============================
// Helpers
// ============================
function qs(selector) { return document.querySelector(selector); }
function qsa(selector) { return document.querySelectorAll(selector); }

// ============================
// Troca de Tela
// ============================
function mostrarTela(screen) {
  qsa('.screen').forEach(s => s.classList.remove('active'));
  qs('#' + screen).classList.add('active');
  currentScreen = screen;
}

// ============================
// Tema Claro/Escuro
// ============================
qs('#theme-toggle').addEventListener('click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

// ============================
// CRUD LocalStorage
// ============================
function obterTarefas() {
  return JSON.parse(localStorage.getItem('tasks')) || [];
}

function salvarTarefas(t) {
  localStorage.setItem('tasks', JSON.stringify(t));
  tasks = t;
  carregarAgenda();
}

function adicionarTarefa(task) {
  task.id = task.id || new Date().toISOString();
  task.createdAt = task.createdAt || new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  tasks.push(task);
  salvarTarefas(tasks);
}

function editarTarefa(index, newTask) {
  newTask.updatedAt = new Date().toISOString();
  tasks[index] = newTask;
  salvarTarefas(tasks);
}

function excluirTarefa(index) {
  tasks.splice(index, 1);
  salvarTarefas(tasks);
}

// ============================
// Formulário de Tarefas
// ============================
qs('#task-form').addEventListener('submit', e => {
  e.preventDefault();
  const materia = qs('#materia').value;
  const dia = qs('#dia').value;
  const hora = qs('#hora').value;
  const cor = qs('#cor').value;
  const lembrete = parseInt(qs('#lembrete').value) || 10;

  adicionarTarefa({ materia, dia, hora, cor, lembrete, completed: false });
  alert('✅ Tarefa adicionada!');
  mostrarTela('home');
  qs('#task-form').reset();
});

// ============================
// Carregar Agenda
// ============================
function carregarAgenda() {
  tasks = obterTarefas();
  const agendaContainer = qs('#agenda-container');
  agendaContainer.innerHTML = '';

  const dias = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira'];
  dias.forEach(dia => {
    const diaDiv = document.createElement('div');
    diaDiv.classList.add('dia');
    const h2 = document.createElement('h2');
    h2.textContent = dia;
    diaDiv.appendChild(h2);

    const ul = document.createElement('ul');
    tasks.filter(t => t.dia === dia).forEach((t, i) => {
      const li = document.createElement('li');
      li.style.borderLeft = `6px solid ${t.cor}`;
      li.innerHTML = `
        ${t.materia} - ${t.hora} 
        <span>
          <button class="editar" onclick="editarTarefaPrompt(${i})">✏️</button>
          <button class="excluir" onclick="excluirTarefa(${i})">🗑️</button>
        </span>
      `;
      ul.appendChild(li);
    });

    diaDiv.appendChild(ul);
    agendaContainer.appendChild(diaDiv);
  });
}

// Prompt simples para editar tarefa
function editarTarefaPrompt(index) {
  const t = tasks[index];
  const materia = prompt('Matéria', t.materia) || t.materia;
  const dia = prompt('Dia', t.dia) || t.dia;
  const hora = prompt('Hora', t.hora) || t.hora;
  const cor = prompt('Cor (hex)', t.cor) || t.cor;
  const lembrete = parseInt(prompt('Lembrete (min)', t.lembrete)) || t.lembrete;

  editarTarefa(index, {...t, materia, dia, hora, cor, lembrete});
}

// ============================
// Export / Import JSON
// ============================
qs('#export-btn').addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  dl.setAttribute('download', 'tasks.json');
  dl.click();
});

qs('#import-btn').addEventListener('click', () => qs('#import-file').click());
qs('#import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const imported = JSON.parse(ev.target.result);
    tasks = tasks.concat(imported);
    salvarTarefas(tasks);
  }
  reader.readAsText(file);
});

// ============================
// Notificações
// ============================
qs('#notify-perm').addEventListener('click', async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if(permission === 'granted') alert('🔔 Notificações ativadas!');
  }
});

// ============================
// Firebase + Google Login
// ============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, enableIndexedDbPersistence, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Substitua com seu config Firebase
const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI.firebaseapp.com",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>console.warn('Offline persistence não disponível'));

const provider = new GoogleAuthProvider();

// Botões login/logout
qs('#login-btn').addEventListener('click', () => signInWithPopup(auth, provider).catch(err=>alert(err)));
qs('#logout-btn').addEventListener('click', () => signOut(auth).catch(err=>alert(err)));

// Observa login
let unsubscribeCloud = null;
onAuthStateChanged(auth, user => {
  if(user) {
    qs('#login-btn').style.display='none';
    qs('#user-info').style.display='inline-flex';
    qs('#user-name').textContent = user.displayName;
    qs('#user-photo').src = user.photoURL;
    startCloudSync(user.uid);
  } else {
    qs('#login-btn').style.display='inline-block';
    qs('#user-info').style.display='none';
    if(unsubscribeCloud) unsubscribeCloud();
  }
});

// ============================
// Firebase Sync
// ============================
function startCloudSync(uid) {
  const tasksRef = collection(db, `users/${uid}/tasks`);

  // 1) merge inicial local -> cloud
  getDocs(tasksRef).then(snapshot => {
    const cloud = snapshot.docs.map(d=>d.data());
    const merged = mergeTasks(tasks, cloud);
    salvarTarefas(merged);
    merged.forEach(t => writeTaskDoc(uid, t));
  });

  // 2) realtime cloud -> local
  unsubscribeCloud = onSnapshot(tasksRef, snap => {
    const cloud = snap.docs.map(d=>d.data());
    const merged = mergeTasks(tasks, cloud);
    salvarTarefas(merged);
  });
}

function mergeTasks(local, cloud) {
  const map = {};
  local.concat(cloud).forEach(t=>map[t.id]=t);
  return Object.values(map);
}

async function writeTaskDoc(uid, task){
  await setDoc(doc(db, `users/${uid}/tasks`, task.id), {...task, updatedAt:new Date().toISOString()});
}

// ============================
// Inicial
// ============================
window.addEventListener('load', ()=>{
  tasks = obterTarefas();
  carregarAgenda();

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').then(()=>console.log('SW registrado'));
  }
});
