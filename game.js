/* ================= FIREBASE (MODULAR) ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, set, get, onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ================= CONFIG ================= */
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
onAuthStateChanged(auth, user => uid = user?.uid || null);

/* ================= DOM ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nameScreen = document.getElementById("nameScreen");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("playerNameInput");
const themeToggle = document.getElementById("themeToggle");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

/* ================= STATE ================= */
let playerName = localStorage.getItem("playerName") || "";
let displayName = playerName || "Anonymous";
let gameStarted = false;
let gameOver = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let velocityY = -10;
let difficulty = 1;
let leaderboard = [];
let theme = localStorage.getItem("theme") || "dark";

/* ================= PLAYER ================= */
const player = { x: 180, y: 300, width: 40, height: 40, speed: 6 };
let moveLeft = false;
let moveRight = false;

/* ================= IMAGES ================= */
const playerImg = new Image(); playerImg.src = "assets/player.gif";
const platformImg = new Image(); platformImg.src = "assets/platform.png";
const breakImg = new Image(); breakImg.src = "assets/platform_break.png";

const images = [playerImg, platformImg, breakImg];
let imagesLoaded = 0;
images.forEach(img => img.onload = () => {
  imagesLoaded++;
  if (imagesLoaded === images.length && gameStarted) startGame();
});

/* ================= PLATFORMS ================= */
const platformGap = 80;
const platformCount = 8;
let platforms = [];

function createPlatform(y) {
  let type = "static";
  if (score > 1500 && Math.random() < 0.35) type = "break";
  else if (score > 800 && Math.random() < 0.5) type = "move";
  return { x: Math.random()*300, y, width:100, height:16, type, dir: Math.random()<0.5?-1:1, broken:false };
}

function initPlatforms() {
  platforms = [];
  for (let i=0;i<platformCount;i++) platforms.push(createPlatform(canvas.height-i*platformGap));
}

/* ================= WEEKLY RESET ================= */
function getWeekKey() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(),0,1);
  const week = Math.ceil((((now-onejan)/86400000)+onejan.getDay()+1)/7);
  return `${now.getFullYear()}-W${week}`;
}
const currentWeek = getWeekKey();

/* ================= ANTI-CHEAT ================= */
function validScore(s){ return Number.isInteger(s) && s>=0 && s<=999999; }

/* ================= FIREBASE SCORE ================= */
async function saveScore(){
  if(!uid || !validScore(score)) return;
  const userRef = ref(db, `scores/${uid}`);
  const snap = await get(userRef);
  const prev = snap.val();
  if(!prev || score > prev.score){
    await set(userRef, { name: displayName, score, week: currentWeek });
  }
}

function listenLeaderboard(){
  const q = query(ref(db,"scores"), orderByChild("week"));
  onValue(q, snap=>{
    leaderboard=[];
    snap.forEach(s=>{
      const v=s.val();
      if(v.week===currentWeek) leaderboard.push(v);
    });
    leaderboard.sort((a,b)=>b.score-b.score);
    leaderboard = leaderboard.slice(0,5);
  });
}

/* ================= START GAME ================= */
function startGame() {
  initPlatforms();
  listenLeaderboard();
  loop();
}

/* ================= NAME SCREEN ================= */
function startAfterName(){
  const val=nameInput.value.trim();
  if(val){ playerName=val; displayName=val; localStorage.setItem("playerName",val);}
  nameScreen.style.display="none";
  gameStarted=true;
  startGame();
}

if(playerName) startAfterName();
else nameScreen.style.display="flex";
startBtn.onclick=startAfterName;

/* ================= MOBILE CONTROLS ================= */
if(leftBtn && rightBtn){
  leftBtn.ontouchstart = () => moveLeft=true;
  rightBtn.ontouchstart = () => moveRight=true;
  leftBtn.ontouchend = () => moveLeft=false;
  rightBtn.ontouchend = () => moveRight=false;
}

/* ================= THEME ================= */
if(themeToggle){
  themeToggle.onclick = () => {
    theme = theme==="dark"?"dark-neon":"dark";
    localStorage.setItem("theme",theme);
  };
}

/* ================= INPUT ================= */
document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") moveLeft=true;
  if(e.key==="ArrowRight") moveRight=true;
  if(e.key==="Enter" && gameOver) restart();
});
document.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft") moveLeft=false;
  if(e.key==="ArrowRight") moveRight=false;
});

/* ================= GAME LOGIC ================= */
function wrapPlayer(){
  if(player.x>canvas.width) player.x=-player.width;
  if(player.x+player.width<0) player.x=canvas.width;
}

function restart(){
  saveScore();
  bestScore=Math.max(bestScore,score);
  localStorage.setItem("bestScore",bestScore);
  score=0; velocityY=-10; player.x=180; player.y=300;
  gameOver=false;
  initPlatforms();
}

function update(){
  if(!gameStarted || gameOver) return;

  if(moveLeft) player.x-=player.speed;
  if(moveRight) player.x+=player.speed;

  velocityY+=0.4;
  player.y+=velocityY;
  wrapPlayer();

  difficulty = Math.min(4, 1 + Math.floor(score/1000));
  player.speed = 6 + difficulty*0.6;

  platforms.forEach(p=>{
    if(p.type==="move"){
      p.x += p.dir*(1.2+difficulty*0.4);
      if(p.x<=0 || p.x+p.width>=canvas.width) p.dir*=-1;
    }
    if(!p.broken &&
       player.y+player.height>p.y &&
       player.y+player.height<p.y+p.height &&
       player.x+player.width>p.x &&
       player.x<p.x+p.width &&
       velocityY>0){
      velocityY=-12;
      if(p.type==="break") p.broken=true;
    }
  });

  if(player.y<250){
    const diff=250-player.y;
    player.y=250;
    platforms.forEach(p=>p.y+=diff);
    score+=Math.floor(diff/4);
  }

  while(platforms.length && platforms[0].y>canvas.height){
    platforms.shift();
    platforms.push(createPlatform(platforms[platforms.length-1].y-platformGap));
  }

  if(player.y>canvas.height){
    gameOver=true;
    saveScore();
  }
}

/* ================= DRAW ================= */
function draw(){
  ctx.fillStyle=theme==="dark"?"#000":"#020b1f";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.drawImage(playerImg,player.x,player.y,player.width,player.height);

  platforms.forEach(p=>{
    if(!p.broken) ctx.drawImage(p.type==="break"?breakImg:platformImg,p.x,p.y,p.width,p.height);
  });

  ctx.fillStyle="#fff";
  ctx.font="16px monospace";
  ctx.fillText(`User: ${displayName}`,10,20);
  ctx.fillText(`Score: ${score}`,10,40);
  ctx.fillText(`Best: ${bestScore}`,10,60);
  ctx.fillText(`Difficulty: ${difficulty}`,10,80);

  ctx.fillText("Leaderboard (Weekly):",240,20);
  leaderboard.forEach((l,i)=>{
    ctx.fillStyle=l.name===displayName?"#0f0":"#fff";
    ctx.fillText(`${i+1}. ${l.name} - ${l.score}`,240,40+i*20);
  });

  if(gameOver){
    ctx.fillStyle="rgba(0,0,0,0.7)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff";
    ctx.font="24px monospace";
    ctx.fillText("GAME OVER",120,260);
    ctx.font="14px monospace";
    ctx.fillText("Press ENTER to Restart",95,300);
  }
}

/* ================= LOOP ================= */
function loop(){ update(); draw(); requestAnimationFrame(loop); }
