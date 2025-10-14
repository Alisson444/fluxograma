/* =========================
  Firebase Sync + Auth (Google)
  Cole este bloco NO FINAL do script.js (após as funções existentes).
  Substitua FIREBASE_CONFIG com seu objeto firebaseConfig do console.
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  enableIndexedDbPersistence,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

/* ===== CONFIGURE AQUI: cole seu firebaseConfig (do painel Firebase) ===== */
const FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI.firebaseapp.com",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};
/* ======================================================================= */

let firebaseApp, auth, db;
function initFirebase() {
  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    // Tentar habilitar persistência offline (IndexedDB) para Firestore
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn('IndexedDB persistence error:', err && err.code ? err.code : err);
    });

    hookupAuthButtons();
    console.log('Firebase inicializado.');
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
  }
}

/* ---------- Autenticação ---------- */
const provider = new GoogleAuthProvider();

function hookupAuthButtons() {
  qs('#login-btn').addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged cuidará do resto
    } catch (err) {
      alert('Erro no login: ' + err.message);
    }
  });

  qs('#logout-btn').addEventListener('click', async () => {
    await fbSignOut(auth);
    // localStorage permanece — você pode limpar se quiser
    alert('🔒 Você saiu.');
  });

  // Monitor de estado de autenticação
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Mostrar user UI
      qs('#login-btn').style.display = 'none';
      qs('#user-info').style.display = 'inline-flex';
      qs('#user-name').textContent = user.displayName || user.email;
      qs('#user-photo').src = user.photoURL || '';

      // Iniciar sincronização
      startRealtimeSync(user.uid);
    } else {
      qs('#login-btn').style.display = 'inline-block';
      qs('#user-info').style.display = 'none';
      stopRealtimeSync();
    }
  });
}

/* ---------- Sincronização com Firestore ---------- */
/*
Estratégia:
- Coleção: users/{uid}/tasks
- Cada tarefa é um documento com ID gerado a partir de createdAt ou um uuid.
- Ao conectar:
  1) Pegar local tasks (localStorage)
  2) Puxar snapshot atual da nuvem
  3) Fazer merge por createdAt/updatedAt (manter versão mais recente)
  4) Subscribir onSnapshot para refletir mudanças da nuvem localmente
  5) Monitorar mudanças locais e enviar para a nuvem (debounced)
*/

let cloudUnsubscribe = null;
let cloudWriteDebounce = null;
const DEBOUNCE_MS = 800;

function tasksCollectionRef(uid) {
  return collection(db, `users/${uid}/tasks`);
}

// Converte array tasks em map por id (id = createdAt ou índice)
function tasksArrayToMap(tasks) {
  const map = {};
  tasks.forEach(t => {
    const id = t.id || t.createdAt || (t.materia + '::' + t.dia + '::' + t.hora);
    map[id] = { ...t, id };
  });
  return map;
}
function tasksMapToArray(map) {
  return Object.values(map);
}

// Basic helper para gravar/atualizar doc individual
async function writeTaskDoc(uid, task) {
  // doc id = task.id (recomendo sempre ter id)
  const id = task.id || task.createdAt || (task.materia + '::' + task.dia + '::' + task.hora);
  // garante timestamp/updatedAt
  const data = { ...task, id, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, `users/${uid}/tasks`, id), data);
}

// Remove doc
async function deleteTaskDoc(uid, id){
  await deleteDoc(doc(db, `users/${uid}/tasks`, id));
}

