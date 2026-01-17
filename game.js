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
let theme = "dark";
let shake = 0;

/* ================= DOM ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nameScreen = document.getElementById("nameScreen");
const startBtn = document.getElementById("startBtn");
const nameInput = document.getElementById("playerNameInput");
const themeToggle = document.getElementById("themeToggle");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

/* ================= PLAYER ================= */
const player = { x: 180, y: 300, width: 40, height: 40, speed: 6, scaleY: 1 };
let moveLeft = false;
let moveRight = false;

/* ================= PLATFORMS ================= */
const platformGap = 80;
const platformCount = 8;
let platforms = [];

function createPlatform(y){
  let type = "static";
  if(score>1500 && Math.random()<0.35) type="break";
  else if(score>800 && Math.random()<0.5) type="move";
  return {x:Math.random()*300,y,width:100,height:16,type,dir:Math.random()<0.5?-1:1,broken:false};
}

function initPlatforms(){
  platforms=[];
  for(let i=0;i<platformCount;i++)
    platforms.push(createPlatform(canvas.height-i*platformGap));
}

/* ================= WEEKLY RESET ================= */
function getWeekKey(){
  const now = new Date();
  const onejan = new Date(now.getFullYear(),0,1);
  const week = Math.ceil((((now-onejan)/86400000)+onejan.getDay()+1)/7);
  return `${now.getFullYear()}-W${week}`;
}
const currentWeek = getWeekKey();

/* ================= PARTICLES ================= */
let particles = [];
function addParticle(x,y,color){
  particles.push({x,y,vx:(Math.random()-0.5)*2,vy:-Math.random()*2,life:30,color});
}
function updateParticles(){
  particles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
  });
  particles = particles.filter(p=>p.life>0);
}

/* ================= IMAGES ================= */
const playerImg = new Image(); playerImg.src="assets/player.gif";
const platformImg = new Image(); platformImg.src="assets/platform.png";
const breakImg = new Image(); breakImg.src="assets/platform_break.png";
const bgLayer1 = new Image(); bgLayer1.src="assets/bg1.png";
const bgLayer2 = new Image(); bgLayer2.src="assets/bg2.png";

/* ================= NAME SCREEN ================= */
function startAfterName(){
  const val=nameInput.value.trim();
  if(val){playerName=val; displayName=val; localStorage.setItem("playerName",val);}
  nameScreen.style.display="none";
  gameStarted=true;
  startGame();
}
if(playerName) startAfterName(); else nameScreen.style.display="flex";
startBtn.onclick=startAfterName;

/* ================= MOBILE ================= */
leftBtn?.ontouchstart = ()=>moveLeft=true;
rightBtn?.ontouchstart = ()=>moveRight=true;
leftBtn?.ontouchend = ()=>moveLeft=false;
rightBtn?.ontouchend = ()=>moveRight=false;

/* ================= THEME ================= */
themeToggle.onclick = ()=>{
  theme = theme==="dark"?"dark-neon":"dark";
  localStorage.setItem("theme",theme);
};

/* ================= INPUT ================= */
document.addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft") moveLeft=true;
  if(e.key==="ArrowRight") moveRight=true;
  if(e.key==="Enter" && gameOver) restart();
});
document.addEventListener("keyup",e=>{
  if(e.key==="ArrowLeft") moveLeft=false;
  if(e.key==="ArrowRight") moveRight=false;
});

/* ================= GAME LOGIC ================= */
function wrapPlayer(){
  if(player.x>canvas.width) player.x=-player.width;
  if(player.x+player.width<0) player.x=canvas.width;
}

function restart(){
  bestScore=Math.max(bestScore,score);
  localStorage.setItem("bestScore",bestScore);
  score=0; velocityY=-10; player.x=180; player.y=300; gameOver=false;
  initPlatforms();
}

function update(){
  if(!gameStarted || gameOver) return;
  if(moveLeft) player.x-=player.speed;
  if(moveRight) player.x+=player.speed;

  velocityY+=0.4;
  player.y+=velocityY;
  wrapPlayer();

  difficulty=Math.min(4,1+Math.floor(score/1000));
  player.speed=6+difficulty*0.6;

  platforms.forEach(p=>{
    if(p.type==="move"){ p.x+=p.dir*(1.2+difficulty*0.4); if(p.x<=0||p.x+p.width>=canvas.width)p.dir*=-1; }
    if(!p.broken && player.y+player.height>p.y && player.y+player.height<p.y+p.height &&
       player.x+player.width>p.x && player.x<p.x+p.width && velocityY>0){
      velocityY=-12;
      p.type==="break" && (p.broken=true);
      shake=5;
      for(let i=0;i<8;i++) addParticle(player.x+20,player.y+40,"#fff");
      player.scaleY=0.5;
    }
  });

  if(player.y<250){
    const diff=250-player.y; player.y=250;
    platforms.forEach(p=>p.y+=diff);
    score+=Math.floor(diff/4);
  }

  while(platforms.length && platforms[0].y>canvas.height){
    platforms.shift();
    platforms.push(createPlatform(platforms[platforms.length-1].y-platformGap));
  }

  if(player.y>canvas.height){gameOver=true; restart();}
}

/* ================= DRAW ================= */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // parallax bg
  ctx.drawImage(bgLayer1,0,(score*0.2)%canvas.height,canvas.width,canvas.height);
  ctx.drawImage(bgLayer2,0,(score*0.4)%canvas.height,canvas.width,canvas.height);

  // screen shake
  ctx.save();
  if(shake>0){ctx.translate(Math.random()*shake,Math.random()*shake); shake--;}

  // platforms
  platforms.forEach(p=>!p.broken && ctx.drawImage(p.type==="break"?breakImg:platformImg,p.x,p.y,p.width,p.height));

  // player squish
  ctx.save();
  ctx.translate(player.x+player.width/2,player.y+player.height/2);
  ctx.scale(1,player.scaleY);
  ctx.drawImage(playerImg,-player.width/2,-player.height/2,player.width,player.height);
  ctx.restore();
  if(player.scaleY<1) player.scaleY+=0.1;

  // particles
  particles.forEach(p=>{
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,2,2);
  });

  // HUD
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

  ctx.restore();
}

/* ================= LOOP ================= */
function loop(){ updateParticles(); update(); draw(); requestAnimationFrame(loop); }

/* ================= START ================= */
function startGame(){ initPlatforms(); loop(); }
