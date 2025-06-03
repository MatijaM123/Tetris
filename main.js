// ======== platno i skaliranje platna ========
// ======== platno tetrisa ========
const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(canvas.width / 12, canvas.height / 20);
}


window.addEventListener("resize", resizeCanvas);
resizeCanvas(); 
window.addEventListener("resize", crtajSacuvanuKockicuResize);
window.addEventListener("resize", crtajSledecuKockicuResize);
function crtajSacuvanuKockicuResize(){
  crtajSacuvanuKockicu(sacuvanaKockica)
}
function crtajSledecuKockicuResize(){
  crtajSledecuKockicu(sledecaKockica)
}
// ======== varijable za igru ========
let isRunning = false;
let gameOver = false;
let brojPostavljenihBlokova = 0;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let highScore = 0;

// ======== tetris kockice ========
function napraviMatricu(w, h) {
  const matrica = [];
  while (h--) {
    matrica.push(new Array(w).fill(0));
  }
  return matrica;
}

function napraviKockicu(type) {
  switch (type) {
    case "T":
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
    case "O":
      return [
        [2, 2],
        [2, 2],
      ];
    case "L":
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ];
    case "J":
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
      ];
    case "I":
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    case "S":
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case "Z":
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
  }
}

// ======== arena i preklapanje ========
const arena = napraviMatricu(12, 20);

function preklapanje(arena, igrac) {
  const [m, o] = [igrac.matrica, igrac.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function spoji(arena, igrac) {
  igrac.matrica.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + igrac.pos.y][x + igrac.pos.x] = value;
      }
    });
  });
}

function arenaSweep() {
  let brojRedova = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    brojRedova++;
  }

  if (brojRedova > 0) {
    const poeni = scoreTable[brojRedova] || brojRedova * 1000;
    updateScore(poeni);
    prikažiCestitku(brojRedova, poeni);
    sounds.line.play();
  }
}

// ======== igrac ========
const igrac = {
  pos: { x: 0, y: 0 },
  matrica: null,
  score: 0,
};

let sledecaKockica = null;
const kockice = "TJLOSZI";

function igracReset() {
  igrac.matrica = sledecaKockica;
  iskoristenHold = false;
  sledecaKockica = napraviKockicu(kockice[Math.floor(Math.random() * kockice.length)]);
  igrac.pos.y = 0;
  igrac.pos.x =
    ((arena[0].length / 2) | 0) - ((igrac.matrica[0].length / 2) | 0);
  crtajSledecuKockicu(sledecaKockica);
  if (preklapanje(arena, igrac)) {
    isRunning = false;
    gameOver = true;
    if(highScore < igrac.score)
      highScore = igrac.score;
    document.getElementById("highScore").textContent = highScore;
    gameOverSound();
    document.getElementById("gameOverScreen").style.display = "block";
  }
}

function igracSpustanje() {
  igrac.pos.y++;
  if (preklapanje(arena, igrac)) {
    igrac.pos.y--;
    spoji(arena, igrac);
    brojPostavljenihBlokova++;
    if (brojPostavljenihBlokova % 10 === 0 && dropInterval > 200) {
      dropInterval -= 50;
    }
    igracReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function igracPomeranje(dir) {
  igrac.pos.x += dir;
  if (preklapanje(arena, igrac)) {
    igrac.pos.x -= dir;
  }
}

function igracRotiranje(dir) {
  const pos = igrac.pos.x;
  let offset = 1;
  rotiraj(igrac.matrica, dir);
  while (preklapanje(arena, igrac)) {
    igrac.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > igrac.matrica[0].length) {
      rotiraj(igrac.matrica, -dir);
      igrac.pos.x = pos;
      return;
    }
  }
}

function rotiraj(matrica, dir) {
  for (let y = 0; y < matrica.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrica[x][y], matrica[y][x]] = [matrica[y][x], matrica[x][y]];
    }
  }
  if (dir > 0) {
    matrica.forEach((row) => row.reverse());
  } else {
    matrica.reverse();
  }
}

// ======== glavna petlja ========
function update(time = 0) {
  if (!isRunning || isPaused) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    igracSpustanje();
  }
  crtaj();
  requestAnimationFrame(update);
}

