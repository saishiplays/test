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
signInAnonymously(auth).catch(console.error);
onAuthStateChanged(auth, user => uid = user?.uid || null);

/* ================= DOM ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nameScreen = document.getElementById("nameScreen");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("playerNameInput");
const themeToggle = document.getElementById("themeToggle");

let leftBtn, rightBtn, jumpBtn;
document.addEventListener("DOMContentLoaded", () => {
  leftBtn = document.getElementById("leftBtn");
  rightBtn = document.getElementById("rightBtn");
  jumpBtn = document.getElementById("jumpBtn");

  leftBtn?.addEventListener("touchstart", () => moveLeft = true);
  leftBtn?.addEventListener("touchend", () => moveLeft = false);
  rightBtn?.addEventListener("touchstart", () => moveRight = true);
  rightBtn?.addEventListener("touchend", () => moveRight = false);
  jumpBtn?.addEventListener("touchstart", () => {
    if(velocityY>0) velocityY=-10;
    else if(canDoubleJump){ velocityY=-10; canDoubleJump=false; }
    createParticles(player.x+player.width/2, player.y+player.height, "#0f0", 10);
    addShake(3);
  });
});

/* ================= STATE ================= */
let playerName = localStorage.getItem("playerName")||"";
let displayName = playerName || "Anonymous";
let gameStarted=false, gameOver=false, score=0, bestScore=Number(localStorage.getItem("bestScore")||0);
let velocityY=-10, difficulty=1, canDoubleJump=false;
let leaderboard=[], theme="dark";
let playerScale={x:1,y:1};

/* ================= PLAYER ================= */
const player = { x:180, y:300, width:40, height:40, speed:6 };
let moveLeft=false, moveRight=false;

/* ================= IMAGES ================= */
const playerImg = new Image(); playerImg.src="assets/player.gif";
const platformImg = new Image(); platformImg.src="assets/platform.png";
const breakImg = new Image(); breakImg.src="assets/platform_break.png";
const images = [playerImg, platformImg, breakImg];
let imagesLoaded=0;
images.forEach(img=>img.onload=()=>{ imagesLoaded++; if(imagesLoaded===images.length && gameStarted) startGame(); });

/* ================= PLATFORMS ================= */
const platformGap=80, platformCount=8;
let platforms=[];
function createPlatform(y){
  let type="static";
  if(score>1500 && Math.random()<0.35) type="break";
  else if(score>800 && Math.random()<0.5) type="move";
  return { x:Math.random()*300, y, width:100, height:16, type, dir:Math.random()<0.5?-1:1, broken:false };
}
function initPlatforms(){ platforms=[]; for(let i=0;i<platformCount;i++) platforms.push(createPlatform(canvas.height-i*platformGap)); }

/* ================= WEEKLY RESET ================= */
function getWeekKey(){ const now=new Date(); const onejan=new Date(now.getFullYear(),0,1); const week=Math.ceil((((now-onejan)/86400000)+onejan.getDay()+1)/7); return `${now.getFullYear()}-W${week}`; }
const currentWeek=getWeekKey();

/* ================= ANTI-CHEAT ================= */
function validScore(s){ return Number.isInteger(s) && s>=0 && s<=999999; }

