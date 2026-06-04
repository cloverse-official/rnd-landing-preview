// RnD 블렌드 — 신청 페이지 폼 로직
// 검증 · 박사 동적노출 · 글자수 · 제출 성공 시 완료 페이지(done.html)로 이동

var API_URL = "https://script.google.com/macros/s/AKfycby8VjhtUbWPrgBvBrQzjS3S737EeaTmluDp9dl-n9cxWo9bCAMIp_sGjUQILHZtKzai/exec";
var MIN = 20, MAX = 50;

var form = document.getElementById("signup-form");
var msg = document.getElementById("msg");
var eduLevel = document.getElementById("edu-level");
var phdFields = document.getElementById("phd-fields");
var phone = document.getElementById("phone");

// 이메일 인증 (데모: 백엔드 미연결 — 실제 발송/검증은 서버 연동 시 동작)
var emailField = document.getElementById("email-field");
var emailInput = document.getElementById("email");
var emailCode = document.getElementById("email-code");
var sendCodeBtn = document.getElementById("send-code");
var checkCodeBtn = document.getElementById("check-code");
var codeRow = document.getElementById("code-row");
var verifyMsg = document.getElementById("verify-msg");
var emailVerified = false;

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setVerifyMsg(text, cls) {
  verifyMsg.textContent = text;
  verifyMsg.classList.remove("ok", "bad");
  if (cls) verifyMsg.classList.add(cls);
}

// [인증번호 받기] — 이메일 형식 확인 후 인증번호 입력란 노출 (데모: 실제 발송은 백엔드 연결 시)
sendCodeBtn.addEventListener("click", function () {
  if (!EMAIL_RE.test((emailInput.value || "").trim())) {
    setVerifyMsg("올바른 이메일을 입력해 주세요.", "bad");
    return;
  }
  codeRow.hidden = false;
  setVerifyMsg("인증번호를 보냈어요. (데모 — 백엔드 연결 시 실제 발송됩니다)", null);
  sendCodeBtn.textContent = "재전송";
  emailCode.focus();
});

// [확인] — 6자리 숫자면 인증 완료 (데모: 어떤 6자리 코드든 통과 / 실제 검증은 백엔드 연결 시)
checkCodeBtn.addEventListener("click", function () {
  if (!/^[0-9]{6}$/.test((emailCode.value || "").trim())) {
    setVerifyMsg("인증번호 6자리를 입력해 주세요.", "bad");
    return;
  }
  emailVerified = true;
  setVerifyMsg("✓ 이메일 인증 완료", "ok");
  emailInput.disabled = true;
  emailCode.disabled = true;
  sendCodeBtn.disabled = true;
  checkCodeBtn.disabled = true;
  emailField.classList.add("verified");
});

function charLen(s) { return [...String(s || "").trim()].length; }

function togglePhd() {
  var isPhd = (eduLevel.value === "박사재학" || eduLevel.value === "박사졸업");
  phdFields.hidden = !isPhd;
  if (!isPhd) { var i = phdFields.querySelectorAll("input"); for (var k = 0; k < i.length; k++) i[k].value = ""; }
}
eduLevel.addEventListener("change", togglePhd);

function bindCounter(inputId, counterId) {
  var input = document.getElementById(inputId), counter = document.getElementById(counterId);
  function update() {
    var n = charLen(input.value);
    counter.textContent = n + " / " + MAX + "자 (최소 " + MIN + "자)";
    counter.classList.toggle("bad", n < MIN || n > MAX);
  }
  input.addEventListener("input", update); update();
}
bindCounter("intro", "intro-counter");
bindCounter("ideal", "ideal-counter");

phone.addEventListener("input", function () { phone.value = phone.value.replace(/[^0-9]/g, ""); });

function getData() {
  var fd = new FormData(form), d = {};
  fd.forEach(function (v, k) { d[k] = v; });
  // 인증 완료 시 #email은 disabled 상태라 FormData에서 빠지므로 값 보강
  if (emailInput && (!d["이메일"] || !String(d["이메일"]).trim())) d["이메일"] = emailInput.value;
  return d;
}

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

form.addEventListener("submit", function (e) {
  e.preventDefault();
  var data = getData();
  var err = validate(data);
  if (err) { msg.style.color = "#d33"; msg.textContent = "⚠️ " + err; return; }
  // 이메일 형식 통과 후 — 인증 미완료면 제출 차단
  if (!emailVerified) { msg.style.color = "#d33"; msg.textContent = "⚠️ 이메일 인증을 완료해 주세요."; return; }
  data["이메일인증여부"] = emailVerified ? "TRUE" : "FALSE";
  msg.style.color = "#333"; msg.textContent = "⏳ 제출 중...";
  fetch(API_URL, { method: "POST", body: JSON.stringify(data) })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (result.result === "success") {
        // 중계기가 순번(position)을 주면 완료 페이지로 전달 (지금은 없으면 생략)
        var q = (result.position ? "?pos=" + encodeURIComponent(result.position) : "");
        window.location.href = "done.html" + q;
      } else if (result.result === "duplicate") {
        msg.style.color = "#d33"; msg.textContent = "⚠️ " + (result.message || "이미 신청한 이메일입니다.");
      } else {
        msg.style.color = "#d33"; msg.textContent = "❌ 오류: " + (result.message || "알 수 없는 오류");
      }
    })
    .catch(function (err) { msg.style.color = "#d33"; msg.textContent = "❌ 전송 실패: " + err.message; });
});
