// RnD 버전 3 — 자격 확인 위저드 로직
// 단계 show/hide · 진행바 · 단계별 검증(blend의 규칙 재사용) · 박사 동적노출
// · 글자수 카운터 · 전화번호 숫자필터 · 전체 필드 수집 → API_URL 제출 · 성공/중복/오류 처리

// ── 설정(blend/apply.js와 동일) ──
var API_URL = "https://script.google.com/macros/s/AKfycby8VjhtUbWPrgBvBrQzjS3S737EeaTmluDp9dl-n9cxWo9bCAMIp_sGjUQILHZtKzai/exec";
var MIN = 20, MAX = 50;

// ── 요소 ──
var intro = document.getElementById("intro");
var wizard = document.getElementById("wizard");
var result = document.getElementById("result");
var form = document.getElementById("wizard-form");
var msg = document.getElementById("msg");

var eduLevel = document.getElementById("edu-level");
var phdGroup = document.getElementById("phd-group");
var phone = document.getElementById("phone");

// ── 이메일 인증(프론트 데모 — 실제 발송/검증은 추후 백엔드 연동) ──
var emailVerified = false;
var emailField = document.getElementById("email-field");
var emailInput = document.getElementById("email");
var sendCodeBtn = document.getElementById("send-code");
var codeRow = document.getElementById("code-row");
var emailCode = document.getElementById("email-code");
var checkCodeBtn = document.getElementById("check-code");
var verifyMsg = document.getElementById("verify-msg");
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setVerifyMsg(text, kind) {
  verifyMsg.textContent = text || "";
  verifyMsg.classList.remove("ok", "bad");
  if (kind) verifyMsg.classList.add(kind);
}

var btnPrev = document.getElementById("btn-prev");
var btnNext = document.getElementById("btn-next");
var stepLabel = document.getElementById("step-label");
var stepCount = document.getElementById("step-count");
var progressFill = document.getElementById("progress-fill");

var panels = Array.prototype.slice.call(document.querySelectorAll(".step-panel"));
var TOTAL = panels.length; // 4
var current = 1;

var STEP_LABELS = { 1: "기본 정보", 2: "학력", 3: "프로필", 4: "한 줄 소개" };
var NEXT_LABEL = "다음 →";
var SUBMIT_LABEL = "사전신청 완료 ✓";

// ── 유틸 ──
function charLen(s) { return [...String(s || "").trim()].length; }
function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
function isPhd() { return eduLevel.value === "박사재학" || eduLevel.value === "박사졸업"; }

function showMsg(text, busy) {
  msg.textContent = text || "";
  msg.classList.toggle("busy", !!busy);
}
function clearMsg() { showMsg(""); }

// ── 박사 동적 노출 ──
function togglePhd() {
  var phd = isPhd();
  phdGroup.hidden = !phd;
  if (!phd) {
    var inputs = phdGroup.querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) inputs[i].value = "";
  }
}
eduLevel.addEventListener("change", togglePhd);

// ── 글자수 카운터 ──
function bindCounter(inputId, counterId) {
  var input = document.getElementById(inputId), counter = document.getElementById(counterId);
  function update() {
    var n = charLen(input.value);
    counter.textContent = n + " / " + MAX + "자 (최소 " + MIN + "자)";
    counter.classList.toggle("bad", n < MIN || n > MAX);
  }
  input.addEventListener("input", update);
  update();
}
bindCounter("intro-input", "intro-counter");
bindCounter("ideal-input", "ideal-counter");

// ── 전화번호 숫자만 ──
phone.addEventListener("input", function () { phone.value = phone.value.replace(/[^0-9]/g, ""); });

// ── 전체 데이터 수집(정확한 필드명으로 Google Sheet 전송) ──
function getData() {
  var fd = new FormData(form), d = {};
  fd.forEach(function (v, k) { d[k] = v; });
  // 박사 미선택 시 박사 칸이 form에 없을 수 있으므로 명시적으로 비워둠
  if (!isPhd()) { d["박사_대학교"] = ""; d["박사_전공"] = ""; }
  // 인증 완료 시 #email은 disabled 상태라 FormData에서 빠지므로 값 보강
  if (emailInput && (!d["이메일"] || !String(d["이메일"]).trim())) d["이메일"] = emailInput.value;
  d["이메일인증여부"] = emailVerified ? "TRUE" : "FALSE";
  return d;
}