/* ================= FIREBASE ================= */
async function saveScore(){
  if(!uid || !validScore(score)) return;
  const userRef = ref(db, `scores/${uid}`);
  const snap = await get(userRef);
  const prev = snap.val();
  if(!prev || score>prev.score) await set(userRef,{ name:displayName, score, week:currentWeek });
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

/* ================= NAME SCREEN ================= */
function startAfterName(){
  const val=nameInput.value.trim();
  if(val){ playerName=val; displayName=val; localStorage.setItem("playerName",val);}
  nameScreen.style.display="none"; gameStarted=true; startGame();
}
if(playerName) startAfterName(); else nameScreen.style.display="flex";
startBtn.onclick=startAfterName;

/* ================= PARTICLES, SHAKE, BACKGROUND ================= */
let particles=[];
function createParticles(x,y,color="#0f0",count=10){ for(let i=0;i<count;i++) particles.push({x,y,vx:(Math.random()-0.5)*3,vy:(Math.random()-1.5)*3,alpha:1,color}); }
function updateParticles(){ particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.alpha-=0.03; }); particles=particles.filter(p=>p.alpha>0); }
function drawParticles(){ particles.forEach(p=>{ ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1; }

let shake={x:0,y:0,intensity:0};
function addShake(intensity=5){ shake.intensity=intensity; }
function applyShake(){ if(shake.intensity>0){ shake.x=(Math.random()-0.5)*shake.intensity; shake.y=(Math.random()-0.5)*shake.intensity; shake.intensity*=0.9; } else { shake.x=0; shake.y=0; } }

const bgLayers=[ {color:"#001",speed:0.2,yOffset:0},{color:"#011",speed:0.5,yOffset:0},{color:"#022",speed:1,yOffset:0} ];
function drawBackground(){ bgLayers.forEach(layer=>{ layer.yOffset+=layer.speed; if(layer.yOffset>canvas.height) layer.yOffset=0; ctx.fillStyle=layer.color; ctx.fillRect(0,layer.yOffset-canvas.height,canvas.width,canvas.height); ctx.fillRect(0,layer.yOffset,canvas.width,canvas.height); }); }

/* ================= INPUT ================= */
themeToggle.onclick = ()=>{ theme=theme==="dark"?"dark-neon":"dark"; localStorage.setItem("theme",theme); };
document.addEventListener("keydown",e=>{ if(e.key==="ArrowLeft") moveLeft=true; if(e.key==="ArrowRight") moveRight=true; if(e.key==="Enter" && gameOver) restart(); });
document.addEventListener("keyup",e=>{ if(e.key==="ArrowLeft") moveLeft=false; if(e.key==="ArrowRight") moveRight=false; });

/* ================= GAME LOGIC ================= */
function wrapPlayer(){ if(player.x>canvas.width) player.x=-player.width; if(player.x+player.width<0) player.x=canvas.width; }
function restart(){ saveScore(); bestScore=Math.max(bestScore,score); localStorage.setItem("bestScore",bestScore); score=0; velocityY=-10; player.x=180; player.y=300; gameOver=false; canDoubleJump=false; initPlatforms(); }

function update(){
  if(!gameStarted || gameOver) return;

  if(moveLeft) player.x-=player.speed;
  if(moveRight) player.x+=player.speed;
  velocityY+=0.3; player.y+=velocityY;
  wrapPlayer();

  difficulty=Math.min(4,1+Math.floor(score/1000));
  player.speed=6+difficulty*0.6;

  platforms.forEach(p=>{
    if(p.type==="move"){ p.x+=p.dir*(1.2+difficulty*0.4); if(p.x<=0||p.x+p.width>=canvas.width) p.dir*=-1; }
    if(!p.broken && player.y+player.height>p.y && player.y+player.height<p.y+p.height && player.x+player.width>p.x && player.x<p.x+p.width && velocityY>0){
      velocityY=-9;
      if(p.type==="break") p.broken=true;
      playerScale.x=1.2; playerScale.y=0.8;
      canDoubleJump=true;
      createParticles(player.x+player.width/2,player.y+player.height,"#0f0",10);
      addShake(5);
    }
  });

  if(player.y<250){ const diff=250-player.y; player.y=250; platforms.forEach(p=>p.y+=diff); score+=Math.floor(diff/4); }
  while(platforms.length && platforms[0].y>canvas.height){ platforms.shift(); platforms.push(createPlatform(platforms[platforms.length-1].y-platformGap)); }
  if(player.y>canvas.height){ gameOver=true; saveScore(); }
}

/* ================= DRAW ================= */
function draw(){
  ctx.save();
  ctx.translate(shake.x,shake.y);
  drawBackground();

  platforms.forEach(p=>{ 
    if(!p.broken){
      ctx.shadowColor="#0f0"; ctx.shadowBlur=8;
      ctx.drawImage(p.type==="break"?breakImg:platformImg,p.x,p.y,p.width,p.height);
      ctx.shadowBlur=0;
    }
  });

  ctx.save();
  ctx.translate(player.x+player.width/2,player.y+player.height/2);
  ctx.scale(playerScale.x,playerScale.y);
  ctx.drawImage(playerImg,-player.width/2,-player.height/2,player.width,player.height);
  ctx.restore();
  playerScale.x=1; playerScale.y=1;

  drawParticles();

  ctx.fillStyle="#fff"; ctx.font="16px monospace";
  ctx.fillText(`User: ${displayName}`,10,20);
  ctx.fillText(`Score: ${score}`,10,40);
  ctx.fillText(`Best: ${bestScore}`,10,60);
  ctx.fillText(`Difficulty: ${difficulty}`,10,80);
  ctx.fillText("Leaderboard (Weekly):",240,20);
  leaderboard.forEach((l,i)=>{ ctx.fillStyle=l.name===displayName?"#0f0":"#fff"; ctx.fillText(`${i+1}. ${l.name} - ${l.score}`,240,40+i*20); });

  if(gameOver){
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#fff"; ctx.font="24px monospace"; ctx.fillText("GAME OVER",120,260);
    ctx.font="14px monospace"; ctx.fillText("Press ENTER to Restart",95,300);
  }

  ctx.restore();
}

/* ================= LOOP ================= */
function loop(){ update(); updateParticles(); applyShake(); draw(); requestAnimationFrame(loop); }

/* ================= START ================= */
function startGame(){ initPlatforms(); listenLeaderboard(); loop(); }