/* Merge entre local e cloud:
   - localTasks: array do localStorage
   - cloudDocs: array de docs da nuvem
   Mantemos a versão mais recente por campo updatedAt (ou createdAt se não existir).
*/
function mergeTasks(localTasks, cloudDocs) {
  const localMap = tasksArrayToMap(localTasks || []);
  const cloudMap = tasksArrayToMap(cloudDocs || []);

  // Une chaves
  const keys = new Set([...Object.keys(localMap), ...Object.keys(cloudMap)]);
  const merged = {};

  keys.forEach(k => {
    const l = localMap[k];
    const c = cloudMap[k];
    if (l && c) {
      const lu = l.updatedAt || l.createdAt || null;
      const cu = c.updatedAt || c.createdAt || null;
      // preferir o mais recente (comparing ISO strings)
      if (!lu && !cu) {
        merged[k] = { ...c, id: k };
      } else if (!cu) {
        merged[k] = { ...l, id: k };
      } else if (!lu) {
        merged[k] = { ...c, id: k };
      } else {
        merged[k] = (lu >= cu) ? { ...l, id: k } : { ...c, id: k };
      }
    } else if (l) {
      merged[k] = { ...l, id: k };
    } else if (c) {
      merged[k] = { ...c, id: k };
    }
  });

  return tasksMapToArray(merged);
}

/* Inicia sincronização em tempo real para um usuário */
function startRealtimeSync(uid) {
  // 1) Pegar dados locais
  const local = obterTarefas() || [];

  // 2) Pegar snapshot inicial da nuvem (one-time) e merge
  (async () => {
    // pegar docs atuais
    const snap = await getDocs(tasksCollectionRef(uid));
    const cloudDocs = snap.docs.map(d => d.data());
    // merge
    const merged = mergeTasks(local, cloudDocs);
    // salvar localmente
    salvarTarefas(merged);
    carregarAgenda();

    // Push merged to cloud (write missing/updated docs)
    merged.forEach(async (t) => {
      try {
        await writeTaskDoc(uid, t);
      } catch (err) {
        console.warn('Erro ao gravar doc merged:', err);
      }
    });

    // subscribe real-time after merge
    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = onSnapshot(tasksCollectionRef(uid), (qsnap) => {
      const cloud = qsnap.docs.map(d => d.data());
      // merge cloud + local again and update localStorage
      const nowLocal = obterTarefas();
      const mergedNow = mergeTasks(nowLocal, cloud);
      salvarTarefas(mergedNow);
      carregarAgenda();
    }, (err) => {
      console.warn('Snapshot error:', err);
    });
  })();

  // 3) Observa mudanças locais (localStorage) e escreve na nuvem (debounced)
  // Para isso interceptamos salvarTarefas: criaremos um observer simples usando setInterval
  // Simples approach: poll localStorage a cada 2s e push diferenças
  let lastLocalSerialized = JSON.stringify(local);
  const pollInterval = 2000;
  const poller = setInterval(async () => {
    const current = JSON.stringify(obterTarefas());
    if (current !== lastLocalSerialized) {
      lastLocalSerialized = current;
      // escrever cada tarefa na nuvem
      const tasks = obterTarefas();
      // Debounce writes
      if (cloudWriteDebounce) clearTimeout(cloudWriteDebounce);
      cloudWriteDebounce = setTimeout(async () => {
        try {
          for (const t of tasks) {
            await writeTaskDoc(uid, t);
          }
          // Optionally delete cloud docs removed locally (if you want)
          // For safety, we don't auto-delete here.
        } catch (err) {
          console.warn('Erro escrevendo tarefas para a nuvem:', err);
        }
      }, DEBOUNCE_MS);
    }
  }, pollInterval);

  // Guardar referência para parar depois
  startRealtimeSync._poller = poller;
}

/* Para a sincronização quando usuário desloga */
function stopRealtimeSync() {
  if (cloudUnsubscribe) { cloudUnsubscribe(); cloudUnsubscribe = null; }
  if (startRealtimeSync._poller) { clearInterval(startRealtimeSync._poller); startRealtimeSync._poller = null; }
}

/* ---------- Inicialização Firebase no carregamento ---------- */
window.addEventListener('load', () => {
  // só inicializa se FIREBASE_CONFIG preenchido
  const ready = FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId;
  if (!ready) {
    console.warn('Firebase config não preenchido. Pule a integração ou cole o firebaseConfig.');
    return;
  }
  initFirebase();
});
