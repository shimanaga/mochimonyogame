const images = [
  { name: 'かつおぶし', group: 'A', src: 'img/mochi.png', rarity: 1 },
  { name: 'やきもち', group: 'A', src: 'img/mochi_yaki.jpg', rarity: 3 },
  { name: 'デスおぶし', group: 'A', src: 'img/mochi_death.jpg', rarity: 4 },
  { name: 'てつおぶし', group: 'A', src: 'img/mochi_tetsu.jpg', rarity: 5 },
  { name: 'ころすぶし', group: 'A', src: 'img/mochi_kill.jpeg', rarity: 4 },
  { name: 'スナイパーぶし', group: 'A', src: 'img/mochi_snipe.png', rarity: 4 },
  { name: 'おこぶし', group: 'A', src: 'img/mochi_rage.png', rarity: 3 },
  { name: '考えぶし', group: 'A', src: 'img/mochi_think.png', rarity: 3 },
  { name: '御恩と咆哮', group: 'B', src: 'img/houkou.png', rarity: 4 },
  { name: 'ひやけまん', group: 'B', src: 'img/hiyake.png', rarity: 3 },
  { name: '公太郎', group: 'B', src: 'img/hamu.jpg', rarity: 3 },
  { name: 'ぴえんまん', group: 'B', src: 'img/pien.jpg', rarity: 3 },
  { name: 'バナナ猫', group: 'B', src: 'img/banana_cat.jpg', rarity: 3 },
  { name: 'もにょ太', group: 'C', src: 'img/monyo.jpeg', rarity: 1 },
  { name: 'みらくるもにょ太', group: 'C', src: 'img/monyo_miracle.png', rarity: 5 },
  { name: 'かさもにょ太', group: 'C', src: 'img/monyo_kasa.png', rarity: 3 },
  { name: 'バドもにょ太', group: 'C', src: 'img/monyo_bad.png', rarity: 2 },
  { name: 'おこもにょ太', group: 'C', src: 'img/monyo_rage.png', rarity: 3 },
  { name: '考えもにょ太', group: 'C', src: 'img/monyo_think.png', rarity: 3 },
  { name: '朝ごはんもにょ太', group: 'C', src: 'img/monyo_morning.png', rarity: 2 },
  { name: '完全栄養食もにょ太', group: 'C', src: 'img/monyo_ramen.png', rarity: 2 },
];

let playerName = '';
let correctCount = 0;
let currentStreak = 0;
let maxStreak = 0;
let score = 0;
let questionHistory = [];
let timerInterval, endTime;

const gameScreen = document.getElementById('game-screen');
const scoreDisplay = document.getElementById('score-display');
const scoreDelta   = document.getElementById('score-delta');
const timerEl      = document.getElementById('timer');
const countdownEl  = document.getElementById('countdown');
const imgEl        = document.getElementById('question-img');
const feedbackEl   = document.getElementById('feedback');
const historyList  = document.getElementById('history-list');
const buttonsWrap  = document.getElementById('buttons');
const correctCountEl = document.getElementById('correct-count');
const maxStreakEl  = document.getElementById('max-streak');
const finalScoreEl = document.getElementById('final-score');
const rankingList  = document.getElementById('ranking-list');
const titleScreen  = document.getElementById('title-screen');
const resultScreen = document.getElementById('result-screen');
const rankingScreen = document.getElementById('ranking-screen');
const startBtn     = document.getElementById('start-btn');
const viewRankingBtn = document.getElementById('view-ranking-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const backToTitleBtn = document.getElementById('back-to-title-btn');
const rankingBackBtn = document.getElementById('ranking-back-btn');
const playerNameInput = document.getElementById('player-name');

const groupLabels = {
  'A': 'もち',
  'B': 'その他',
  'C': 'もにょ'
};

Object.entries(groupLabels).forEach(([group, label]) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.dataset.group = group;
  btn.className = 'btn answer';
  buttonsWrap.appendChild(btn);
});
const buttons = buttonsWrap.querySelectorAll('button');

async function saveRankingToServer(name, score) {
  const rankingRef = firebase.firestore().collection("ranking");
  await rankingRef.add({ name, score, timestamp: Date.now() });
}

async function loadRankingFromServer() {
  const snapshot = await firebase.firestore().collection("ranking")
    .orderBy("score", "desc")
    .limit(10)
    .get();
  return snapshot.docs.map(doc => doc.data());
}

async function updateRanking() {
  await saveRankingToServer(playerName, score);
}

