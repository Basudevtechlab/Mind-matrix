// ============================================================
//  MIND MATRIX v2.0 — Full Game Engine
// ============================================================

// ── EMOJI THEMES ──────────────────────────────────────────
const THEMES = {
  space:   ['🧠','⚡','🔮','🌀','💎','🎯','🚀','🔥','🌊','🎲','⚗️','🧬','🔭','🛸','💫','🌌','💻','🏆','🎮','🌠'],
  nature:  ['🌲','🦁','🐬','🦋','🌸','🍀','🦊','🦅','🌺','🐋','🦜','🌿','🐘','🦋','🍄','🌈','🦔','🐢','🌻','🦩'],
  food:    ['🍕','🍜','🎂','🍣','🍔','🍩','🥑','🍓','🍦','🥐','🍭','🧁','🥗','🍝','🍇','🥩','🍿','🍰','🥞','🍱'],
  sports:  ['⚽','🏀','🎾','🏈','⚾','🏐','🏉','🎱','🏓','🏒','🥊','🎯','⛷️','🏊','🎿','🤿','🚴','🤸','🥋','🏋️'],
  faces:   ['😀','😍','🤔','😎','🥳','😴','🤩','😱','🥺','😂','🤣','😇','🥸','😜','🤯','🫡','🥰','😤','🫠','🤗'],
  mixed:   ['🧠','⚽','🍕','😀','🌲','🦁','🚀','🎂','😍','⚡','🌸','🏀','💎','🍜','🤔','🔮','🎾','🍣','🌀','😎'],
};

// ── LEVEL CONFIGS ──────────────────────────────────────────
const LEVELS = {
  easy:   { cols: 4, rows: 3, pairs: 6,  lives: 3, label: 'EASY' },
  medium: { cols: 4, rows: 4, pairs: 8,  lives: 3, label: 'MEDIUM' },
  hard:   { cols: 5, rows: 4, pairs: 10, lives: 3, label: 'HARD' },
  timed:  { cols: 4, rows: 4, pairs: 8,  lives: 99, label: 'TIMED' },
};

// ── ACHIEVEMENTS ────────────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id: 'first_win',    icon: '🏅', name: 'FIRST WIN',       desc: 'Complete your first game',                 check: (s) => s.totalWins >= 1 },
  { id: 'no_mistakes',  icon: '💎', name: 'FLAWLESS',        desc: 'Win without any wrong matches',             check: (s) => s.lastWrongMoves === 0 },
  { id: 'speed_demon',  icon: '⚡', name: 'SPEED DEMON',     desc: 'Win Easy mode in under 30 seconds',         check: (s) => s.lastLevel === 'easy' && s.lastTime < 30 && s.lastWin },
  { id: 'combo_5',      icon: '🔥', name: 'ON FIRE',         desc: 'Get a 5x combo streak',                    check: (s) => s.maxCombo >= 5 },
  { id: 'hard_master',  icon: '🧠', name: 'MIND MASTER',     desc: 'Win Hard mode',                            check: (s) => s.lastLevel === 'hard' && s.lastWin },
  { id: 'timed_win',    icon: '⏱',  name: 'BEAT THE CLOCK',  desc: 'Win Timed mode',                           check: (s) => s.lastLevel === 'timed' && s.lastWin },
  { id: 'high_score',   icon: '🏆', name: 'HIGH SCORER',     desc: 'Score over 2000 points in one game',       check: (s) => s.lastScore >= 2000 },
  { id: 'hint_free',    icon: '👁',  name: 'NO PEEKING',      desc: 'Win without using any hints',               check: (s) => s.lastHintsUsed === 0 && s.lastWin },
  { id: 'ten_wins',     icon: '🌟', name: 'VETERAN',         desc: 'Win 10 games total',                       check: (s) => s.totalWins >= 10 },
  { id: 'perfect_hard', icon: '👑', name: 'ABSOLUTE UNIT',   desc: 'Win Hard with no mistakes & no hints',     check: (s) => s.lastLevel === 'hard' && s.lastWin && s.lastWrongMoves === 0 && s.lastHintsUsed === 0 },
];

