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

console.log("🔥 GAME JS LOADED (MODULAR)");

const firebaseConfig = {
  apiKey: "AIzaSyCmfqvZ43D2Q35yWk1eb7vScmzv6DXz9xU",
  authDomain: "test-3de69.firebaseapp.com",
  databaseURL: "https://test-3de69-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "test-3de69",
  storageBucket: "test-3de69.firebasestorage.app",
  messagingSenderId: "361141862152",
  appId: "1:361141862152:web:1a897b3932a7d892a7f6bd"
};

/* Init Firebase */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const scoresRef = ref(db, "scores");

console.log("🔥 Firebase modular initialized");

/* ================= CANVAS ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ================= STATE ================= */
let playerName = localStorage.getItem("playerName") || "Player";
let gameStarted = true;
let gameOver = false;
let score = 0;
let velocityY = -10;
const gravity = 0.4;

const player = { x: 180, y: 300, width: 40, height: 40, speed: 6 };
let moveLeft = false;
let moveRight = false;

/* ================= IMAGES ================= */
const playerImg = new Image();
playerImg.src = "assets/player.gif";
const platformImg = new Image();
platformImg.src = "assets/platform.png";

/* ================= PLATFORMS ================= */
const platformCount = 8;
const platformGap = 80;
let platforms = [];

function createPlatform(y) {
  return {
    x: Math.random() * 300,
    y,
    width: 100,
    height: 16
  };
}

function initPlatforms() {
  platforms = [];
  for (let i = 0; i < platformCount; i++) {
    platforms.push(createPlatform(canvas.height - i * platformGap));
  }
}

/* ================= FIREBASE SCORE ================= */
async function saveScore() {
  if (!playerName) return;

  const userRef = ref(db, `scores/${playerName}`);
  const snap = await get(userRef);
  const prev = snap.val();

  if (!prev || score > prev.score) {
    await set(userRef, { name: playerName, score });
    console.log("🔥 Score saved:", score);
  }
}

function listenLeaderboard() {
  const q = query(scoresRef, orderByChild("score"), limitToLast(5));
  onValue(q, snap => {
    leaderboard = [];
    snap.forEach(s => leaderboard.push(s.val()));
    leaderboard.sort((a, b) => b.score - a.score);
  });
}

/* ================= GAME LOOP ================= */
let leaderboard = [];

function update() {
  if (gameOver) return;

  if (moveLeft) player.x -= player.speed;
  if (moveRight) player.x += player.speed;

  velocityY += gravity;
  player.y += velocityY;

  platforms.forEach(p => {
    if (
      player.y + player.height > p.y &&
      player.y + player.height < p.y + p.height &&
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      velocityY > 0
    ) {
      velocityY = -12;
    }
  });

  if (player.y < 250) {
    platforms.forEach(p => p.y += 4);
    player.y = 250;
    score++;
  }

  if (player.y > canvas.height) {
    gameOver = true;
    saveScore();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, 40, 40);

  platforms.forEach(p => {
    ctx.drawImage(platformImg, p.x, p.y, p.width, p.height);
  });

  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 10, 20);

  ctx.fillText("Leaderboard:", 250, 20);
  leaderboard.forEach((l, i) => {
    ctx.fillText(`${i + 1}. ${l.name} - ${l.score}`, 250, 40 + i * 20);
  });
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ================= INPUT ================= */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") moveLeft = true;
  if (e.key === "ArrowRight") moveRight = true;
  if (e.key === "Enter" && gameOver) location.reload();
});

document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") moveLeft = false;
  if (e.key === "ArrowRight") moveRight = false;
});

/* ================= START ================= */
initPlatforms();
listenLeaderboard();
loop();