async function showRanking() {
  rankingList.innerHTML = '読み込み中...';
  const ranking = await loadRankingFromServer();
  rankingList.innerHTML = '';
  ranking.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - ${item.score}`;
    rankingList.appendChild(li);
  });
}
function showScreen(s){ [titleScreen, gameScreen, resultScreen, rankingScreen].forEach(x=>x.classList.add('hidden')); s.classList.remove('hidden'); }

function startCountdown(){
  gameScreen.classList.add('countdown-mode');
  let c=3;
  countdownEl.textContent = c;
  const ci = setInterval(()=>{
    c--;
    if(c>0) countdownEl.textContent = c;
    else {
      clearInterval(ci);
      countdownEl.textContent = '';
      gameScreen.classList.remove('countdown-mode');
      startTimer();
      nextQuestion();
    }
  },1000);
}
function startTimer(){ const dur=60*1000; endTime=Date.now()+dur; timerInterval=setInterval(()=>{ const rem=endTime-Date.now(); if(rem<=0){ clearInterval(timerInterval); timerEl.textContent='00:00.000'; endGame(); } else{ const ms=rem%1000; const s=Math.floor(rem/1000)%60; const m=Math.floor(rem/60000); timerEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`; } },16); }

function getBasePool(){ const groups=['A','B','C']; let pool=[]; groups.forEach(g=>{ const grp=images.filter(i=>i.group===g); const minR=Math.min(...grp.map(i=>i.rarity)); pool.push(...grp.filter(i=>i.rarity===minR)); }); return pool; }

function pickQuestion(){
  let pool;
  if(score <= 200) {
    pool = images.filter(i => i.rarity === 1);
  } else {
    pool = images;
  }
  return pool[Math.floor(Math.random()*pool.length)];
}
function nextQuestion(){ const q=pickQuestion(); imgEl.src=q.src; imgEl.dataset.answer=q.group; imgEl.dataset.name=q.name; imgEl.dataset.rarity=q.rarity; }

function renderHistory(){ historyList.innerHTML=''; questionHistory.forEach(item=>{ const li=document.createElement('li'); const spanName=document.createElement('span'); spanName.textContent=item.name; const spanStar=document.createElement('span'); spanStar.className='star'; spanStar.textContent='★'.repeat(item.rarity)+'☆'.repeat(5-item.rarity); li.appendChild(spanName); li.appendChild(spanStar); historyList.appendChild(li); }); }

buttons.forEach(btn=>btn.addEventListener('click',()=>{ const ans=btn.dataset.group; const corr=imgEl.dataset.answer; const qName=imgEl.dataset.name; const qR=+imgEl.dataset.rarity; questionHistory.unshift({name:qName,rarity:qR}); if(questionHistory.length>10) questionHistory.pop(); renderHistory(); let delta=0; if(ans===corr){ currentStreak++; delta=20+(currentStreak-1); correctCount++; maxStreak=Math.max(maxStreak,currentStreak); } else { currentStreak=0; delta=-15; } score+=delta; if(score<0) score=0; scoreDisplay.textContent=`スコア: ${score}`; scoreDelta.textContent=`${delta>0?'+'+delta:delta}`; scoreDelta.className=`delta ${delta>0?'plus':'minus'}`; setTimeout(()=>{ scoreDelta.textContent=''; scoreDelta.className='delta'; },800); showFeedback(ans===corr); }));

function showFeedback(ok){ feedbackEl.textContent=ok?'○':'×'; feedbackEl.classList.remove('hidden'); setTimeout(()=>{ feedbackEl.classList.add('hidden'); nextQuestion(); },200); }

function endGame(){ clearInterval(timerInterval); updateRanking(); correctCountEl.textContent=correctCount; maxStreakEl.textContent=maxStreak; finalScoreEl.textContent=score; showScreen(resultScreen); }

startBtn.onclick=()=>{ playerName=playerNameInput.value.trim()||'名無しのもにょ'; correctCount=0; currentStreak=0; maxStreak=0; score=0; questionHistory=[]; scoreDisplay.textContent='スコア: 0'; renderHistory(); showScreen(gameScreen); startCountdown(); };
playAgainBtn.onclick=()=>startBtn.click(); backToTitleBtn.onclick=()=>showScreen(titleScreen); viewRankingBtn.onclick=()=>{ showRanking(); showScreen(rankingScreen); }; rankingBackBtn.onclick=()=>showScreen(titleScreen);
