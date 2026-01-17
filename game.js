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
onAuthStateChanged(auth, user => {
  if (user) uid = user.uid;
});

/* ================= CANVAS ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ================= THEME ================= */
let theme = localStorage.getItem("theme") || "dark";
document.getElementById("themeToggle").onclick = () => {
  theme = theme === "dark" ? "neon" : "dark";
  localStorage.setItem("theme", theme);
};

/* ================= STATE ================= */
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let gameOver = false;
let velocityY = -10;
const gravity = 0.4;
let leaderboard = [];

/* ================= PLAYER ================= */
const player = { x: 180, y: 300, w: 40, h: 40, speed: 6 };
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
const platforms = [];
const GAP = 80;

function spawnPlatform(y) {
  return {
    x: Math.random() * 300,
    y,
    w: 100,
    h: 16,
    type: Math.random() < 0.2 ? "break" : Math.random() < 0.5 ? "move" : "static",
    dir: Math.random() < 0.5 ? -1 : 1,
    broken: false
  };
}

function initPlatforms() {
  platforms.length = 0;
  for (let i = 0; i < 10; i++) {
    platforms.push(spawnPlatform(canvas.height - i * GAP));
  }
}

/* ================= ANTI-CHEAT ================= */
function validScore(s) {
  return s >= 0 && s <= 999999 && Number.isInteger(s);
}

/* ================= FIREBASE SCORE ================= */
async function saveScore() {
  if (!uid || !validScore(score)) return;

  const refUser = ref(db, `scores/${uid}`);
  const snap = await get(refUser);
  const prev = snap.val();

  if (!prev || score > prev.score) {
    await set(refUser, {
      score,
      best: Math.max(score, prev?.best || 0)
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

/* ================= MOBILE CONTROLS ================= */
document.getElementById("leftBtn").ontouchstart = () => moveLeft = true;
document.getElementById("rightBtn").ontouchstart = () => moveRight = true;
document.getElementById("leftBtn").ontouchend = () => moveLeft = false;
document.getElementById("rightBtn").ontouchend = () => moveRight = false;

/* ================= KEYBOARD ================= */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") moveLeft = true;
  if (e.key === "ArrowRight") moveRight = true;
  if (e.key === "Enter" && gameOver) restart();
});
document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") moveLeft = false;
  if (e.key === "ArrowRight") moveRight = false;
});

/* ================= GAME ================= */
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
  if (gameOver) return;

  if (moveLeft) player.x -= player.speed;
  if (moveRight) player.x += player.speed;

  velocityY += gravity;
  player.y += velocityY;

  if (player.x > canvas.width) player.x = -player.w;
  if (player.x + player.w < 0) player.x = canvas.width;

  platforms.forEach(p => {
    if (p.type === "move") {
      p.x += p.dir * 1.5;
      if (p.x <= 0 || p.x + p.w >= canvas.width) p.dir *= -1;
    }

    if (!p.broken &&
      player.y + player.h > p.y &&
      player.y + player.h < p.y + p.h &&
      player.x + player.w > p.x &&
      player.x < p.x + p.w &&
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

  while (platforms.length && platforms[0].y > canvas.height) {
    platforms.shift();
    platforms.push(spawnPlatform(platforms[platforms.length - 1].y - GAP));
  }

  if (player.y > canvas.height) {
    gameOver = true;
    saveScore();
  }
}

function draw() {
  ctx.fillStyle = theme === "dark" ? "#000" : "#020b1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  platforms.forEach(p => {
    if (!p.broken) {
      ctx.drawImage(p.type === "break" ? breakImg : platformImg, p.x, p.y, p.w, p.h);
    }
  });

  ctx.fillStyle = theme === "dark" ? "#fff" : "#0ff";
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Best: ${bestScore}`, 10, 40);

  ctx.fillText("Top:", 260, 20);
  leaderboard.forEach((l, i) =>
    ctx.fillText(`${i + 1}. ${l.score}`, 260, 40 + i * 18)
  );

  if (gameOver) {
    ctx.fillText("GAME OVER", 130, 260);
    ctx.fillText("Press ENTER", 140, 290);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ================= START ================= */
initPlatforms();
listenLeaderboard();
loop();
