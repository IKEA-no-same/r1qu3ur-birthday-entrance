const BLOG_URL = "https://r1qu3ur-31birthday-2026.blogspot.com/";

const questions = [
  {
    title: "あなたはR1Qu3urですか？",
    subtext: "祝福対象者の本人確認を行います。",
    yes: "はい",
    no: "いいえ"
  },
  {
    title: "祝われたいですか？",
    subtext: "回答内容は誕生日サーバーへ送信されます（大嘘）。",
    yes: "はい",
    no: "いいえ"
  },
  {
    title: "本当に覚悟はできていますか？",
    subtext: "警告：この先には平成の残留思念が含まれます。",
    yes: "もちろん",
    no: "まだです"
  }
];

const taunts = [
  "残念！", "遅い！", "そっちじゃないです", "逃げました", "選択権はありません",
  "本当に『いいえ』ですか？", "マウスさばきを検出しました", "あと少し！（大嘘）"
];

const question = document.querySelector("#question");
const subtext = document.querySelector("#subtext");
const yesButton = document.querySelector("#yes");
const noButton = document.querySelector("#no");
const buttons = document.querySelector("#buttons");
const message = document.querySelector("#message");
const progressWrap = document.querySelector("#progressWrap");
const progressBar = document.querySelector("#progressBar");
const progressLabel = document.querySelector("#progressLabel");

let step = 0;
let escapes = 0;

function showQuestion() {
  const item = questions[step];
  question.textContent = item.title;
  subtext.textContent = item.subtext;
  yesButton.textContent = item.yes;
  noButton.textContent = item.no;
  noButton.style.left = "calc(50% + 25px)";
  noButton.style.top = "10px";
  message.textContent = "※『いいえ』を選択する場合は正確にクリックしてください。";
}

function moveNoButton() {
  const area = buttons.getBoundingClientRect();
  const button = noButton.getBoundingClientRect();
  const maxX = Math.max(0, area.width - button.width);
  const maxY = Math.max(0, area.height - button.height);
  noButton.style.left = `${Math.random() * maxX}px`;
  noButton.style.top = `${Math.random() * maxY}px`;
  message.textContent = taunts[escapes++ % taunts.length];
}

function isPointerNearNoButton(event) {
  const box = noButton.getBoundingClientRect();
  const nearestX = Math.max(box.left, Math.min(event.clientX, box.right));
  const nearestY = Math.max(box.top, Math.min(event.clientY, box.bottom));
  return Math.hypot(event.clientX - nearestX, event.clientY - nearestY) < 85;
}

document.addEventListener("pointermove", event => {
  if (!buttons.hidden && event.pointerType !== "touch" && isPointerNearNoButton(event)) {
    moveNoButton();
  }
});

noButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  moveNoButton();
});

yesButton.addEventListener("click", () => {
  step += 1;
  if (step < questions.length) {
    showQuestion();
    return;
  }
  finishVerification();
});

document.querySelector(".close").addEventListener("click", () => {
  message.textContent = "終了は許可されていません。";
  document.querySelector(".window").animate(
    [{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }],
    { duration: 180, iterations: 2 }
  );
});

function finishVerification() {
  buttons.hidden = true;
  message.hidden = true;
  progressWrap.hidden = false;
  question.textContent = "本人確認に成功しました！";
  subtext.textContent = "祝福会場への接続を開始します。";
  throwConfetti();

  let progress = 0;
  const timer = setInterval(() => {
    progress += Math.ceil(Math.random() * 13);
    if (progress >= 100) {
      progress = 100;
      clearInterval(timer);
      progressLabel.textContent = "接続完了！祝福会場へ転送します……";
      setTimeout(() => location.href = BLOG_URL, 1200);
    }
    progressBar.style.width = `${progress}%`;
  }, 130);
}

function throwConfetti() {
  const colors = ["#ff00ff", "#00ffff", "#ffff00", "#00ff00", "#ff0000"];
  for (let i = 0; i < 80; i += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--fall", `${1.8 + Math.random() * 2}s`);
    piece.style.setProperty("--drift", `${-120 + Math.random() * 240}px`);
    piece.style.animationDelay = `${Math.random() * .8}s`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

showQuestion();
