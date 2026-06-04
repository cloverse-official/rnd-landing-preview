// [RnD 랜딩 시안] 공통 폼 로직 — 검증 · 박사 동적노출 · 글자수 · 제출 → 완료화면
// 모든 버전(v1/v2/v3)이 공유합니다. 완료화면(#thanks) 내용은 버전마다 다르게 둡니다.

var API_URL = "https://script.google.com/macros/s/AKfycby8VjhtUbWPrgBvBrQzjS3S737EeaTmluDp9dl-n9cxWo9bCAMIp_sGjUQILHZtKzai/exec";

var MIN = 20, MAX = 50;

var form = document.getElementById("signup-form");
var msg = document.getElementById("msg");
var eduLevel = document.getElementById("edu-level");
var phdFields = document.getElementById("phd-fields");
var phone = document.getElementById("phone");

// 이메일 형식 검사용 정규식 (제출 검증과 동일하게 재사용)
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이메일 인증 상태 (데모 — 실제 발송/검증은 추후 백엔드 연동)
var emailVerified = false;

function charLen(s) { return [...String(s || "").trim()].length; }

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

phone.addEventListener("input", function () {
  phone.value = phone.value.replace(/[^0-9]/g, "");
});

// ── 이메일 인증 플로우 (데모) ──
// 지금은 프런트엔드 데모: 6자리면 통과합니다.
// 실제 인증번호 발송/검증은 추후 백엔드 연동 시 처리됩니다.
var emailInput = document.getElementById("email");
var emailField = document.getElementById("email-field");
var sendCodeBtn = document.getElementById("send-code");
var codeRow = document.getElementById("code-row");
var emailCodeInput = document.getElementById("email-code");
var checkCodeBtn = document.getElementById("check-code");
var verifyMsg = document.getElementById("verify-msg");

function setVerifyMsg(text, cls) {
  if (!verifyMsg) return;
  verifyMsg.textContent = text;
  verifyMsg.className = "verify-msg" + (cls ? " " + cls : "");
}

// 요소가 모두 있을 때만 리스너 연결 (다른 페이지에서 오류 방지)
if (sendCodeBtn && checkCodeBtn && emailInput && emailCodeInput && codeRow && verifyMsg && emailField) {
  sendCodeBtn.addEventListener("click", function () {
    if (!EMAIL_RE.test((emailInput.value || "").trim())) {
      setVerifyMsg("올바른 이메일을 입력해 주세요.", "bad");
      return;
    }
    codeRow.hidden = false;
    setVerifyMsg("인증번호를 보냈어요. (데모 — 백엔드 연결 시 실제 발송됩니다)", null);
    sendCodeBtn.textContent = "재전송";
    emailCodeInput.focus();
  });

  checkCodeBtn.addEventListener("click", function () {
    var code = (emailCodeInput.value || "").trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setVerifyMsg("인증번호 6자리를 입력해 주세요.", "bad");
      return;
    }
    emailVerified = true;
    setVerifyMsg("✓ 이메일 인증 완료", "ok");
    emailInput.disabled = true;
    emailCodeInput.disabled = true;
    sendCodeBtn.disabled = true;
    checkCodeBtn.disabled = true;
    emailField.classList.add("verified");
  });
}

function getData() {
  var fd = new FormData(form);
  var data = {};
  fd.forEach(function (v, k) { data[k] = v; });
  // 인증 완료 시 #email은 disabled 상태라 FormData에서 빠지므로 값을 보강
  if (emailInput && (!data["이메일"] || !String(data["이메일"]).trim())) {
    data["이메일"] = emailInput.value;
  }
  return data;
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
  if (!EMAIL_RE.test(data["이메일"] || "")) return "올바른 이메일 주소를 입력해 주세요.";
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
  // 이메일 형식 검증 통과 후, 인증이 안 됐으면 막기
  if (!emailVerified) { msg.style.color = "#d33"; msg.textContent = "⚠️ 이메일 인증을 완료해 주세요."; return; }
  data["이메일인증여부"] = emailVerified ? "TRUE" : "FALSE";
  msg.style.color = "#333"; msg.textContent = "⏳ 제출 중...";
  fetch(API_URL, { method: "POST", body: JSON.stringify(data) })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (result.result === "success") {
        document.getElementById("form-wrap").style.display = "none";
        document.getElementById("thanks").style.display = "block";
        window.scrollTo(0, 0);
      } else if (result.result === "duplicate") {
        msg.style.color = "#d33"; msg.textContent = "⚠️ " + (result.message || "이미 신청한 이메일입니다.");
      } else {
        msg.style.color = "#d33"; msg.textContent = "❌ 오류: " + (result.message || "알 수 없는 오류");
      }
    })
    .catch(function (err) { msg.style.color = "#d33"; msg.textContent = "❌ 전송 실패: " + err.message; });
});