// ── 단계별 검증(blend의 검증 규칙을 단계 단위로 분할) ──
function validateStep(step) {
  if (step === 1) {
    if (!val("name").trim()) return "이름을 입력해 주세요.";
    if (!eduLevel.value) return "학력단계를 선택해 주세요.";
    return null;
  }
  if (step === 2) {
    if (!val("ug-school").trim()) return "학부 대학교를 입력해 주세요.";
    if (!val("ug-major").trim()) return "학부 전공을 입력해 주세요.";
    if (!val("ms-school").trim()) return "석사 대학교를 입력해 주세요.";
    if (!val("ms-major").trim()) return "석사 전공을 입력해 주세요.";
    if (isPhd() && !val("phd-school").trim()) return "박사 대학교를 입력해 주세요.";
    if (isPhd() && !val("phd-major").trim()) return "박사 전공을 입력해 주세요.";
    return null;
  }
  if (step === 3) {
    if (!EMAIL_RE.test(val("email"))) return "올바른 이메일 주소를 입력해 주세요.";
    if (!/^[0-9]{9,}$/.test(val("phone"))) return "전화번호를 숫자만(9자리 이상) 입력해 주세요.";
    var h = Number(val("height"));
    if (!h || h < 140 || h > 220) return "키는 140~220(cm) 사이 숫자로 입력해 주세요.";
    if (!emailVerified) return "이메일 인증을 완료해 주세요.";
    return null;
  }
  if (step === 4) {
    if (charLen(val("intro-input")) < MIN || charLen(val("intro-input")) > MAX)
      return "'나를 한 줄로'는 " + MIN + "~" + MAX + "자로 입력해 주세요.";
    if (charLen(val("ideal-input")) < MIN || charLen(val("ideal-input")) > MAX)
      return "'이상형 한 줄로'는 " + MIN + "~" + MAX + "자로 입력해 주세요.";
    return null;
  }
  return null;
}

// ── 단계 렌더링 ──
function renderStep() {
  panels.forEach(function (p) {
    p.classList.toggle("active", Number(p.getAttribute("data-step")) === current);
  });
  stepLabel.textContent = STEP_LABELS[current] || "";
  stepCount.textContent = current + "/" + TOTAL;
  progressFill.style.width = (current / TOTAL * 100) + "%";

  btnPrev.hidden = current === 1;
  btnNext.textContent = current === TOTAL ? SUBMIT_LABEL : NEXT_LABEL;

  clearMsg();
  // 새 단계의 첫 입력에 포커스
  var first = panels[current - 1].querySelector("input:not([type=hidden]), select");
  if (first && !first.closest("[hidden]")) { try { first.focus(); } catch (e) {} }
}

// ── 인트로 → 위저드 시작 ──
function startWizard() {
  intro.hidden = true;
  wizard.hidden = false;
  result.hidden = true;
  current = 1;
  renderStep();
  window.scrollTo(0, 0);
}
Array.prototype.slice.call(document.querySelectorAll(".js-start")).forEach(function (b) {
  b.addEventListener("click", startWizard);
});
document.getElementById("nav-start").addEventListener("click", startWizard);
document.getElementById("logo-home").addEventListener("click", function (e) {
  e.preventDefault();
  intro.hidden = false; wizard.hidden = true; result.hidden = true;
  window.scrollTo(0, 0);
});

// ── 이전 ──
btnPrev.addEventListener("click", function () {
  if (current > 1) { current--; renderStep(); window.scrollTo(0, 0); }
});

// ── 다음 / 제출 ──
btnNext.addEventListener("click", function () {
  var err = validateStep(current);
  if (err) { showMsg("⚠️ " + err); return; }

  if (current < TOTAL) {
    current++;
    renderStep();
    window.scrollTo(0, 0);
    return;
  }
  submit();
});

// Enter 키 = 다음/제출 (textarea 없으므로 폼 submit 가로채기)
form.addEventListener("submit", function (e) { e.preventDefault(); btnNext.click(); });

// ── 제출 ──
function submit() {
  var data = getData();
  showMsg("⏳ 사전신청을 접수하는 중이에요...", true);
  btnNext.disabled = true;

  fetch(API_URL, { method: "POST", body: JSON.stringify(data) })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      btnNext.disabled = false;
      if (res.result === "success") {
        showResult(res.position);
      } else if (res.result === "duplicate") {
        showMsg("⚠️ " + (res.message || "이미 신청하신 이메일이에요. 안내 메일을 확인해 주세요."));
      } else {
        showMsg("❌ 오류: " + (res.message || "알 수 없는 오류가 발생했어요."));
      }
    })
    .catch(function (err) {
      btnNext.disabled = false;
      showMsg("❌ 전송 실패: " + err.message);
    });
}

// ── 결과 화면 ──
function showResult(position) {
  wizard.hidden = true;
  intro.hidden = true;
  result.hidden = false;
  // 중계기가 순번(position)을 주면 표시, 없으면 todo 배지 유지
  if (position) {
    var v = result.querySelector(".qnum .v");
    if (v) v.textContent = "#" + position;
  }
  window.scrollTo(0, 0);
}

// ── 이메일 인증 동작(데모) ──
// send-code: 이메일 형식 확인 후 인증번호 입력칸 노출 (백엔드 연결 시 실제 발송)
sendCodeBtn.addEventListener("click", function () {
  if (!EMAIL_RE.test(emailInput.value.trim())) {
    setVerifyMsg("올바른 이메일을 입력해 주세요.", "bad");
    return;
  }
  codeRow.hidden = false;
  setVerifyMsg("인증번호를 보냈어요. (데모 — 백엔드 연결 시 실제 발송됩니다)");
  sendCodeBtn.textContent = "재전송";
  try { emailCode.focus(); } catch (e) {}
});

// check-code: 6자리면 인증 완료 (데모 — 아무 6자리나 통과, 실제 검증은 백엔드)
checkCodeBtn.addEventListener("click", function () {
  if (!/^[0-9]{6}$/.test(emailCode.value.trim())) {
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

// ── 초기화 ──
togglePhd();
