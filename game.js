console.log("🔥 GAME JS LOADED");

/* ================= FIREBASE ================= */
let db = null;
let scoresRef = null;
let firebaseReady = false;

const firebaseConfig = {
  apiKey: "AIzaSyCmfqvZ43D2Q35yWk1eb7vScmzv6DXz9xU",
  authDomain: "test-3de69.firebaseapp.com",
  projectId: "test-3de69",
  databaseURL: "https://test-3de69-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "test-3de69.firebasestorage.app",
  messagingSenderId: "361141862152",
  appId: "1:361141862152:web:1a897b3932a7d892a7f6bd"
};

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.error("🔥 Firebase NOT loaded!");
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase initialized");
  }

  db = firebase.database();
  scoresRef = db.ref("scores");
  firebaseReady = true;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 DOM loaded → init Firebase");
  initFirebase();
});

/* ================= CANVAS ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ================= GAME STATE ================= */
let playerName = localStorage.getItem("playerName") || "";
let gameStarted = false;
let gameOver = false;
let score = 0;
let velocityY = 0;
const gravity = 0.4;

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

const images = [playerImg, platformImg, breakImg];
let imagesLoaded = 0;

images.forEach(img => {
  img.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === images.length && gameStarted) startGame();
  };
});

/* ================= PLATFORMS ================= */
const platformCount = 8;
const platformGap = 80;
let platforms = [];

function createPlatform(y) {
  return {
    x: Math.random() * 300,
    y,
    width: 100,
    height: 16,
    type: Math.random() < 0.2 ? "break" : "static",
    broken: false
  };
}

function initPlatforms() {
  platforms = [];
  for (let i = 0; i < platformCount; i++) {
    platforms.push(createPlatform(canvas.height - i * platformGap));
  }
}

/* ================= FIREBASE SCORE ================= */
function saveScoreFirebase() {
  if (!firebaseReady || !playerName) return;

  scoresRef.child(playerName).get().then(snapshot => {
    const prev = snapshot.val();
    if (!prev || score > prev.score) {
      scoresRef.child(playerName).set({ name: playerName, score });
      console.log("🔥 Score saved:", score);
    }
  });
}

function listenLeaderboard() {
  if (!firebaseReady) return;

  scoresRef.orderByChild("score").limitToLast(5).on("value", snap => {
    leaderboard = [];
    snap.forEach(s => leaderboard.push(s.val()));
    leaderboard.sort((a, b) => b.score - a.score);
  });
}

/* ================= GAME LOOP ================= */
let leaderboard = [];

function update() {
  if (!gameStarted || gameOver) return;

  if (moveLeft) player.x -= player.speed;
  if (moveRight) player.x += player.speed;

  velocityY += gravity;
  player.y += velocityY;

  platforms.forEach(p => {
    if (
      !p.broken &&
      player.y + player.height > p.y &&
      player.y + player.height < p.y + p.height &&
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      velocityY > 0
    ) {
      velocityY = -12;
      if (p.type === "break") p.broken = true;
    }
  });

  if (player.y < 250) {
    platforms.forEach(p => p.y += 4);
    player.y = 250;
    score++;
  }

  if (player.y > canvas.height) {
    gameOver = true;
    saveScoreFirebase();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, 40, 40);

  platforms.forEach(p => {
    if (!p.broken) ctx.drawImage(platformImg, p.x, p.y, p.width, p.height);
  });

  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 10, 20);
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
if (playerName) {
  gameStarted = true;
  if (imagesLoaded === images.length) startGame();
}
