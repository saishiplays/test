console.log("🔥 GAME JS LOADED");

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyCmfqvZ43D2Q35yWk1eb7vScmzv6DXz9xU",
  authDomain: "test-3de69.firebaseapp.com",
  projectId: "test-3de69",
  databaseURL: "https://test-3de69-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "test-3de69.appspot.com",
  messagingSenderId: "361141862152",
  appId: "1:361141862152:web:1a897b3932a7d892a7f6bd",
  measurementId: "G-V0LCZRWRN6"
};

// ================= FIREBASE VARIABLES =================
let db, scoresRef;

// ================= FIREBASE INITIALIZATION =================
function initFirebase() {
  if (typeof firebase === "undefined") {
    console.error("🔥 Firebase NOT loaded! Check script order.");
    return;
  }
  console.log("🔥 Firebase loaded!");
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  scoresRef = db.ref("scores");
}

// ================= FIREBASE READY CHECK =================
function firebaseReady(callback) {
  if (!scoresRef) {
    console.error("🔥 Firebase not ready yet!");
    return;
  }

  scoresRef.limitToFirst(1).once("value")
    .then(() => {
      console.log("🔥 Firebase is ready!");
      callback();
    })
    .catch(err => {
      console.warn("🔥 Firebase not ready, retrying...", err);
      setTimeout(() => firebaseReady(callback), 500);
    });
}

// ================= CANVAS =================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ================= PLAYER & GAME STATE =================
let playerName = localStorage.getItem("playerName") || "";
let gameStarted = false;
let gameOver = false;
let score = 0;
let velocityY = 0;
const gravity = 0.4;
const player = { x: 180, y: 300, width: 40, height: 40, speed: 6 };
let moveLeft = false;
let moveRight = false;

// ================= PLATFORMS =================
const platformCount = 8;
const platformGap = 80;
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

// ================= IMAGES =================
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
    console.log("🔥 Image loaded:", img.src);
    if (imagesLoaded === images.length && gameStarted) {
      firebaseReady(startGame);
    }
  };
});

// ================= NAME SCREEN =================
const nameScreen = document.getElementById("nameScreen");
const startBtn = document.getElementById("startBtn");

function startAfterName() {
  console.log(`🔥 Starting game for player: ${playerName}`);
  nameScreen.style.display = "none";
  gameStarted = true;
  if (imagesLoaded === images.length) {
    firebaseReady(startGame);
  }
}

if (playerName) startAfterName();
else nameScreen.style.display = "flex";

startBtn.onclick = () => {
  const val = document.getElementById("playerNameInput").value.trim();
  if (!val) return;
  playerName = val;
  localStorage.setItem("playerName", playerName);
  startAfterName();
};

// ================= CONTROLS =================
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") moveLeft = true;
  if (e.key === "ArrowRight") moveRight = true;
  if (e.key === "Enter" && gameOver) restart();
});
document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") moveLeft = false;
  if (e.key === "ArrowRight") moveRight = false;
});

// ================= HELPERS =================
function wrapPlayer() {
  if (player.x > canvas.width) player.x = -player.width;
  if (player.x + player.width < 0) player.x = canvas.width;
}

// ================= FIREBASE SCORE =================
function saveScoreFirebase() {
  if (!playerName || !scoresRef) return;
  scoresRef.child(playerName).get().then(snapshot => {
    const prev = snapshot.val();
    if (!prev || score > prev.score) {
      scoresRef.child(playerName).set({ name: playerName, score });
      console.log(`🔥 Score saved for ${playerName}: ${score}`);
    }
  });
}

function listenLeaderboard() {
  if (!scoresRef) return;
  scoresRef.orderByChild("score").limitToLast(5).on("value", snap => {
    const arr = [];
    snap.forEach(s => arr.push(s.val()));
    leaderboard = arr.sort((a,b)=>b.score-a.score);
  });
}

// ================= GAME FUNCTIONS =================
function restart() {
  saveScoreFirebase();
  gameOver = false;
  score = 0;
  velocityY = -10;
  player.x = 180;
  player.y = 300;
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
    platforms.forEach(p => p.y += 4);
    player.y = 250;
    score++;
  }

  platforms.forEach(p => {
    if (p.y > canvas.height) Object.assign(p, createPlatform(0));
  });

  if (player.y > canvas.height) {
    gameOver = true;
    saveScoreFirebase();
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  platforms.forEach(p => {
    if (!p.broken) {
      const img = p.type === "break" ? breakImg : platformImg;
      ctx.drawImage(img,p.x,p.y,p.width,p.height);
    }
  });

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`Player: ${playerName}`, 10, 20);
  ctx.fillText(`Score: ${score}`, 10, 40);

  ctx.fillText("Leaderboard:", 250, 20);
  leaderboard.forEach((l,i)=>{
    ctx.fillStyle = l.name===playerName?"#0f0":"#fff";
    ctx.fillText(`${i+1}. ${l.name} - ${l.score}`, 250, 40+i*20);
  });

  if (gameOver) {
    ctx.fillStyle="rgba(0,0,0,0.7)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff";
    ctx.font="24px monospace";
    ctx.fillText("GAME OVER",120,260);
    ctx.font="14px monospace";
    ctx.fillText("Press ENTER to Restart",95,300);
  }
}

// ================= LOOP =================
function startGame() {
  initPlatforms();
  listenLeaderboard();
  loop();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ================= START =================
initFirebase(); // Initialize Firebase immediately
