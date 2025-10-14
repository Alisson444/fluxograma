// Mostrar telas
function mostrarTela(tela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
  document.getElementById(tela).classList.add('active');
  if (tela === 'agenda') carregarAgenda();
}

// Carregar tarefas do localStorage
function obterTarefas() {
  return JSON.parse(localStorage.getItem('tasks')) || [];
}

// Salvar tarefas
function salvarTarefas(tasks) {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Exibir agenda
function carregarAgenda() {
  const agendaContainer = document.getElementById('agenda-container');
  const tasks = obterTarefas();
  const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

  agendaContainer.innerHTML = '';

  dias.forEach(dia => {
    const div = document.createElement('div');
    div.classList.add('dia');
    const titulo = document.createElement('h3');
    titulo.textContent = dia;
    div.appendChild(titulo);

    const lista = document.createElement('ul');
    const tarefasDia = tasks.filter(t => t.dia === dia);

    if (tarefasDia.length === 0) {
      lista.innerHTML = '<li><span style="color:#aaa;">Nenhuma tarefa</span></li>';
    } else {
      tarefasDia.forEach((task, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span><strong>${task.materia}</strong> - ${task.hora}</span>
          <div>
            <button class="editar" onclick="editarTarefa(${tasks.indexOf(task)})">Editar</button>
            <button class="excluir" onclick="excluirTarefa(${tasks.indexOf(task)})">Excluir</button>
          </div>
        `;
        lista.appendChild(li);
      });
    }

    div.appendChild(lista);
    agendaContainer.appendChild(div);
  });
}

// Adicionar tarefa
document.getElementById('task-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const materia = document.getElementById('materia').value.trim();
  const dia = document.getElementById('dia').value;
  const hora = document.getElementById('hora').value;

  if (!materia || !dia || !hora) return alert('Preencha todos os campos!');

  const tasks = obterTarefas();
  tasks.push({ materia, dia, hora });
  salvarTarefas(tasks);

  alert('✅ Tarefa adicionada com sucesso!');
  this.reset();
  mostrarTela('agenda');
});

// Editar tarefa
function editarTarefa(index) {
  const tasks = obterTarefas();
  const task = tasks[index];

  if (!task) return;

  const novaMateria = prompt('Editar matéria:', task.materia);
  const novaHora = prompt('Editar horário (HH:MM):', task.hora);

  if (novaMateria && novaHora) {
    task.materia = novaMateria;
    task.hora = novaHora;
    salvarTarefas(tasks);
    carregarAgenda();
    alert('✏️ Tarefa atualizada!');
  }
}

// Excluir tarefa
function excluirTarefa(index) {
  const tasks = obterTarefas();
  if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
    tasks.splice(index, 1);
    salvarTarefas(tasks);
    carregarAgenda();
    alert('🗑️ Tarefa excluída.');
  }
}

// Atualiza a agenda automaticamente ao carregar
window.onload = () => carregarAgenda();
