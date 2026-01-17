/* ================= FIREBASE (MODULAR) ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmfqvZ43D2Q35yWk1eb7vScmzv6DXz9xU",
  authDomain: "test-3de69.firebaseapp.com",
  databaseURL: "https://test-3de69-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "test-3de69",
  storageBucket: "test-3de69.firebasestorage.app",
  messagingSenderId: "361141862152",
  appId: "1:361141862152:web:1a897b3932a7d892a7f6bd"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

/* ================= AUTH ================= */
let uid = null;
signInAnonymously(auth);
onAuthStateChanged(auth, u => uid = u?.uid || null);

/* ================= UI ELEMENTS ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nameScreen = document.getElementById("nameScreen");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("playerNameInput");

/* ================= THEME ================= */
let theme = localStorage.getItem("theme") || "dark";
document.getElementById("themeToggle").onclick = () => {
  theme = theme === "dark" ? "dark-neon" : "dark";
  localStorage.setItem("theme", theme);
};

/* ================= STATE ================= */
let playerName = localStorage.getItem("playerName") || "";
let gameStarted = false;
let gameOver = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let velocityY = 0;
const gravity = 0.4;
let leaderboard = [];

const player = { x: 180, y: 300, width: 40, height: 40, speed: 6 };
let moveLeft = false;
let moveRight = false;

/* ================= IMAGES ================= */
const playerImg = new Image();
playerImg.src = "assets/player.gif";
const platformImg = new Image();
platformImg.src = "assets/platform.png";
const breakImg = new Image();
breakImg.src = "assets/platform_break.png";

/* ================= PLATFORMS (INFINITE) ================= */
const platformGap = 80;
const platformCount = 8;
let platforms = [];

function createPlatform(y) {
  return {
    x: Math.random() * 300,
    y,
    width: 100,
    height: 16,
    type: Math.random() < 0.2 ? "break" : Math.random() < 0.5 ? "move" : "static",
    dir: Math.random() < 0.5 ? -1 : 1,
    broken: false
  };
}

function initPlatforms() {
  platforms = [];
  for (let i = 0; i < platformCount; i++) {
    platforms.push(createPlatform(canvas.height - i * platformGap));
  }
}

/* ================= ANTI-CHEAT ================= */
function validScore(s) {
  return Number.isInteger(s) && s >= 0 && s <= 999999;
}

/* ================= FIREBASE SCORE ================= */
async function saveScore() {
  if (!uid || !validScore(score)) return;

  const userRef = ref(db, `scores/${uid}`);
  const snap = await get(userRef);
  const prev = snap.val();

  if (!prev || score > prev.score) {
    await set(userRef, {
      name: playerName,
      score
    });
  }
}

function listenLeaderboard() {
  const q = query(ref(db, "scores"), orderByChild("score"), limitToLast(5));
  onValue(q, snap => {
    leaderboard = [];
    snap.forEach(s => leaderboard.push(s.val()));
    leaderboard.sort((a, b) => b.score - a.score);
  });
}

/* ================= NAME SCREEN ================= */
function startAfterName() {
  const val = nameInput.value.trim();
  if (val) {
    playerName = val;
    localStorage.setItem("playerName", playerName);
  }
  nameScreen.style.display = "none";
  gameStarted = true;
  startGame();
}

if (playerName) startAfterName();
else nameScreen.style.display = "flex";

startBtn.onclick = startAfterName;

/* ================= MOBILE CONTROLS ================= */
document.getElementById("leftBtn").ontouchstart = () => moveLeft = true;
document.getElementById("rightBtn").ontouchstart = () => moveRight = true;
document.getElementById("leftBtn").ontouchend = () => moveLeft = false;
document.getElementById("rightBtn").ontouchend = () => moveRight = false;

/* ================= INPUT ================= */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") moveLeft = true;
  if (e.key === "ArrowRight") moveRight = true;
  if (e.key === "Enter" && gameOver) restart();
});
document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") moveLeft = false;
  if (e.key === "ArrowRight") moveRight = false;
});

/* ================= GAME LOGIC ================= */
function wrapPlayer() {
  if (player.x > canvas.width) player.x = -player.width;
  if (player.x + player.width < 0) player.x = canvas.width;
}

function restart() {
  saveScore();
  bestScore = Math.max(bestScore, score);
  localStorage.setItem("bestScore", bestScore);
  score = 0;
  velocityY = -10;
  player.x = 180;
  player.y = 300;
  gameOver = false;
  initPlatforms();
}

function update() {
  if (!gameStarted || gameOver) return;

  if (moveLeft) player.x -= player.speed;
  if (moveRight) player.x += player.speed;

  velocityY += gravity;
  player.y += velocityY;
  wrapPlayer();

  platforms.forEach(p => {
    if (p.type === "move") {
      p.x += p.dir * 1.5;
      if (p.x <= 0 || p.x + p.width >= canvas.width) p.dir *= -1;
    }

    if (!p.broken &&
        player.y + player.height > p.y &&
        player.y + player.height < p.y + p.height &&
        player.x + player.width > p.x &&
        player.x < p.x + p.width &&
        velocityY > 0) {
      velocityY = -12;
      if (p.type === "break") p.broken = true;
    }
  });

  if (player.y < 250) {
    const diff = 250 - player.y;
    player.y = 250;
    platforms.forEach(p => p.y += diff);
    score += Math.floor(diff / 4);
  }

  platforms.forEach(p => {
    if (p.y > canvas.height) Object.assign(p, createPlatform(0));
  });

  if (player.y > canvas.height) {
    gameOver = true;
    saveScore();
  }
}

/* ================= DRAW (OLD UI STYLE) ================= */
function draw() {
  ctx.fillStyle = theme === "dark" ? "#000" : "#020b1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  platforms.forEach(p => {
    if (!p.broken) {
      ctx.drawImage(p.type === "break" ? breakImg : platformImg, p.x, p.y, p.width, p.height);
    }
  });

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`Player: ${playerName}`, 10, 20);
  ctx.fillText(`Score: ${score}`, 10, 40);
  ctx.fillText(`Best: ${bestScore}`, 10, 60);

  ctx.fillText("Leaderboard:", 240, 20);
  leaderboard.forEach((l, i) => {
    ctx.fillStyle = l.name === playerName ? "#0f0" : "#fff";
    ctx.fillText(`${i + 1}. ${l.name} - ${l.score}`, 240, 40 + i * 20);
  });

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "24px monospace";
    ctx.fillText("GAME OVER", 120, 260);
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to Restart", 95, 300);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  initPlatforms();
  listenLeaderboard();
  velocityY = -10;
  loop();
}