// ======== crtanje ========
function nacrtajMatricu(matrica, offset, ctx = context, isGhost = false) {
  matrica.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const baseX = x + offset.x;
        const baseY = y + offset.y;

        ctx.fillStyle = isGhost ? "rgba(255, 255, 255, 0.2)" : boje[value];
        ctx.fillRect(baseX, baseY, 1, 1);

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.moveTo(baseX, baseY + 1);
        ctx.lineTo(baseX, baseY);
        ctx.lineTo(baseX + 1, baseY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.beginPath();
        ctx.moveTo(baseX + 1, baseY);
        ctx.lineTo(baseX + 1, baseY + 1);
        ctx.lineTo(baseX, baseY + 1);
        ctx.closePath();
        ctx.fill();
      }
    });
  });
}

function crtaj() {
  context.fillStyle = context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel');;
  context.fillRect(0, 0, 12, 20);

  const ghost = getGhostPosition();
  nacrtajMatricu(arena, { x: 0, y: 0 });
  crtajGrid();
  nacrtajMatricu(igrac.matrica, ghost.pos, context, true);
  nacrtajMatricu(igrac.matrica, igrac.pos);
}

function crtajGrid() {
  context.save();
  context.strokeStyle = "#167D7F";
  context.lineWidth = 0.02;

  for (let x = 0; x <= 12; x++) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 20);
    context.stroke();
  }

  for (let y = 0; y <= 20; y++) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(12, y);
    context.stroke();
  }

  context.restore();
}

// ======== Ghost blok & Brzo spuštanje ========
function getGhostPosition() {
  const ghost = {
    matrica: igrac.matrica,
    pos: { x: igrac.pos.x, y: igrac.pos.y },
  };

  while (!preklapanje(arena, ghost)) {
    ghost.pos.y++;
  }
  ghost.pos.y--;

  return ghost;
}

function brzoSpustanje() {
  const ghost = getGhostPosition();
  const dropDistance = ghost.pos.y - igrac.pos.y;
  updateScore(dropDistance * 2);
  igrac.pos.y = ghost.pos.y;
  spoji(arena, igrac);
  igracReset();
  arenaSweep();
}

// ======== Pauziranje ========
function togglePause() {
  if(isRunning){
    isPaused = !isPaused;
    const btn = document.querySelector("#pause");
    btn.textContent = isPaused ? "RESUME" : "PAUSE";
    if (isPaused) {
      sounds.bgm.pause();
      document.getElementById('paused').style.visibility = 'visible';
      document.getElementById('tetris').style.visibility = 'hidden';
      document.getElementById('nextBlockCanvas').style.visibility = 'hidden';
      document.getElementById('savedBlockCanvas').style.visibility = 'hidden';
    } else {
      document.getElementById('paused').style.visibility = 'hidden';
      document.getElementById('tetris').style.visibility = 'visible';
      document.getElementById('nextBlockCanvas').style.visibility = 'visible';
      document.getElementById('savedBlockCanvas').style.visibility = 'visible';
      update();
      sounds.bgm.play();
    }
  }
}

// ======== Score ========
const scoreTable = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

function updateScore(poeni) {
  igrac.score += poeni;
  document.getElementById("liveScore").textContent = igrac.score;
}

// ========  Audio ========
const sounds = {
  bgm: new Audio("sounds/bgm.mp3"),
  line: new Audio("sounds/line-clear.wav"),
  gameover: new Audio("sounds/game-over.mp3"),
};

sounds.bgm.loop = true;
sounds.bgm.volume = 0.1;

function gameOverSound() {
  sounds.bgm.pause();
  sounds.gameover.play();
}

function prikažiCestitku(redovi, poeni) {
  const msg = document.getElementById("message");
  msg.innerHTML = `✨ WOW! ${redovi} lines cleared!<br>+${poeni} poeni ✨`;
  msg.style.display = "block";
  setTimeout(() => {
    msg.style.display = "none";
  }, 2000);
}