// ── STATE ───────────────────────────────────────────────────
let currentLevel = 'easy';
let cards = [];
let flipped = [];
let matched = 0;
let moves = 0;
let wrongMoves = 0;
let score = 0;
let lives = 3;
let hints = 3;
let hintsUsed = 0;
let combo = 1;
let maxCombo = 1;
let comboStreak = 0;
let streak = 0;
let maxStreak = 0;
let timer = null;
let elapsed = 0;
let timedLeft = 60;
let timedInterval = null;
let paused = false;
let gameActive = false;
let peekUsed = false;
let prevScreen = 'menuScreen';
let lbCurrentTab = 'easy';

// Persistent stats
let stats = loadStats();
let settings = loadSettings();

// ── SOUND ENGINE ────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function getACtx() {
  if (!actx) actx = new AudioCtx();
  return actx;
}

function playTone(freq, type, dur, vol = 0.18, delay = 0) {
  if (!settings.sfx) return;
  try {
    const ctx = getACtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur);
  } catch(e) {}
}

const SFX = {
  flip:    () => playTone(440, 'sine', 0.08, 0.1),
  match:   () => { playTone(523, 'sine', 0.15); playTone(659, 'sine', 0.15, 0.14, 0.1); playTone(784, 'sine', 0.2, 0.16, 0.2); },
  wrong:   () => { playTone(220, 'sawtooth', 0.15, 0.12); playTone(180, 'sawtooth', 0.2, 0.12, 0.15); },
  combo:   () => { [523,659,784,1047].forEach((f,i) => playTone(f, 'sine', 0.12, 0.15, i*0.07)); },
  hint:    () => playTone(660, 'triangle', 0.2, 0.12),
  win:     () => { [523,659,784,1047,1319].forEach((f,i) => playTone(f,'sine',0.25,0.18,i*0.1)); },
  lose:    () => { [300,250,200].forEach((f,i) => playTone(f,'sawtooth',0.25,0.15,i*0.15)); },
  click:   () => playTone(600, 'sine', 0.05, 0.08),
};

// ── BACKGROUND CANVAS ───────────────────────────────────────
const canvas = document.getElementById('bgCanvas');
const ctx2 = canvas.getContext('2d');
let particles2 = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initBgParticles() {
  particles2 = [];
  for (let i = 0; i < 18; i++) {
    particles2.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: 0.1 + Math.random() * 0.3,
    });
  }
}

function drawBg() {
  if (!settings.bgAnim) { requestAnimationFrame(drawBg); return; }
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  particles2.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx2.fillStyle = `rgba(0,245,212,${p.alpha})`;
    ctx2.fill();
  });
  // Draw connections
  for (let i = 0; i < particles2.length; i++) {
    for (let j = i + 1; j < particles2.length; j++) {
      const dx = particles2[i].x - particles2[j].x;
      const dy = particles2[i].y - particles2[j].y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 160) {
        ctx2.beginPath();
        ctx2.moveTo(particles2[i].x, particles2[i].y);
        ctx2.lineTo(particles2[j].x, particles2[j].y);
        ctx2.strokeStyle = `rgba(0,245,212,${0.04 * (1 - dist/160)})`;
        ctx2.lineWidth = 0.8;
        ctx2.stroke();
      }
    }
  }
  requestAnimationFrame(drawBg);
}

