// Inicializa ícones
lucide.createIcons();

// Adiciona animações e interatividade
const nodes = document.querySelectorAll('.node');
const svg = document.getElementById('fluxo-linhas');
const resetBtn = document.getElementById('resetBtn');

// Desenha linhas entre os blocos (simples horizontal)
function desenharLinhas() {
  svg.innerHTML = '';
  const rects = Array.from(nodes).map(n => n.getBoundingClientRect());
  for (let i = 0; i < rects.length - 1; i++) {
    const x1 = rects[i].right - rects[0].left + 10;
    const y1 = 50;
    const x2 = rects[i + 1].left - rects[0].left - 10;
    const y2 = 50;
    const linha = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-width="2" marker-end="url(#arrow)" />`;
    svg.innerHTML += linha;
  }
  svg.innerHTML += `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#888"/></marker></defs>`;
}

// Ao clicar em um nó, destaque
nodes.forEach(n => {
  n.addEventListener('click', () => {
    n.classList.add('ativo');
    n.style.transform = 'scale(1.05)';
    setTimeout(() => (n.style.transform = 'scale(1)'), 500);
  });
});

// Botão reset
resetBtn.addEventListener('click', () => {
  nodes.forEach(n => n.classList.remove('ativo'));
  svg.innerHTML = '';
  desenharLinhas();
});

// Recalcula linhas quando a página carrega
window.addEventListener('load', desenharLinhas);
window.addEventListener('resize', desenharLinhas);