// ======== Input Handling ========
document.addEventListener("keydown", (event) => {
  if (!isRunning) return;
  switch (event.key) {
    case "ArrowUp":
      brzoSpustanje();
      break;
    case "ArrowLeft":
      igracPomeranje(-1);
      break;
    case "ArrowRight":
      igracPomeranje(1);
      break;
    case "ArrowDown":
      updateScore(1);
      igracSpustanje();
      break;
    case "q":
      igracRotiranje(-1);
      break;
    case "r":
      igracRotiranje(1);
      break;
    case "h":
      sacuvajKockicu();
      break;
    case "p":
        togglePause();
        break;
  }
});

// ======== Kontrolni dugmići ========

document.getElementById("restartButton").addEventListener("click", () => {
    if(isPaused) return;
  arena.forEach((row) => row.fill(0));
  igrac.score = 0;
  gameOver = false;
  brojPostavljenihBlokova = 0;
  dropInterval = 1000;
  isRunning = true;
  sledecaKockica = napraviKockicu(kockice[Math.floor(Math.random() * kockice.length)]);
  sacuvanaKockica = null;
  crtajSacuvanuKockicuResize();
  crtajSledecuKockicuResize();
  iskoristenHold = false;
  resetujHoldContext();

  igracReset();
  updateScore(-igrac.score);
  update();
  sounds.bgm.play();
});

// ======== Sledeca kockica ========
const nextCanvas = document.getElementById("nextBlockCanvas");
const nextContext = nextCanvas.getContext("2d");

function crtajSledecuKockicu(sledecaKockica) {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const scaleX = nextCanvas.width / sledecaKockica[0].length;
  const scaleY = nextCanvas.height / sledecaKockica.length;
  nextContext.setTransform(1, 0, 0, 1, 0, 0);
  nextContext.scale(scaleX, scaleY);
  nacrtajMatricu(sledecaKockica, { x: 0, y: 0 }, nextContext);
}

// ========  Hold Sistem ========
let sacuvanaKockica = null;
let iskoristenHold = false;

const savedCanvas = document.getElementById("savedBlockCanvas");
const savedContext = savedCanvas.getContext("2d");

function crtajSacuvanuKockicu() {
  if (!sacuvanaKockica) return;
  resetujHoldContext();
  const scaleX = savedCanvas.width / sacuvanaKockica[0].length;
  const scaleY = savedCanvas.height / sacuvanaKockica.length;
  savedContext.setTransform(1, 0, 0, 1, 0, 0);
  savedContext.scale(scaleX, scaleY);
  nacrtajMatricu(sacuvanaKockica, { x: 0, y: 0 }, savedContext);
}
function resetujHoldContext(){
    savedContext.clearRect(0, 0, savedCanvas.width, savedCanvas.height);
}

function sacuvajKockicu() {
  if (iskoristenHold) return;
  iskoristenHold = true;

  if (!sacuvanaKockica) {
    sacuvanaKockica = igrac.matrica;
    igracReset();
  } else {
    const temp = sacuvanaKockica;
    sacuvanaKockica = igrac.matrica;
    igrac.matrica = temp;
    igrac.pos.y = 0;
    igrac.pos.x =
      ((arena[0].length / 2) | 0) - ((igrac.matrica[0].length / 2) | 0);
    if (preklapanje(arena, igrac)) {
      isRunning = false;
      gameOver = true;
      document.getElementById("gameOverScreen").style.display = "block";
    }
  }
  crtajSacuvanuKockicu();
}

// ========  boje ========
const boje = [
  null,
  "#FF0D72",
  "#0DC2FF",
  "#0DFF72",
  "#F538FF",
  "#FF8E0D",
  "#FFE138",
  "#3877FF",
];


// ========  Prikaz help ========

document.getElementById("help").addEventListener("click", function (e) {
  if(!isPaused) togglePause();
  e.preventDefault(); 
  document.getElementById("helpModal").style.display = "flex";
});

function closeHelpModal() {
  document.getElementById("helpModal").style.display = "none";
}

// ========  Tema  ========

function openThemeModal() {
  if(!isPaused)togglePause();
  document.getElementById("themeModal").style.display = "flex";
}

function closeThemeModal() {
  document.getElementById("themeModal").style.display = "none";
}


// Slušaj poruku iz iframe-a
window.addEventListener("message", (event) => {
  const themeName = themes[event.data.theme];
  document.querySelector("#helpModal iframe").contentWindow.postMessage({ theme: themeName }, "*");

  applyTheme(themeName);
});