// ── STARS ───────────────────────────────────────────────────
function createStars() {
  const container = document.getElementById('stars');
  container.innerHTML = '';
  for (let i = 0; i < 100; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      --dur:${2+Math.random()*4}s; --op:${0.15+Math.random()*0.7};
      width:${Math.random()>0.8?3:2}px; height:${Math.random()>0.8?3:2}px;
      animation-delay:${Math.random()*4}s;`;
    container.appendChild(s);
  }
}

// ── SCREEN MANAGEMENT ───────────────────────────────────────
function showScreen(id) {
  SFX.click();
  const prev = document.querySelector('.screen.active');
  if (prev) { prevScreen = prev.id; prev.classList.remove('active'); }
  const next = document.getElementById(id);
  next.classList.add('active');
  if (id === 'leaderboardScreen') renderLeaderboard('easy');
  if (id === 'achievementsScreen') renderAchievements();
}

function goBack() { showScreen(prevScreen || 'menuScreen'); }

function goToGame() {
  showScreen('gameScreen');
  if (!gameActive) setMessage('— SELECT MODE · PRESS NEW GAME —');
}

// ── SETTINGS ────────────────────────────────────────────────
function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('mmSettings')) || { sfx: true, particles: true, bgAnim: true, theme: 'space', timedDur: 60 };
  } catch(e) { return { sfx: true, particles: true, bgAnim: true, theme: 'space', timedDur: 60 }; }
}
function saveSetting(key, val) {
  settings[key] = val;
  localStorage.setItem('mmSettings', JSON.stringify(settings));
}
function saveTheme(val) { saveSetting('theme', val); }
function applySettings() {
  document.getElementById('sfxToggle').checked = settings.sfx;
  document.getElementById('particlesToggle').checked = settings.particles;
  document.getElementById('bgAnimToggle').checked = settings.bgAnim;
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('timedDur').value = settings.timedDur;
}

// ── STATS ────────────────────────────────────────────────────
function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('mmStats')) || { totalWins: 0, maxCombo: 0, leaderboard: { easy: [], medium: [], hard: [], timed: [] }, achievements: [] };
  } catch(e) { return { totalWins: 0, maxCombo: 0, leaderboard: { easy: [], medium: [], hard: [], timed: [] }, achievements: [] }; }
}
function saveStats() { localStorage.setItem('mmStats', JSON.stringify(stats)); }
function resetAllData() {
  if (confirm('Reset ALL scores and achievements?')) {
    localStorage.removeItem('mmStats');
    localStorage.removeItem('mmSettings');
    stats = loadStats(); settings = loadSettings();
    applySettings();
    alert('All data reset!');
  }
}

// ── LEADERBOARD ──────────────────────────────────────────────
function addToLeaderboard(level, score, moves, time) {
  if (!stats.leaderboard) stats.leaderboard = { easy: [], medium: [], hard: [], timed: [] };
  const lb = stats.leaderboard[level];
  lb.push({ score, moves, time, date: new Date().toLocaleDateString() });
  lb.sort((a, b) => b.score - a.score);
  stats.leaderboard[level] = lb.slice(0, 10);
  saveStats();
}

function showLbTab(level, btn) {
  lbCurrentTab = level;
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard(level);
}

function renderLeaderboard(level) {
  const lb = (stats.leaderboard && stats.leaderboard[level]) || [];
  const list = document.getElementById('lbList');
  if (lb.length === 0) {
    list.innerHTML = '<div class="lb-empty">NO SCORES YET<br>Play a game to appear here!</div>';
    return;
  }
  list.innerHTML = lb.map((e, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
    return `<div class="lb-entry">
      <div class="lb-rank ${rankClass}">${medal}</div>
      <div class="lb-info">
        <div class="lb-score">${e.score.toLocaleString()}</div>
        <div class="lb-meta">${e.moves} MOVES · ${e.time} · ${e.date}</div>
      </div>
    </div>`;
  }).join('');
}

function clearLeaderboard() {
  if (confirm('Clear leaderboard for ' + lbCurrentTab + '?')) {
    stats.leaderboard[lbCurrentTab] = [];
    saveStats();
    renderLeaderboard(lbCurrentTab);
  }
}

// ── ACHIEVEMENTS ─────────────────────────────────────────────
function renderAchievements() {
  const list = document.getElementById('achieveList');
  const unlocked = stats.achievements || [];
  list.innerHTML = ACHIEVEMENTS_DEF.map(a => {
    const done = unlocked.includes(a.id);
    return `<div class="achieve-entry ${done ? 'unlocked' : ''}">
      <div class="achieve-icon">${a.icon}</div>
      <div class="achieve-info">
        <div class="achieve-name">${a.name}</div>
        <div class="achieve-desc">${done ? a.desc : '???'}</div>
      </div>
      <div class="achieve-badge">${done ? '✅' : '🔒'}</div>
    </div>`;
  }).join('');
}

function checkAchievements(gameStats) {
  if (!stats.achievements) stats.achievements = [];
  const newUnlocks = [];
  ACHIEVEMENTS_DEF.forEach(a => {
    if (!stats.achievements.includes(a.id) && a.check(gameStats)) {
      stats.achievements.push(a.id);
      newUnlocks.push(a);
    }
  });
  saveStats();
  return newUnlocks;
}

// ── SHUFFLE ──────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── LEVEL ────────────────────────────────────────────────────
function setLevel(level, btn) {
  SFX.click();
  currentLevel = level;
  document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (gameActive) startGame();
}

// ── START GAME ───────────────────────────────────────────────
function startGame() {
  SFX.click();
  clearInterval(timer);
  clearInterval(timedInterval);

  const cfg = LEVELS[currentLevel];
  const pool = THEMES[settings.theme] || THEMES.space;
  const chosen = shuffle([...pool]).slice(0, cfg.pairs);
  cards = shuffle([...chosen, ...chosen]);

  flipped = []; matched = 0; moves = 0; wrongMoves = 0;
  score = 0; lives = cfg.lives; hints = 3; hintsUsed = 0;
  combo = 1; maxCombo = 1; comboStreak = 0; streak = 0;
  elapsed = 0; paused = false; gameActive = true; peekUsed = false;
  timedLeft = settings.timedDur || 60;

  updateHUD();
  updateProgress(0, cfg.pairs);
  setMessage('MATCH THE PATTERNS — GOOD LUCK!');
  closeAllOverlays();
  renderBoard(cfg);
  updateLives();
  updateCombo();
  document.getElementById('hintBtn').disabled = false;
  document.getElementById('hintCount').textContent = hints;

  // Countdown bar for timed mode
  const cwrap = document.getElementById('countdownWrap');
  if (currentLevel === 'timed') {
    cwrap.style.display = 'block';
    updateCountdown(timedLeft);
    startTimedCountdown();
  } else {
    cwrap.style.display = 'none';
  }

  startTimer();
}

// ── BOARD RENDER ─────────────────────────────────────────────
function renderBoard(cfg) {
  const board = document.getElementById('board');
  board.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
  board.innerHTML = '';
  cards.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;
    card.dataset.emoji = emoji;
    card.innerHTML = `<div class="card-inner">
      <div class="card-back"></div>
      <div class="card-front">${emoji}</div>
    </div>`;
    card.addEventListener('click', () => flipCard(card, i));
    board.appendChild(card);
  });
}

// ── CARD FLIP ────────────────────────────────────────────────
function flipCard(card, index) {
  if (!gameActive || paused) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (flipped.length >= 2) return;

  SFX.flip();
  card.classList.add('flipped');
  flipped.push({ card, index, emoji: cards[index] });

  if (flipped.length === 2) {
    moves++;
    updateHUD();
    setTimeout(checkMatch, 700);
  }
}

function checkMatch() {
  if (flipped.length < 2) return;
  const [a, b] = flipped;

  if (a.emoji === b.emoji) {
    // ✅ MATCH
    a.card.classList.add('matched');
    b.card.classList.add('matched');
    matched++;
    comboStreak++;
    streak++;
    if (streak > maxStreak) maxStreak = streak;

    if (comboStreak >= 2) {
      combo = Math.min(comboStreak, 8);
      if (combo > maxCombo) maxCombo = combo;
      if (combo >= 3) { SFX.combo(); showComboFlash(combo); }
    } else {
      combo = 1;
    }

    const pts = Math.round((100 + Math.max(0, 200 - elapsed * 1.5)) * combo);
    score += pts;

    updateHUD();
    updateProgress(matched, LEVELS[currentLevel].pairs);
    updateCombo();
    if (settings.particles) spawnParticles(a.card, combo);
    SFX.match();
    setMessage(getMatchMsg(combo));

    if (streak >= 2) {
      document.getElementById('streakBadge').style.display = 'flex';
      document.getElementById('streak').textContent = streak;
    }

    if (matched === LEVELS[currentLevel].pairs) setTimeout(winGame, 500);
  } else {
    // ❌ WRONG
    wrongMoves++;
    comboStreak = 0; combo = 1; streak = 0;
    updateCombo();
    document.getElementById('streakBadge').style.display = 'none';

    a.card.classList.add('wrong');
    b.card.classList.add('wrong');
    score = Math.max(0, score - 15);
    lives = Math.max(0, lives - 1);
    updateHUD(); updateLives();
    SFX.wrong();
    setMessage('NOT A MATCH — LIFE LOST!');

    if (lives <= 0 && currentLevel !== 'timed') {
      setTimeout(gameOver, 700);
      flipped = [];
      return;
    }

    setTimeout(() => {
      a.card.classList.remove('flipped', 'wrong');
      b.card.classList.remove('flipped', 'wrong');
    }, 700);
  }
  flipped = [];
}

// ── HINT ─────────────────────────────────────────────────────
function useHint() {
  if (!gameActive || paused || hints <= 0) return;
  hints--; hintsUsed++;
  document.getElementById('hintCount').textContent = hints;
  if (hints <= 0) document.getElementById('hintBtn').disabled = true;
  SFX.hint();

  // Find first unmatched pair
  const unmatched = [...document.querySelectorAll('.card:not(.matched):not(.flipped)')];
  const emojiMap = {};
  unmatched.forEach(c => {
    const e = c.dataset.emoji;
    if (!emojiMap[e]) emojiMap[e] = [];
    emojiMap[e].push(c);
  });
  const pair = Object.values(emojiMap).find(g => g.length >= 2);
  if (!pair) return;

  pair[0].classList.add('hint-glow');
  pair[1].classList.add('hint-glow');
  setTimeout(() => { pair[0].classList.remove('hint-glow'); pair[1].classList.remove('hint-glow'); }, 2000);
  setMessage('💡 HINT ACTIVE — FIND THE GLOWING PAIR!');
}

// ── PEEK ─────────────────────────────────────────────────────
function revealAllBriefly() {
  if (!gameActive || paused || peekUsed) { setMessage('PEEK ALREADY USED THIS GAME!'); return; }
  peekUsed = true;
  const unmatched = document.querySelectorAll('.card:not(.matched):not(.flipped)');
  unmatched.forEach(c => c.classList.add('peek-reveal'));
  setMessage('👁 PEEK — MEMORIZE QUICKLY!');
  setTimeout(() => {
    unmatched.forEach(c => c.classList.remove('peek-reveal'));
    setMessage('PEEK ENDED — PLAY ON!');
  }, 2000);
}

// ── PAUSE ────────────────────────────────────────────────────
function togglePause() {
  if (!gameActive) return;
  SFX.click();
  paused = !paused;
  document.getElementById('pauseOverlay').style.display = paused ? 'flex' : 'none';
  if (!paused) setMessage('RESUMED — CONTINUE!');
}

// ── TIMER ────────────────────────────────────────────────────
function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!paused && gameActive) {
      elapsed++;
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }
  }, 1000);
}

function startTimedCountdown() {
  clearInterval(timedInterval);
  timedInterval = setInterval(() => {
    if (paused || !gameActive) return;
    timedLeft--;
    updateCountdown(timedLeft);
    if (timedLeft <= 0) { clearInterval(timedInterval); gameOver(); }
  }, 1000);
}

function updateCountdown(secs) {
  const dur = settings.timedDur || 60;
  const pct = (secs / dur) * 100;
  const fill = document.getElementById('countdownFill');
  fill.style.width = pct + '%';
  fill.style.background = secs < 15
    ? 'linear-gradient(90deg, #ff3366, #ff6b35)'
    : 'linear-gradient(90deg, #ffbe0b, #ff6b35)';
  document.getElementById('countdownLabel').textContent = `${secs}s`;
}

// ── WIN ──────────────────────────────────────────────────────
function winGame() {
  clearInterval(timer); clearInterval(timedInterval);
  gameActive = false;
  SFX.win();

  const bonus = Math.max(0, 500 - elapsed * 2) + lives * 100;
  const finalScore = score + bonus;
  const timeStr = formatTime(elapsed);
  const starCount = wrongMoves === 0 ? 3 : wrongMoves <= 3 ? 2 : 1;
  const stars = '⭐'.repeat(starCount);

  // Save to leaderboard
  addToLeaderboard(currentLevel, finalScore, moves, timeStr);

  // Check best
  const lb = stats.leaderboard[currentLevel];
  const isNewBest = lb.length === 1 || lb[0].score === finalScore;

  // Update global stats
  stats.totalWins = (stats.totalWins || 0) + 1;
  stats.maxCombo = Math.max(stats.maxCombo || 0, maxCombo);
  saveStats();

  // Check achievements
  const gameStats = {
    lastWin: true, lastLevel: currentLevel, lastTime: elapsed,
    lastWrongMoves: wrongMoves, lastHintsUsed: hintsUsed,
    lastScore: finalScore, maxCombo: stats.maxCombo, totalWins: stats.totalWins,
  };
  const newUnlocks = checkAchievements(gameStats);

  // Show victory
  document.getElementById('v-score').textContent = finalScore.toLocaleString();
  document.getElementById('v-moves').textContent = moves;
  document.getElementById('v-time').textContent = timeStr;
  document.getElementById('v-combo').textContent = 'x' + maxCombo;
  document.getElementById('victory-stars').textContent = stars;
  document.getElementById('newBest').style.display = isNewBest ? 'block' : 'none';
  const ach = document.getElementById('newAchieve');
  ach.style.display = newUnlocks.length ? 'block' : 'none';
  if (newUnlocks.length) ach.textContent = `🎖 UNLOCKED: ${newUnlocks.map(a => a.name).join(', ')}`;

  document.getElementById('victoryOverlay').style.display = 'flex';
}

// ── GAME OVER ────────────────────────────────────────────────
function gameOver() {
  clearInterval(timer); clearInterval(timedInterval);
  gameActive = false;
  SFX.lose();
  document.getElementById('go-score').textContent = score.toLocaleString();
  document.getElementById('go-matched').textContent = `${matched}/${LEVELS[currentLevel].pairs}`;
  document.getElementById('gameOverOverlay').style.display = 'flex';
}

function restartFromGameOver() { closeAllOverlays(); startGame(); }
function restartFromVictory() { closeAllOverlays(); startGame(); }

function closeAllOverlays() {
  ['pauseOverlay','gameOverOverlay','victoryOverlay'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

// ── HUD UPDATES ──────────────────────────────────────────────
function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('moves').textContent = moves;
}

function updateLives() {
  const cfg = LEVELS[currentLevel];
  if (cfg.lives >= 99) { document.getElementById('lives').textContent = '∞'; return; }
  document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, cfg.lives - lives));
}

function updateCombo() {
  document.getElementById('combo').textContent = `x${combo}`;
}

function updateProgress(m, total) {
  document.getElementById('progress').style.width = (m / total * 100) + '%';
}

function setMessage(msg) {
  const el = document.getElementById('message');
  el.textContent = msg; el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'fadeMsg 0.3s ease';
}

function formatTime(secs) {
  return `${Math.floor(secs/60)}:${(secs%60).toString().padStart(2,'0')}`;
}

// ── PARTICLES ────────────────────────────────────────────────
function spawnParticles(card, combo = 1) {
  if (!settings.particles) return;
  const rect = card.getBoundingClientRect();
  const count = Math.min(3 + combo, 8);
  const pool = ['✨','💥','⚡','🌟','💫','🎉','🔥'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = pool[i % pool.length];
    p.style.cssText = `
      left:${rect.left + rect.width/2 + (Math.random()-0.5)*70}px;
      top:${rect.top + rect.height/2}px;
      --dur:${0.7 + Math.random()*0.5}s;
      animation-delay:${i*0.07}s;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

function showComboFlash(combo) {
  const el = document.createElement('div');
  el.className = 'combo-flash';
  el.textContent = `${combo}x COMBO!`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── MATCH MESSAGES ───────────────────────────────────────────
function getMatchMsg(combo) {
  if (combo >= 5) return ['🔥 UNSTOPPABLE!','🔥 ON FIRE!','⚡ GODLIKE!'][Math.floor(Math.random()*3)];
  if (combo >= 3) return ['COMBO STREAK!','CHAIN MATCH!','NEURAL LINK!'][Math.floor(Math.random()*3)];
  return ['MATCH FOUND!','PATTERN LOCKED!','SYNCHRONIZED!','SEQUENCE MATCH!'][Math.floor(Math.random()*4)];
}

// ── KEYBOARD ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen || activeScreen.id !== 'gameScreen') return;

  switch(e.key) {
    case ' ': e.preventDefault(); startGame(); break;
    case 'h': case 'H': useHint(); break;
    case 'p': case 'P': togglePause(); break;
    case '1': setLevelByKey('easy'); break;
    case '2': setLevelByKey('medium'); break;
    case '3': setLevelByKey('hard'); break;
    case '4': setLevelByKey('timed'); break;
  }
});

function setLevelByKey(level) {
  currentLevel = level;
  document.querySelectorAll('.level-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.level === level);
  });
  if (gameActive) startGame();
}

// ── INIT ─────────────────────────────────────────────────────
window.addEventListener('resize', () => { resizeCanvas(); initBgParticles(); });

createStars();
resizeCanvas();
initBgParticles();
drawBg();
applySettings();

// Show menu
showScreen('menuScreen');
