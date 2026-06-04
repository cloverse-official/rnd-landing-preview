// [랜딩2] 기능 폼 로직: 필수검증 · 박사 동적노출 · 글자수 카운터 · 완료화면
// (디자인은 랜딩3에서)

var API_URL = "https://script.google.com/macros/s/AKfycby8VjhtUbWPrgBvBrQzjS3S737EeaTmluDp9dl-n9cxWo9bCAMIp_sGjUQILHZtKzai/exec";

var MIN = 20, MAX = 50;

var form = document.getElementById("signup-form");
var msg = document.getElementById("msg");
var eduLevel = document.getElementById("edu-level");
var phdFields = document.getElementById("phd-fields");
var phone = document.getElementById("phone");

// 글자수 셀 때 앞뒤 공백 제외 + 이모지 등도 1글자로
function charLen(s) { return [...String(s || "").trim()].length; }

// 1) 박사 칸 동적 노출: 박사 선택일 때만 보이기 (아니면 숨기고 값 비움)
function togglePhd() {
  var v = eduLevel.value;
  var isPhd = (v === "박사재학" || v === "박사졸업");
  phdFields.hidden = !isPhd;
  if (!isPhd) {
    var inputs = phdFields.querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) inputs[i].value = "";
  }
}
eduLevel.addEventListener("change", togglePhd);

// 2) 글자수 카운터 (실시간)
function bindCounter(inputId, counterId) {
  var input = document.getElementById(inputId);
  var counter = document.getElementById(counterId);
  function update() {
    var n = charLen(input.value);
    counter.textContent = n + " / " + MAX + "자 (최소 " + MIN + "자)";
    counter.classList.toggle("bad", n < MIN || n > MAX);
  }
  input.addEventListener("input", update);
  update();
}
bindCounter("intro", "intro-counter");
bindCounter("ideal", "ideal-counter");

// 3) 전화번호: 숫자만 남기기
phone.addEventListener("input", function () {
  phone.value = phone.value.replace(/[^0-9]/g, "");
});

// 폼 값 모으기
function getData() {
  var fd = new FormData(form);
  var data = {};
  fd.forEach(function (v, k) { data[k] = v; });
  return data;
}

// 4) 검증: 문제가 있으면 안내 문구 반환, 없으면 null
function validate(data) {
  var isPhd = (data["학력단계"] === "박사재학" || data["학력단계"] === "박사졸업");
  function empty(k) { return !data[k] || !String(data[k]).trim(); }

  if (empty("이름")) return "이름을 입력해 주세요.";
  if (empty("학력단계")) return "학력단계를 선택해 주세요.";
  if (empty("학부_대학교")) return "학부 대학교를 입력해 주세요.";
  if (empty("학부_전공")) return "학부 전공을 입력해 주세요.";
  if (empty("석사_대학교")) return "석사 대학교를 입력해 주세요.";
  if (empty("석사_전공")) return "석사 전공을 입력해 주세요.";
  if (isPhd && empty("박사_대학교")) return "박사 대학교를 입력해 주세요.";
  if (isPhd && empty("박사_전공")) return "박사 전공을 입력해 주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data["이메일"] || "")) return "올바른 이메일 주소를 입력해 주세요.";
  if (!/^[0-9]{9,}$/.test(data["전화번호"] || "")) return "전화번호를 숫자만(9자리 이상) 입력해 주세요.";
  var h = Number(data["키"]);
  if (!h || h < 140 || h > 220) return "키는 140~220(cm) 사이 숫자로 입력해 주세요.";
  if (charLen(data["한줄소개"]) < MIN || charLen(data["한줄소개"]) > MAX) return "'나를 한 줄로'는 " + MIN + "~" + MAX + "자로 입력해 주세요.";
  if (charLen(data["한줄이상형"]) < MIN || charLen(data["한줄이상형"]) > MAX) return "'이상형 한 줄로'는 " + MIN + "~" + MAX + "자로 입력해 주세요.";
  return null;
}

// 5) 제출
form.addEventListener("submit", function (e) {
  e.preventDefault();
  var data = getData();

  var err = validate(data);
  if (err) {
    msg.style.color = "#d33";
    msg.textContent = "⚠️ " + err;
    return;
  }

  msg.style.color = "#333";
  msg.textContent = "⏳ 제출 중...";

  fetch(API_URL, { method: "POST", body: JSON.stringify(data) })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (result.result === "success") {
        document.getElementById("form-wrap").style.display = "none";
        document.getElementById("thanks").style.display = "block";
        window.scrollTo(0, 0);
      } else if (result.result === "duplicate") {
        msg.style.color = "#d33";
        msg.textContent = "⚠️ " + (result.message || "이미 신청한 이메일입니다.");
      } else {
        msg.style.color = "#d33";
        msg.textContent = "❌ 오류: " + (result.message || "알 수 없는 오류");
      }
    })
    .catch(function (err) {
      msg.style.color = "#d33";
      msg.textContent = "❌ 전송 실패: " + err.message;
    });
});
