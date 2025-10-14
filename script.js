// Função para mostrar as telas
function mostrarTela(tela) {
  // Esconde todas as telas
  document.querySelectorAll('.home, .adicionar-tarefa, .agenda').forEach(function(t) {
    t.classList.remove('active');
  });

  // Mostra a tela selecionada
  document.getElementById(tela).classList.add('active');
}

// Função para carregar e exibir as tarefas na agenda
window.onload = function() {
  carregarAgenda();
};

// Função para carregar as tarefas e exibir na tela de agenda
function carregarAgenda() {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const agendaContainer = document.getElementById('agenda-container');

  const diasDaSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  let agenda = {};

  // Inicializa o objeto agenda com dias vazios
  diasDaSemana.forEach(dia => {
    agenda[dia] = [];
  });

  // Adiciona as tarefas nos dias corretos
  tasks.forEach(task => {
    agenda[task.dia].push(task);
  });

  // Exibe as tarefas organizadas
  agendaContainer.innerHTML = "";  // Limpa a agenda antes de atualizar

  diasDaSemana.forEach(dia => {
    const diaDiv = document.createElement('div');
    diaDiv.classList.add('dia');

    const diaTitulo = document.createElement('h2');
    diaTitulo.textContent = dia;
    diaDiv.appendChild(diaTitulo);

    const listaTarefas = document.createElement('ul');
    agenda[dia].forEach((task, index) => {
      const li = document.createElement('li');
      li.innerHTML = `${task.materia} - ${task.hora} 
                      <button class="editar" onclick="editarTarefa(${index})">Editar</button>
                      <button class="excluir" onclick="excluirTarefa(${index})">Excluir</button>`;
      listaTarefas.appendChild(li);
    });

    diaDiv.appendChild(listaTarefas);
    agendaContainer.appendChild(diaDiv);
  });
}

// Função para salvar a tarefa no localStorage
document.getElementById('task-form').addEventListener('submit', function(event) {
  event.preventDefault();

  const materia = document.getElementById('materia').value;
  const dia = document.getElementById('dia').value;
  const hora = document.getElementById('hora').value;

  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  tasks.push({ materia, dia, hora });

  localStorage.setItem('tasks', JSON.stringify(tasks));

  alert('Tarefa adicionada com sucesso!');
  mostrarTela('home');  // Redireciona de volta à tela inicial
  carregarAgenda(); // Atualiza a agenda
});

// Função para editar uma tarefa
function editarTarefa(index) {
  const tasks = JSON.parse(localStorage.getItem('tasks'));
  const task = tasks[index];

  document.get
