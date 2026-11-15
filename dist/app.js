import{enrollApplication}from'./enrollment.js?v=instantbooking1';
import{enablePush,testPush,pushStatus}from'./push-client.js';
import{familyPurchase,planSettings}from'./purchase.js';
import{LESSON_FORMATS}from'./catalog.js';
import{initTheme,toggleTheme,currentTheme,themeSwitch}from'./theme.js?v=brandthemes1';
initTheme();
import{paymentQuote,lessonPriceMinor,lessonPurchase}from'./billing.js';
import{mountCheckout}from'./payment-widget.js?v=localjs1';
import{parentsFor}from'./management.js';
import{parseCSV,importFields,suggestMapping,mappedRows,planImport}from'./import-data.js';
import{enhanceTables,closeNavigation,toggleNavigation,setNavigation}from'./mobile-ui.js?v=mobile1';
import {apiFetch,clearAccess} from './api-client.js?v=pages1';
import {
  emptyState,
  applyAction,
  familyView,
  validateState,
  TODAY as DEMO_TODAY,
} from "./domain.js?v=operations1";
import { detectSession, readJson } from "./transport.js?v=pages1";
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  calendar:
    "M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z M7 2v6 M17 2v6 M3 11h18 M7 15h2 M12 15h2 M17 15h1",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9",
  ticket:
    "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z M15 5v3 M15 11v2 M15 16v3",
  wallet:
    "M4 6h16v14H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14 M16 11h6v5h-6z M18 13.5h1",
  chart: "M4 3v17h17 M8 16v-5 M13 16V7 M18 16V4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 M14 7l5 5-5 5",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  search: "M20 20l-5-5 M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12 M6 18 18 6",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0",
  send: "m22 2-7 20-4-9-9-4Z M11 13 22 2",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  leaf: "M20 3C8 2 1 8 5 15s15 1 15-12Z M4 21 16 8",
  help: "M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5 M12 17h.01 M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0",
  logout: "M9 3H3v18h6 M10 12h11 m-5-5 5 5-5 5",
  file: "M14 2H5v20h14V7Z M14 2v6h5 M8 12h8 M8 16h8",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  refresh: "M20 7a8 8 0 1 0 1 9 M20 2v6h-6",
};
const I = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="${paths[name] || paths.grid}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const lessonTypeLabel=l=>LESSON_FORMATS[l.lessonType||'group']||LESSON_FORMATS.group;
const money = (n) => Number(n).toLocaleString("ru-RU") + " ₽";
const dateLabel = (d, opts = { day: "numeric", month: "long" }) =>
  new Date(d + "T12:00:00").toLocaleDateString("ru-RU", opts);
const initials = (n) =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
const avatar = (c) =>
  `<span class="avatar ${escape(c.color || "green")}">${escape(initials(c.name))}</span>`;
let TODAY = DEMO_TODAY;
let data,
  viewData,
  backend = true,
  user = { role: null },
  page = "dashboard",
  role = null,
  selectedDate = TODAY,
  selectedChild = "all",
  filter = "",
  clientTab = "children",
  importSelection = null,
  modalLesson = null,
  startupError = null,
  localPersistent = true,
  parentEntryError = null,
  alerts = [],
  paymentConfig = {enabled:false,test:true},
  onlineOrders = [],
  hiddenPaymentCount = 0,
  returnPaymentId = rememberedPayment(),
  paymentResult = null,
  activeCheckout = null,
  paymentsSyncing = false,
  queuedPaymentCheck = null,
  paymentPollCursor = 0,
  paymentIssue = "",
  enrollmentMode = window.location?.hash === "#enroll",
  publicLessons = [],
  publicPrivacyUrl = "",
  registrationKey = crypto.randomUUID(),
  enrollmentSuccess = null;
data = emptyState();
function saveLocal() {
  throw Error("Необходимо подключение к серверу");
}
let demoNow = () => new Date(TODAY + "T08:30:00+05:00");
function tokenFromLink() {
  const hash = window.location?.hash || "";
  return hash.startsWith("#parent=") ? hash.slice(8) : null;
}
function forgetLinkToken() {
  if (window.history?.replaceState) window.history.replaceState(null, "", globalThis.YASNA_APP_PATH||"/");
  else if (window.location) window.location.hash = "";
}
async function init() {
  if(globalThis.YASNA_BACKEND_CONFIGURED===false){renderPublicHome();return}
  const setupHash=window.location?.hash||'';
  if(setupHash.startsWith('#setup=')){const code=setupHash.slice(7);forgetLinkToken();renderMasterSetup(code);return}

  startupError = null;
  try {
    let session;
    const token = tokenFromLink();
    if (token !== null) {
      const r = await apiFetch("/api/parent-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      session = await readJson(r);
      if (!r.ok) {
        parentEntryError = session.error || "Ссылка недействительна";
        forgetLinkToken();
        render();
        return;
      }
      forgetLinkToken();
    } else session = await detectSession(apiFetch);
    if (!session)
      throw Error(
        "Не удалось подключиться к рабочему серверу. Повторите позже.",
      );
    backend = true;
    TODAY = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Yekaterinburg",
    });
    selectedDate = TODAY;
    user = session;
    role = user.role;
    if (user.role && !enrollmentMode) await loadServer();
    if (enrollmentMode) await loadPublicLessons();
  } catch (e) {
    startupError = e.message || "Проверьте подключение к интернету.";
  }
  render();
  if(user.role){if(returnPaymentId){page='payments';render();await syncOnlinePayments(true)}else void syncOnlinePayments(false)}
}
function expireSession() {
  const parent = user.role === "parent";
  user = { role: null, authMode: "password" };
  role = null;
  data = emptyState();
  alerts = [];
  onlineOrders = [];
  paymentResult = null;
  disposeCheckout();
  paymentConfig = {enabled:false,test:true};
  parentEntryError = parent
    ? "Ссылка или родительская сессия больше не действует. Откройте ссылку, выданную мастером, или попросите новую."
    : null;
  closeModal();
  render();
}

async function loadServer() {
  const r = await apiFetch("/api/state");
  if (r.status === 401) {
    expireSession();
    return;
  }
  if (!r.ok) throw Error("Не удалось загрузить данные");
  data = await readJson(r);
  await loadNotifications();
  await refreshPayments();
  if(returnPaymentId)page='payments';
}
function visible() {
  return backend ? data : role === "parent" ? familyView(data, "f1") : data;
}
function child(id) {
  return (
    viewData.children.find((c) => c.id === id) || {
      name: "Неизвестный ребёнок",
      color: "green",
      balance: 0,
    }
  );
}
function bookings(l) {
  return viewData.bookings.filter(
    (b) => b.lesson === l && !["cancelled", "waitlist"].includes(b.status),
  );
}
function occupancy(l) {
  return role === "parent" && viewData.occupancy
    ? viewData.occupancy[l] || 0
    : bookings(l).length;
}
function toast(t) {
  const el = document.querySelector("#toast");
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(window.tt);
  window.tt = setTimeout(() => el.classList.remove("show"), 3600);
}
async function act(a, message = "Сохранено") {
  try {
    if (backend) {
      const r = await apiFetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: a, revision: data.revision }),
      });
      const body = await readJson(r);
      if (!r.ok) {
        if (r.status === 401) expireSession();
        if (r.status === 409) await loadServer();
        throw Error(body.error || "Ошибка сохранения");
      }
      data = body;
      await loadNotifications();
    } else {
      const copy = structuredClone(data);
      applyAction(copy, a, { role, family: "f1" }, demoNow());
      saveLocal(copy);
    }
    render();
    toast(
      !backend && !localPersistent
        ? message +
            " · Сохранение заблокировано браузером. Скачайте резервную копию."
        : message,
    );
    return true;
  } catch (e) {
    const field = document.querySelector("#form-error");
    if (field) field.textContent = e.message;
    toast(e.message);
    return false;
  }
}
const logoPicture=(compact=false)=>`<span class="theme-logo${compact?' mobile-wordmark':''}"><img class="${compact?'':'brand-lockup '}logo-light" src="./yasna-brand-light.png" alt="Ясна — детская мастерская" width="${compact?72:168}" height="${compact?44:106}"><img class="${compact?'':'brand-lockup '}logo-dark" src="./yasna-brand-dark.png" alt="Ясна — детская мастерская" width="${compact?72:168}" height="${compact?44:106}"></span>`;
const brand=`<div class="brand">${logoPicture()}<div class="brand-sub">ДЕТСКАЯ МАСТЕРСКАЯ</div></div>`;

const nav = [
  ["dashboard", "grid", "Обзор"],
  ["applications", "file", "Заявки"],
  ["schedule", "calendar", "Расписание"],
  ["clients", "users", "Дети и родители"],
  ["subscriptions", "ticket", "Абонементы"],
  ["payments", "wallet", "Оплаты"],
  ["reports", "chart", "Отчёты"],
];
function render() {
  closeNavigation(false);
  if (startupError) return renderStartupError();
  if (parentEntryError) return renderParentLinkError();
  if (enrollmentMode) return renderEnrollment();
  viewData = visible();
  if (backend && !user.role) return login();
  if (
    role === "parent" &&
    !(selectedChild === "all" && viewData.children.length > 1) &&
    !viewData.children.some((c) => c.id === selectedChild)
  )
    selectedChild =
      viewData.children.length > 1 ? "all" : viewData.children[0]?.id;
  const title =
    role === "parent"
      ? "Кабинет родителя"
      : nav.find((n) => n[0] === page)?.[2] || "Настройки";
  document.querySelector("#app").innerHTML =
    `<button class="nav-backdrop" data-action="closemenu" aria-label="Закрыть меню" hidden></button><aside class="sidebar" id="main-navigation" aria-label="Навигация"><button class="icon-btn nav-close" data-action="closemenu" aria-label="Закрыть меню">${I("close")}</button>${brand}<div class="studio-tag">ПРОСТРАНСТВО МАСТЕРА</div><nav class="nav">${(role ===
    "parent"
      ? [
          ["dashboard", "grid", "Моя семья"],
          ["schedule", "calendar", "Записаться"],
          ["payments", "wallet", "Оплаты и чеки"],
        ]
      : nav
    )
      .map(
        ([id, ico, label]) =>
          `<button class="${page === id ? "active" : ""}" data-page="${id}">${I(ico)}<span>${label}</span>${id === "applications" ? `<span class="count">${(viewData.applications || []).filter((r) => r.status === "pending").length}</span>` : ""}${id === "subscriptions" ? `<span class="count">${viewData.children.filter((c) => !c.archived&&c.balance <= viewData.settings.remindAt).length}</span>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom">${role === "master" ? `<nav class="nav"><button data-page="settings" class="${page === "settings" ? "active" : ""}">${I("settings")}<span>Настройки</span></button></nav>` : ""}<div class="help-box"><b>У всего есть своя история</b>У маленьких открытий — тоже.<br>Пусть для них будет больше времени.<a class="vk-link" href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">Мы ВКонтакте ${I("arrow")}</a></div><div class="profile"><span class="avatar green">${role === "master" ? "М" : initials(viewData.children[0]?.parent || "Родитель")}</span><div><b>${role === "master" ? "Кабинет мастера" : escape(viewData.children[0]?.parent || "Родитель")}</b><small>${role === "master" ? "Мастерская в Сургуте" : "Кабинет семьи"}</small></div><button class="text-link" data-action="${backend ? "logout" : "about"}" aria-label="${backend ? "Выйти" : "О демонстрации"}">${I(backend ? "logout" : "down")}</button></div></div></aside><main class="main"><header class="topbar"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Открыть меню" aria-controls="main-navigation" aria-expanded="false">${I("menu")}</button>${logoPicture(true)}<div class="breadcrumb">Мастерская «Ясна» <span>/</span><strong>${title}</strong></div><div class="top-tools">${themeSwitch({action:'theme'})}<button class="btn small intake-top-btn" data-action="intake" aria-label="Первичная запись без личного кабинета">${I("plus")}<span>Первичная запись</span></button>${!backend ? `<span class="demo-label">${localPersistent ? "Демо-данные" : "Без сохранения"}</span><div class="role-switch"><button class="${role === "master" ? "on" : ""}" data-role="master">Кабинет мастера</button><button class="${role === "parent" ? "on" : ""}" data-role="parent">Я родитель</button></div>` : `<span class="demo-label">${role === "master" ? "Мастер" : "Родитель"}</span>`}<button class="icon-btn notifications-button ${alerts.some((n) => !n.read) ? "has-unread" : ""}" data-action="notifications" aria-label="Уведомления: ${alerts.filter((n) => !n.read).length} непрочитанных">${I("bell")}${alerts.some((n) => !n.read) ? `<span class="notification-count">${alerts.filter((n) => !n.read).length}</span>` : ""}</button></div></header><div class="content">${role === "parent" && page === "dashboard" ? parentPage() : page === "dashboard" ? dashboard() : page === "schedule" ? schedule() : page === "applications" ? applicationsPage() : page === "clients" ? clients() : page === "subscriptions" ? subscriptions() : page === "payments" ? payments() : page === "reports" ? reports() : settings()}<footer class="footer"><span>© 2026 Ясна · сделано с заботой о маленьких мастерах · <a href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">ВКонтакте ↗</a></span><span>${backend ? "Данные сохраняются на сервере" : localPersistent ? "Демонстрация · данные хранятся в этом браузере" : "Данные в памяти вкладки · скачайте резервную копию"} <span style="margin-left:12px">Сургут · UTC+5</span></span></footer></div></main>${mobileNavigation()}`;
  enhanceTables(document.querySelector(".content"));
  bind();
  setNavigation(false,false);
}
function head(eyebrow, title, sub, button = "") {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p></div>${button}</div>`;
}
const art = `<svg class="hero-art" viewBox="0 0 250 160" fill="none" aria-hidden="true"><circle cx="184" cy="38" r="25" fill="#e0000b"/><path d="M43 116c-15 43 2 44 27 8 19-29 27-50 43-49 15 1 3 37-2 45-10 17-21 27-8 30 13 2 32-25 43-41 17-23 31-18 23 4-12 28-2 31 13 14 16-17 19-27 25-32" stroke="#ffbf00" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="m42 49 11-18 18 11-11 18z" stroke="#8e742a" stroke-width="1.5"/><path d="M223 106v17m-8-8h17M96 29v9m-4-5h9" stroke="#8e742a" stroke-width="1.5" stroke-linecap="round"/></svg>`;
function dashboard() {
  const ls = viewData.lessons
      .filter((l) => l.date === TODAY)
      .sort((a, b) => a.time.localeCompare(b.time)),
    count = ls.reduce((n, l) => n + bookings(l.id).length, 0),
    att = viewData.bookings.filter(
      (b) => ls.some((l) => l.id === b.lesson) && b.status === "attended",
    ).length,
    renew = viewData.children.filter(
      (c) => !c.archived&&c.balance <= viewData.settings.remindAt,
    );
  return (
    head(
      dateLabel(TODAY, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).toUpperCase(),
      backend ? "Хорошего дня ☀" : "Хорошего дня ☀",
      "Всё, что нужно для спокойного дня в мастерской.",
      `<button class="btn primary" data-action="addlesson">${I("plus")}Добавить занятие</button>`,
    ) +
    `<div class="banner"><div><div class="banner-label">МАЛЕНЬКИЕ РУКИ. БОЛЬШИЕ ОТКРЫТИЯ.</div><h2>Сегодня хороший день,<br>чтобы создать что-то настоящее.</h2><p>В мастерской вас ждут ${count} юных мастеров и ${ls.length} занятия.</p></div>${art}</div><div class="stats">${[
      ["Занятий сегодня", ls.length, "calendar", "По расписанию, всё готово"],
      [
        "Записано детей",
        count,
        "users",
        `${att} ${att === 1 ? "посещение отмечено" : "посещений отмечено"}`,
      ],
      ["Пора продлить", renew.length, "ticket", "Абонементы подходят к концу"],
      [
        "Оплаты за месяц",
        money(
          viewData.payments
            .filter((p) => p.date.startsWith(TODAY.slice(0, 7)))
            .reduce((n, p) => n + p.amount, 0),
        ),
        "wallet",
        `Учтено оплат: ${viewData.payments.length}`,
      ],
    ]
      .map(
        ([label, val, ico, foot], i) =>
          `<div class="stat"><div class="stat-top">${label}${I(ico)}</div><div class="stat-val">${val}${i === 0 ? "<small>занятия</small>" : ""}</div><div class="stat-foot ${i === 2 ? "orange" : ""}">${foot}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><section><div class="section-head"><h2>Сегодня в мастерской <span>${dateLabel(TODAY)}</span></h2><button class="text-link" data-page="schedule">Всё расписание ${I("arrow")}</button></div><div class="tabs"><button class="active" data-action="today">Все занятия <span>· ${ls.length}</span></button><button data-action="openjournal">Журнал посещений</button></div>${ls.map(lessonCard).join("") || empty("Сегодня занятий нет")}<div class="section-head table-title"><h2>Маленькие мастера <span>${viewData.children.filter(c=>!c.archived).length} детей</span></h2><button class="text-link" data-page="clients">Все дети ${I("arrow")}</button></div>${childrenTable(viewData.children.filter(c=>!c.archived).slice(0, 3), true)}</section><aside class="right-column"><div class="panel"><div class="panel-head">${I("ticket")}<h2>Пора продлить абонемент</h2><span class="badge warn" style="margin-left:auto">${renew.length}</span></div><div class="muted">Немного заботы, чтобы не было пауз</div>${renew
      .slice(0, 3)
      .map(
        (c) =>
          `<div class="reminder-row">${avatar(c)}<div class="reminder-info"><b>${escape(c.name)}</b><small>${c.balance === 0 ? "Занятия закончились" : `Осталось ${c.balance} ${c.balance === 1 ? "занятие" : "занятия"}`}</small></div><button data-remind="${c.id}" aria-label="Напомнить родителю ${escape(c.name)}">${I("send")}</button></div>`,
      )
      .join(
        "",
      )}<button class="btn small wide" data-page="subscriptions">Все абонементы ${I("arrow")}</button></div><div class="panel"><div class="panel-head"><h2>Жизнь мастерской</h2><span class="badge" style="margin-left:auto">События</span></div>${viewData.activity
      .slice(0, 4)
      .map(
        (a) =>
          `<div class="activity-row"><span class="activity-icon">${I(a.type === "payment" ? "wallet" : a.type === "lesson" ? "calendar" : "check")}</span><div><p>${escape(a.text)}</p><small>${escape(a.time)}</small></div></div>`,
      )
      .join("")}</div></aside></div>`
  );
}
function lessonCard(l) {
  if(l.status==='cancelled')return `<article class="lesson-card cancelled-lesson"><div class="lesson-main"><div class="lesson-time"><b>${l.time}</b><small>${l.duration} минут</small></div><div class="lesson-info"><h3>${escape(l.title)}</h3><p class="mini-note">${escape(l.cancellationReason||'Занятие отменено мастером')}</p></div><span class="badge warn">Отменено</span></div></article>`;
  const bs = bookings(l.id),
    n = occupancy(l.id),
    my =
      role === "parent" &&
      bs.some((b) => selectedChild === "all" || b.child === selectedChild);
  return `<article class="lesson-card"><div class="lesson-main"><div class="lesson-time"><b>${l.time}</b><small>${l.duration} минут</small></div><div class="lesson-divider ${escape(l.color)}"></div><div class="lesson-info"><h3>${escape(l.title)}</h3><div class="lesson-meta lesson-format">${lessonTypeLabel(l)}</div><div class="lesson-meta">${escape(l.format)} <span>·</span> ${escape(l.age)}</div></div><div class="lesson-people">${bs
    .slice(0, 3)
    .map((b) => avatar(child(b.child)))
    .join(
      "",
    )}${bs.length > 3 ? `<span class="avatar green">+${bs.length - 3}</span>` : ""}</div><span class="badge ${n >= l.capacity ? "warn" : l.color === "purple" ? "purple" : ""}">${n} из ${l.capacity} мест</span></div><div class="lesson-foot">${role==='master'?`<div class="lesson-management"><button class="text-link" data-movelesson="${l.id}">${I("calendar")}Перенести</button><button class="text-link danger-text" data-cancellesson="${l.id}">Отменить занятие</button></div>`:''}<span>${I(n >= l.capacity ? "users" : "leaf")}${n >= l.capacity ? "Группа набрана" : `Ещё ${l.capacity - n} ${l.capacity - n === 1 ? "место" : "места"} для открытий`}</span><button class="text-link" ${role === "master" ? `data-journal="${l.id}"` : `data-signup="${l.id}"`}>${role === "master" ? "Открыть журнал" : my ? (selectedChild === "all" ? "Записать ещё ребёнка" : "Вы записаны") : n >= l.capacity ? "В лист ожидания" : "Записать ребёнка"} ${I("arrow")}</button></div></article>`;
}
function childrenTable(cs, compact = false) {
  return `<div class="table-wrap"><table><thead><tr><th>Ребёнок</th>${compact ? "" : "<th>Родитель</th><th>Телефон</th>"}<th>Абонемент</th><th></th></tr></thead><tbody>${cs.map((c) => `<tr><td><div class="person">${avatar(c)}<div><b>${escape(c.name)}</b><small>${c.age} ${c.age < 5 ? "года" : "лет"}</small></div></div></td>${compact ? "" : `<td>${escape(c.parent)}</td><td>${escape(c.phone)}</td>`}<td><span class="badge ${c.balance <= viewData.settings.remindAt ? "warn" : ""}">${c.balance === 0 ? "Нужна оплата" : `Осталось ${c.balance} ${c.balance === 1 ? "занятие" : "занятия"}`}</span></td><td><button class="text-link" data-child="${c.id}" aria-label="Открыть карточку ${escape(c.name)}">${I("chevron")}</button></td></tr>`).join("")}</tbody></table>${cs.length ? "" : empty("Дети не найдены")}</div>`;
}
function empty(text) {
  return `<div class="empty">${I("leaf")}${text}</div>`;
}
function schedule() {
  let start = new Date(selectedDate + "T12:00:00");
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return (
    head(
      "ВРЕМЯ ДЛЯ ОТКРЫТИЙ",
      role === "parent" ? "Записаться на занятие" : "Расписание",
      `${dateLabel(dates[0])} — ${dateLabel(dates[6])} · время Сургута`,
      role === "master"
        ? `<button class="btn primary" data-action="addlesson">${I("plus")}Добавить занятие</button>`
        : "",
    ) +
    `<div class="toolbar"><div class="left"><button class="btn small" data-week="-7" aria-label="Предыдущая неделя">←</button><button class="btn small" data-date="${TODAY}">Сегодня</button><button class="btn small" data-week="7" aria-label="Следующая неделя">→</button></div><label class="search" style="min-width:180px;width:auto"><span class="muted">Дата</span><input type="date" id="calendar-date" value="${selectedDate}" aria-label="Выберите дату"></label></div><div class="date-strip">${dates.map((d) => `<button class="day ${d === selectedDate ? "active" : ""}" data-date="${d}">${dateLabel(d, { weekday: "short" })}<b>${+d.slice(8)}</b></button>`).join("")}</div><div class="section-head"><h2>${dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</h2><span class="mini-note">${role === "parent" ? "Занятие списывается после посещения" : "Нажмите «Открыть журнал», чтобы отметить детей"}</span></div>${role === "parent" ? childPicker() : ""}${
      viewData.lessons
        .filter((l) => l.date === selectedDate&&(role==='master'||l.status!=='cancelled'))
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(lessonCard)
        .join("") ||
      empty("В этот день мастерская отдыхает.<br>Выберите другую дату.")
    }<p class="subnav-note">Отмена родителем возможна не позднее чем за ${viewData.settings.cancelHours} ч. до начала. ${viewData.settings.chargeMissed ? "Пропуск без отмены списывает занятие." : "Пропуск без отмены не списывает занятие."}</p>`
  );
}
function clients() {
  const cs = viewData.children.filter(c=>clientTab==="archive"?c.archived:!c.archived).filter((c) =>
    (c.name + " " + c.parent + " " + c.phone)
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    head(
      "ДЕТИ И РОДИТЕЛИ",
      "Каждого знаем по имени",
      "Контакты, посещения и маленькие достижения.",
      `<div class="head-actions"><button class="btn" data-action="importdata">${I("download")}Импорт</button><button class="btn" data-action="addparent">Добавить родителя</button><button class="btn primary" data-action="addchild">${I("plus")}Добавить ребёнка</button></div>`,
    ) +
    `<div class="tabs client-tabs"><button data-clienttab="children" class="${clientTab==='children'?'active':''}">Дети</button><button data-clienttab="parents" class="${clientTab==='parents'?'active':''}">Родители</button><button data-clienttab="archive" class="${clientTab==='archive'?'active':''}">Архив</button></div><div class="toolbar"><label class="search">${I("search")}<input id="client-search" value="${escape(filter)}" placeholder="Найти ребёнка или родителя" aria-label="Поиск детей и родителей"></label><span class="mini-note">${cs.length} детей · ${new Set(cs.map((c) => c.family)).size} семей</span></div><div id="client-results">${clientTab==="parents"?parentsTable(false):clientTab==="archive"?`<div class="inline-notice">Архив хранит оплаты и посещения. Восстановление не возвращает отменённые записи и старые ссылки доступа.</div><h2>Дети</h2>${childrenTable(cs)}<h2>Родители</h2>${parentsTable(true)}`:childrenTable(cs)}</div>`
  );
}
function subscriptions() {
  const cs =
    filter === "renew"
      ? viewData.children.filter((c) => !c.archived&&c.balance <= viewData.settings.remindAt)
      : viewData.children.filter(c=>!c.archived);
  return (
    head(
      "БОЛЬШЕ ВРЕМЕНИ НА ТВОРЧЕСТВО",
      "Абонементы",
      "Простой баланс: оплатили, пришли, создали.",
      `<button class="btn primary" data-action="addpayment">${I("plus")}Принять оплату</button>`,
    ) +
    `<div class="tabs"><button class="${filter !== "renew" ? "active" : ""}" data-subfilter="all">Все абонементы</button><button class="${filter === "renew" ? "active" : ""}" data-subfilter="renew">Пора продлить · ${viewData.children.filter((c) => !c.archived&&c.balance <= viewData.settings.remindAt).length}</button></div><div class="subscription-grid">${cs.map((c) => `<div class="panel"><div class="person">${avatar(c)}<div><b>${escape(c.name)}</b><small>${escape(c.parent)}</small></div></div><div class="balance">${c.balance} <small>${c.balance === 1 ? "занятие осталось" : "занятий осталось"}</small></div><div class="progress"><div style="width:${Math.min(100, (c.balance / viewData.settings.credits) * 100)}%"></div></div><p class="mini-note">Денежный аванс: ${money((c.advanceMinor||0)/100)}</p><p class="mini-note">Абонемент · ${planSettings(viewData.settings).subscriptionCredits} занятия / ${money(planSettings(viewData.settings).subscriptionPrice)}</p><div class="section-head" style="margin:20px 0 0"><button class="btn small" data-paychild="${c.id}">${I("plus")}Продлить</button><button class="text-link" data-remind="${c.id}">${I("send")}Напомнить</button></div></div>`).join("")}</div>`
  );
}
function payments() {
  const ps = viewData.payments;
  return (
    head(
      "ВСЁ ПРОЗРАЧНО",
      "Оплаты и чеки",
      role === "parent"
        ? "История оплат вашей семьи. Чеки можно скачать после прикрепления мастером."
        : "Учитывайте оплаты и прикрепляйте чеки, чтобы родители видели их в кабинете.",
      role === "master"
        ? `<button class="btn primary" data-action="addpayment">${I("plus")}Принять оплату</button>`
        : "",
    ) +
    onlinePaymentsPanel() + `<div class="stats" style="grid-template-columns:repeat(3,1fr)">${[
      ["Всего оплачено", money(ps.reduce((n, p) => n + p.amount, 0))],
      ["Оплат", ps.length],
      ["Чеков прикреплено", ps.filter((p) => p.receipt).length],
    ]
      .map(
        ([t, n]) =>
          `<div class="stat"><div class="stat-top">${t}</div><div class="stat-val">${n}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="table-wrap"><table><thead><tr><th>Дата</th><th>Ребёнок</th><th>Абонемент</th><th>Сумма</th><th>Способ оплаты</th><th>Чек</th></tr></thead><tbody>${ps.map((p) => `<tr><td>${dateLabel(p.date)}</td><td><div class="person">${avatar(child(p.child))}<b>${escape(child(p.child).name)}</b></div></td><td>${p.credits?`${p.credits} занятия`:"—"}</td><td style="color:#8b6300;font-weight:600">${money(p.amount)}</td><td>${escape(p.method)}</td><td>${p.receipt ? `<button class="text-link" data-receipt="${p.id}">${I("file")}Скачать</button>` : role === "master" ? `<button class="text-link" data-upload="${p.id}">${I("plus")}Прикрепить</button>` : '<span class="mini-note">Ожидает прикрепления</span>'}</td></tr>`).join("")}</tbody></table>${ps.length ? "" : empty("Оплат пока нет")}</div><div class="inline-notice">${backend ? "Оплаты ЮKassa зачисляются после подтверждения сервера. При подключённом сервисе чек НПД формируется в ЮKassa; его статус можно проверить в онлайн-оплатах. Готовый файл чека также можно прикрепить здесь. Квитанция об оплате не заменяет чек НПД." : "Демонстрационный режим. Оплаты тестовые, деньги не переводятся. Прикрепляйте только вымышленные чеки."}</div>`
  );
}
function reports() {
  return (
    head(
      "ПОРЯДОК В ДЕТАЛЯХ",
      "Отчёты и выгрузки",
      "Все данные мастерской всегда под рукой.",
    ) +
    `<div class="settings-grid"><div class="panel"><h2>Выгрузка в CSV</h2><button class="btn small" data-action="importdata">Импорт из «МойКласс»</button><p class="subtitle">UTF-8 · подходит для Excel и переноса в другую систему</p>${[
      ["children", "Дети и родители", "Контакты и остатки занятий"],
      ["history", "Посещения", "Даты, занятия и списания"],
      ["payments", "Оплаты", "Суммы и способы оплаты"],
    ]
      .map(
        ([key, title, sub]) =>
          `<div class="reminder-row"><span class="activity-icon">${I("file")}</span><div class="reminder-info"><b>${title}</b><small style="color:#7a6c54">${sub}</small></div><button class="btn small" data-export="${key}">${I("download")}CSV</button></div>`,
      )
      .join(
        "",
      )}</div><div class="panel"><h2>Резервная копия</h2><p class="subtitle">Полная копия клиентов, записей, абонементов, оплат и прикреплённых чеков в JSON.</p><div class="inline-notice">${backend ? "Автоматическая копия создаётся при изменениях. Храните скачанную копию отдельно от сервера." : "Демо-данные хранятся только в этом браузере. Скачайте копию, чтобы перенести их на другое устройство."}</div><button class="btn green" data-action="backup">${I("download")}Скачать копию</button> <button class="btn" data-action="restore">${I("refresh")}Восстановить</button><p class="mini-note">Восстановление заменит текущие данные после проверки файла и вашего подтверждения.</p></div></div><div class="panel"><h2>Коротко о мастерской</h2><div class="stats" style="margin-bottom:0">${[
      ["Семей", new Set(viewData.children.map((c) => c.family)).size],
      ["Детей", viewData.children.length],
      [
        "Посещений",
        viewData.history.filter((h) => h.status === "attended").length,
      ],
      ["Получено", money(viewData.payments.reduce((n, p) => n + p.amount, 0))],
    ]
      .map(
        ([t, n]) =>
          `<div><div class="mini-note">${t}</div><div class="stat-val">${n}</div></div>`,
      )
      .join("")}</div></div>`
  );
}
function settings() {
  const s = viewData.settings;
  return (
    head(
      "ПОДХОДИТ ИМЕННО ВАМ",
      "Настройки мастерской",
      "Правила можно менять по мере развития мастерской.",
    ) +
    `<form id="settings-form"><div class="settings-grid"><div class="panel"><h2>Запись и отмена</h2><p class="subtitle" style="margin-bottom:24px">Правила действуют для новых действий. История сохраняется.</p><label class="form-field">Бесплатная отмена не позднее, чем за (часов)<input name="cancelHours" type="number" min="0" max="168" value="${s.cancelHours}" required></label><label class="check-label"><input name="chargeMissed" type="checkbox" ${s.chargeMissed ? "checked" : ""}>Списывать занятие при пропуске без отмены</label><label class="form-field">Напоминать при остатке занятий<input name="remindAt" type="number" min="0" max="168" value="${s.remindAt}" required></label></div><div class="panel"><h2>Тарифы мастерской</h2><p class="subtitle" style="margin-bottom:24px">Стоимость можно скорректировать при приёме оплаты.</p><label class="form-field">Количество занятий<input name="credits" type="number" min="1" max="100" value="${s.credits}" required></label><label class="form-field">Стоимость одного занятия, ₽<input name="lessonPrice" type="number" min="1" max="100000" step="0.01" value="${lessonPriceMinor(s)/100}" required></label><label class="form-field">Расчёт по разовой цене, ₽<input readonly name="price" type="number" min="1" max="100000" value="${s.price}" required></label><label class="form-field">Первый пробный урок, ₽<input name="trialPrice" type="number" min="1" max="100000" step="0.01" value="${planSettings(s).trialPrice}" required></label><label class="form-field">Абонемент, ₽<input name="subscriptionPrice" type="number" min="1" max="100000" step="0.01" value="${planSettings(s).subscriptionPrice}" required></label><label class="form-field">Занятий в абонементе<input name="subscriptionCredits" type="number" min="1" max="100" value="${planSettings(s).subscriptionCredits}" required></label><label class="form-field">Документ о персональных данных (HTTPS-ссылка)<input name="privacyDocumentUrl" type="url" maxlength="2000" value="${escape(s.privacyDocumentUrl||'')}" placeholder="https://ваш-домен.ru/privacy.pdf"></label><p class="mini-note">Ссылка на документ отображается в анкете. Запись создаётся автоматически при наличии свободного места.</p><p class="mini-note">Мастерская «Ясна» · Сургут<br>Все занятия отображаются в часовом поясе UTC+5.</p></div></div><button class="btn primary" type="submit">${I("check")}Сохранить настройки</button></form>${paymentSettingsPanel()}<div class="panel" style="margin-top:24px"><h2>О приложении</h2><p class="subtitle">${backend ? "Рабочий сервер · общая база данных · отдельные доступы" : "Интерактивная демонстрация · вымышленные данные · локальное сохранение"}</p><p class="mini-note">Для реальных семей используйте серверный режим с отдельными учётными записями. Инструкция и исходный код входят в комплект для самостоятельного размещения.</p>${!backend ? `<a class="btn small" href="https://github.com/vosavasof/Yasno" target="_blank" rel="noopener noreferrer">${I("download")}Исходники и инструкция</a>` : ""} <button class="text-link" data-action="about">О версии ${I("arrow")}</button></div>`
  );
}
function childPicker() {
  return `<div class="parent-child" role="group" aria-label="Показать данные ребёнка">${viewData.children.length > 1 ? `<button data-selectchild="all" class="${selectedChild === "all" ? "on" : ""}" aria-pressed="${selectedChild === "all"}">${I("users")} Все дети</button>` : ""}${viewData.children.map((c) => `<button data-selectchild="${c.id}" class="${c.id === selectedChild ? "on" : ""}" aria-pressed="${c.id === selectedChild}">${escape(c.name.split(" ")[0])} · ${c.age} лет</button>`).join("")}</div>`;
}
function parentSubscription(c) {
  return `<div class="panel" data-balance-child="${c.id}"><div class="section-head"><h2>Абонемент ${escape(c.name.split(" ")[0])}</h2>${I("ticket")}</div><div class="big-number">${c.balance}<span class="balance-unit muted"> занятий осталось</span></div><div class="progress"><div style="width:${Math.min(100, (c.balance / viewData.settings.credits) * 100)}%"></div></div><p class="subtitle">${planSettings(viewData.settings).subscriptionCredits} занятия · ${money(planSettings(viewData.settings).subscriptionPrice)}</p><p class="mini-note">Денежный аванс: ${money((c.advanceMinor||0)/100)}</p>${c.balance <= viewData.settings.remindAt ? '<div class="inline-notice">Скоро время продлить абонемент.</div>' : ""}<button class="btn wide" data-action="parentpay">${paymentConfig.enabled ? "Оплатить занятия" : "Как продлить"} ${I("arrow")}</button></div>`;
}
function familySubscriptions(cs) {
  return `<div class="panel family-subscriptions"><div class="section-head"><h2>Абонементы семьи</h2>${I("ticket")}</div><div class="big-number">${cs.reduce((n, c) => n + c.balance, 0)}<span class="balance-unit muted"> занятий всего</span></div><p class="mini-note">Остатки учитываются отдельно у каждого ребёнка.</p>${cs.map((c) => `<div class="family-balance-row" data-balance-child="${c.id}"><div class="person">${avatar(c)}<div><b>${escape(c.name)}</b><small>${c.balance <= viewData.settings.remindAt ? "Пора продлить" : "Абонемент действует"}</small></div></div><span class="badge ${c.balance <= viewData.settings.remindAt ? "warn" : ""}">${c.balance} зан. · аванс ${money((c.advanceMinor||0)/100)}</span><button class="text-link" data-selectchild="${c.id}" aria-label="Открыть данные ${escape(c.name)}">${I("chevron")}</button></div>`).join("")}<button class="btn wide" data-action="parentpay">${paymentConfig.enabled ? "Оплатить занятия" : "Как продлить"} ${I("arrow")}</button></div>`;
}
function parentPage() {
  const all = selectedChild === "all",
    cs = all
      ? viewData.children
      : viewData.children.filter((c) => c.id === selectedChild),
    ids = new Set(cs.map((c) => c.id));
  const lessonFor = (b) => viewData.lessons.find((l) => l.id === b.lesson);
  const bs = viewData.bookings
    .filter((b) => ids.has(b.child) && b.status === "booked" && lessonFor(b))
    .sort((a, b) => {
      const la = lessonFor(a),
        lb = lessonFor(b);
      return (la.date + la.time).localeCompare(lb.date + lb.time);
    });
  const hist = viewData.history
    .filter((h) => ids.has(h.child))
    .sort((a, b) => b.date.localeCompare(a.date));
  const waiting = viewData.bookings.filter(
    (b) => ids.has(b.child) && b.status === "waitlist",
  );
  return (
    head(
      "КАБИНЕТ СЕМЬИ",
      "Здравствуйте, " +
        escape(viewData.children[0]?.parent.split(" ")[0] || "родитель") +
        "!",
      "Здесь начинается следующее маленькое открытие.",
      `<button class="btn primary" data-page="schedule">${I("plus")}Записаться</button>`,
    ) +
    `<div class="banner parent-hero"><div><div class="banner-label">МАСТЕРСКАЯ «ЯСНА» · СУРГУТ</div><h2>Место, где «я сам»<br>превращается в «я сделал».</h2><p>Занятия, первые победы и всё важное для вашей семьи.</p></div>${art}</div>${childPicker()}<div class="parent-grid"><section><div class="section-head"><h2>Ближайшие занятия${all ? " всей семьи" : ""}</h2></div>${
      bs
        .map((b) => {
          const l = lessonFor(b),
            c = child(b.child);
          return `<div class="lesson-card family-booking" data-family-booking="${b.id}"><div class="booking-heading"><span class="eyebrow">${dateLabel(l.date)}</span>${all ? `<span class="badge">${escape(c.name)}</span>` : ""}</div>${lessonCard(l).replace('<article class="lesson-card">', "<div>").replace("</article>", "</div>")}<div class="booking-cancel"><button class="text-link" data-cancel="${b.id}" aria-label="Отменить запись: ${escape(c.name)}, ${escape(l.title)}">Отменить запись</button></div></div>`;
        })
        .join("") || empty("Пока нет записей. Выберите занятие в расписании.")
    }<h2 class="table-title">История посещений${all ? " всей семьи" : ""}</h2><div class="table-wrap family-history"><table><thead><tr><th>Дата</th>${all ? "<th>Ребёнок</th>" : ""}<th>Занятие</th><th>Статус</th><th>Списано</th></tr></thead><tbody>${hist.map((h) => `<tr data-history-child="${h.child}"><td>${dateLabel(h.date)}</td>${all ? `<td>${escape(child(h.child).name)}</td>` : ""}<td>${escape(h.title)}</td><td><span class="badge ${h.status === "missed" ? "warn" : ""}">${h.status === "attended" ? "Был на занятии" : "Пропуск"}</span></td><td>${h.charged ? "1 занятие" : "—"}</td></tr>`).join("")}</tbody></table>${hist.length ? "" : empty("История появится после первого занятия")}</div>${waiting.length ? `<div class="inline-notice">${all ? "В листе ожидания: " + [...new Set(waiting.map((b) => escape(child(b.child).name)))].join(", ") + "." : "Вы в листе ожидания."} Мастер увидит заявку и свяжется, когда появится место.</div>` : ""}</section><aside>${all ? familySubscriptions(cs) : cs.map(parentSubscription).join("")}<div class="panel"><h2>Планы меняются — это нормально</h2><p class="subtitle">Отмените запись за ${viewData.settings.cancelHours} ч. до начала. Занятие останется в абонементе.</p><p class="mini-note">${viewData.settings.chargeMissed ? "При пропуске без отмены занятие списывается." : "При пропуске занятие сохраняется."}</p></div></aside></div>`
  );
}

function bind() {
  bindOperations();
  bindOnlinePayments();
  document
    .querySelectorAll("[data-application]")
    .forEach(
      (b) => (b.onclick = () => applicationModal(b.dataset.application)),
    );
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        page = b.dataset.page;
        filter = "";
        render();
        window.scrollTo(0, 0);
      }),
  );
  document.querySelectorAll("[data-role]").forEach(
    (b) =>
      (b.onclick = () => {
        role = b.dataset.role;
        page = "dashboard";
        filter = "";
        render();
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => actions[b.dataset.action]?.()));
  document
    .querySelectorAll("[data-journal]")
    .forEach((b) => (b.onclick = () => journal(b.dataset.journal)));
  document
    .querySelectorAll("[data-child]")
    .forEach((b) => (b.onclick = () => childModal(b.dataset.child)));
  document.querySelectorAll("[data-date]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedDate = b.dataset.date;
        render();
      }),
  );
  document.querySelectorAll("[data-week]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() + +b.dataset.week);
        selectedDate = d.toISOString().slice(0, 10);
        render();
      }),
  );
  document.querySelector("#calendar-date")?.addEventListener("change", (e) => {
    if (e.target.value) {
      selectedDate = e.target.value;
      render();
    }
  });
  document
    .querySelectorAll("[data-remind]")
    .forEach((b) => (b.onclick = () => remind(b.dataset.remind)));
  document
    .querySelectorAll("[data-paychild]")
    .forEach((b) => (b.onclick = () => paymentModal(b.dataset.paychild)));
  document.querySelectorAll("[data-subfilter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.subfilter;
        render();
      }),
  );
  document
    .querySelectorAll("[data-export]")
    .forEach((b) => (b.onclick = () => exportCSV(b.dataset.export)));
  document.querySelectorAll("[data-selectchild]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedChild = b.dataset.selectchild;
        render();
      }),
  );
  document
    .querySelectorAll("[data-signup]")
    .forEach((b) => (b.onclick = () => signup(b.dataset.signup)));
  document
    .querySelectorAll("[data-cancel]")
    .forEach((b) => (b.onclick = () => cancelModal(b.dataset.cancel)));
  document
    .querySelectorAll("[data-upload]")
    .forEach((b) => (b.onclick = () => uploadReceipt(b.dataset.upload)));
  document.querySelectorAll("[data-receipt]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = viewData.payments.find(
          (p) => p.id === b.dataset.receipt,
        )?.receipt;
        if (r) {
          if (r.data) downloadDataURL(r.data, r.name);
          else {
            downloadRemoteReceipt(b.dataset.receipt,r.name);
          }
        }
      }),
  );
  document.querySelector("#client-search")?.addEventListener("input", (e) => {
    filter = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const field = document.querySelector("#client-search");
    field.focus();
    field.setSelectionRange(pos, pos);
  });
  const settingsForm=document.querySelector('#settings-form');
  if(settingsForm)for(const name of ['lessonPrice','credits'])settingsForm.querySelector('[name='+name+']').addEventListener('input',()=>{settingsForm.querySelector('[name=price]').value=(Math.round(Number(settingsForm.querySelector('[name=lessonPrice]').value)*100)*Number(settingsForm.querySelector('[name=credits]').value)/100).toFixed(2)});
  document
    .querySelector("#settings-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = Object.fromEntries(new FormData(e.target));
      a.singlePrice=a.lessonPrice;
      a.price=(Math.round(Number(a.lessonPrice)*100)*Number(a.credits)/100).toFixed(2);
      a.type = "settings";
      a.chargeMissed = e.target.querySelector("[name=chargeMissed]").checked;
      await act(a, "Правила сохранены");
    });
}
function showModal(title, body, large = false) {
  disposeCheckout();
  closeNavigation(false);
  document.body.classList.add("modal-open");
  document.querySelector("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${large ? "large" : ""}" role="dialog" aria-modal="true" aria-label="${escape(title)}"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" id="close-modal" aria-label="Закрыть">${I("close")}</button></div>${body}</section></div>`;
  enhanceTables(document.querySelector(".modal"));
  document.querySelector("#close-modal").onclick = closeModal;
  document.querySelector(".modal-backdrop").onclick = (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeModal();
  };
  document.querySelector(".modal input,.modal select,.modal button")?.focus();
}
function closeModal() {
  disposeCheckout();
  document.body.classList.remove("modal-open");
  document.querySelector("#modal-root").innerHTML = "";
  modalLesson = null;
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab" && document.querySelector(".modal")) {
    const els = [
      ...document
        .querySelector(".modal")
        .querySelectorAll("button,input,select,textarea,a[href]"),
    ].filter((x) => !x.disabled);
    if (e.shiftKey && document.activeElement === els[0]) {
      e.preventDefault();
      els.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
      e.preventDefault();
      els[0].focus();
    }
  }
});
function form(title, body, onSubmit) {
  showModal(
    title,
    `<form id="dialog-form">${body}<p class="error" id="form-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn" id="cancel-dialog">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></form>`,
  );
  document.querySelector("#cancel-dialog").onclick = closeModal;
  const lessonType = document.querySelector("#dialog-form [name=lessonType]");
  if (lessonType) {
    const capacity = document.querySelector("#dialog-form [name=capacity]");
    lessonType.addEventListener("change", () => {
      const individual = lessonType.value === "individual";
      if (individual) {
        capacity.dataset.groupCapacity = capacity.value;
        capacity.value = "1";
      } else capacity.value = capacity.dataset.groupCapacity || "6";
      capacity.readOnly = individual;
      document.querySelector("#capacity-note").textContent = individual
        ? "Индивидуальное занятие рассчитано на одного ребёнка."
        : "Укажите количество мест в группе.";
    });
  }
  document.querySelector("#dialog-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(e.target)));
    } catch (err) {
      document.querySelector("#form-error").textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  };
}
const selectChildren = (id, cs = viewData.children.filter(c=>!c.archived)) =>
  `<label class="form-field">Ребёнок<select name="child" required>${cs.map((c) => `<option value="${c.id}" ${c.id === id ? "selected" : ""}>${escape(c.name)}</option>`).join("")}</select></label>`;
function paymentModal(id){familyPaymentModal('subscription',true,id)}
function manualAmountModal(id) {
  form(
    "Принять оплату",
    selectChildren(id) +
      `<div class="inline-notice">${backend ? "Запись об оплате подтверждает получение денег вручную." : "Тестовая оплата. Деньги не переводятся."}</div><div class="form-row"><label class="form-field">Сумма, ₽<input name="amount" type="number" min="1" step="0.01" max="1000000" value="${viewData.settings.price}" required></label><label class="form-field">Количество занятий<input name="credits" type="number" min="0" max="100000" value="${viewData.settings.credits}" required></label></div><label class="form-field">Способ оплаты<select name="method"><option>Перевод</option><option>Наличные</option></select></label><p class="mini-note">Занятия рассчитаются по цене ${money(lessonPriceMinor(viewData.settings)/100)} за занятие. Остаток денег сохранится авансом у ребёнка. Чек можно прикрепить на странице оплат.</p><button class="text-link" type="button" id="manual-family-pay">Пробное, разовое или абонемент для семьи</button><p class="mini-note" id="manual-payment-quote" role="status"></p>`,
    async (a) => {
      if (
        await act(
          { type: "payment", ...a, autoCredits:true },
          "Оплата внесена. Абонемент пополнен.",
        )
      )
        closeModal();
    },
  );
  const modal=document.querySelector('.modal'),amount=modal.querySelector('[name=amount]'),credits=modal.querySelector('[name=credits]'),choice=modal.querySelector('[name=child]');
  const preview=()=>{const target=modal.querySelector('#manual-payment-quote');try{const quote=paymentQuote(viewData.settings,amount.value,child(choice.value).advanceMinor||0);credits.value=quote.credits;target.textContent=`Начислится ${quote.credits} зан. · аванс после оплаты ${money(quote.advanceAfterMinor/100)}`}catch(error){credits.value='';target.textContent=error.message}};
  document.querySelector('#manual-family-pay').onclick=()=>familyPaymentModal('subscription',true,choice.value||choice.querySelector('option[selected]')?.value||choice.querySelector('option')?.value);
  amount.addEventListener('input',preview);choice.addEventListener('change',preview);credits.addEventListener('input',()=>{try{const quote=lessonPurchase(viewData.settings,credits.value,child(choice.value).advanceMinor||0);amount.value=(quote.amountMinor/100).toFixed(2);preview()}catch(error){modal.querySelector('#manual-payment-quote').textContent=error.message}});preview();
}
function journal(id) {
  modalLesson = id;
  const l = viewData.lessons.find((l) => l.id === id),
    bs = bookings(id),
    waiting = viewData.bookings.filter(
      (b) => b.lesson === id && b.status === "waitlist",
    );
  showModal(
    l.title,
    `<div class="section-head"><span class="mini-note">${dateLabel(l.date)} · ${l.time} · ${l.duration} минут · ${lessonTypeLabel(l)}</span><span class="badge">${bs.length} из ${l.capacity} мест</span></div><div class="table-wrap attendance-sheet"><table><thead><tr><th>Ребёнок</th><th>Остаток</th><th>Посещение</th></tr></thead><tbody>${bs
      .map((b) => {
        const c = child(b.child);
        return `<tr><td><div class="person">${avatar(c)}<div><button class="student-profile-link" data-journal-child="${c.id}">${escape(c.name)}</button><small>${escape(c.parent)}</small></div></div></td><td><span class="badge ${c.balance <= viewData.settings.remindAt ? "warn" : ""}">${c.balance} зан.</span></td><td><div class="attendance-actions"><button class="btn small ${b.status === "attended" ? "selected" : ""}" data-attend="${b.id}" data-status="attended">${I("check")}Пришёл</button><button class="btn small ${b.status === "missed" ? "missed" : ""}" data-attend="${b.id}" data-status="missed">Пропуск</button>${b.status !== "booked" ? `<button class="text-link" data-attend="${b.id}" data-status="booked" title="Снять отметку">${I("refresh")}</button>` : `<button class="text-link" data-movebooking="${b.id}" title="Перенести запись">${I("calendar")}</button><button class="text-link" data-cancelbook="${b.id}" title="Отменить запись">${I("close")}</button>`}</div></td></tr>`;
      })
      .join(
        "",
      )}</tbody></table>${bs.length ? "" : empty("В группе пока никого нет")}</div><p class="mini-note">«Пришёл» списывает 1 занятие. ${viewData.settings.chargeMissed ? "Пропуск тоже списывает занятие." : "Пропуск сохраняет занятие."} Повторная отметка не приводит к повторному списанию. ↻ возвращает занятие.</p>${waiting.length ? `<h3 style="margin-top:20px">Лист ожидания</h3>${waiting.map((b) => `<p class="subtitle">${escape(child(b.child).name)} · ${escape(child(b.child).parent)}</p>`).join("")}` : ""}<div class="modal-actions"><button class="btn" data-movelesson="${id}">Перенести занятие</button><button class="btn danger" data-cancellesson="${id}">Отменить занятие</button><button class="btn primary" id="journal-add">${I("plus")}Записать ребёнка</button></div>`,
    true,
  );
  modalLesson = id;
  document.querySelectorAll("[data-attend]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          await act(
            {
              type: "attendance",
              booking: b.dataset.attend,
              status: b.dataset.status,
            },
            "Посещение сохранено",
          )
        )
          journal(id);
      }),
  );
  document
    .querySelectorAll("[data-cancelbook]")
    .forEach((b) => (b.onclick = () => cancelModal(b.dataset.cancelbook)));
  document.querySelector("#journal-add").onclick = () => signup(id);
  document.querySelectorAll("[data-journal-child]").forEach(button=>button.onclick=()=>childModal(button.dataset.journalChild));
  bindOperations();
}
function signup(id) {
  const l = viewData.lessons.find((l) => l.id === id);
  const full = occupancy(id) >= l.capacity;
  const cs =
    role === "parent" && selectedChild === "all"
      ? viewData.children.filter(
          (c) =>
            !viewData.bookings.some(
              (b) =>
                b.child === c.id && b.lesson === id && b.status !== "cancelled",
            ),
        )
      : viewData.children.filter(c=>!c.archived);
  if (!cs.length)
    return toast(
      "Все дети уже записаны на это занятие или находятся в листе ожидания",
    );
  form(
    full ? "В лист ожидания" : "Записать ребёнка",
    `<h3>${escape(l.title)}</h3><p class="subtitle" style="margin-bottom:20px">${dateLabel(l.date)} · ${l.time} · ${l.duration} минут · ${lessonTypeLabel(l)}</p>` +
      selectChildren(selectedChild, cs) +
      `<div class="inline-notice">${full ? "Группа заполнена. Мастер увидит заявку в листе ожидания." : "При записи занятие не списывается. Мастер отметит посещение после занятия."}</div>`,
    async (a) => {
      if (
        await act(
          { type: "book", child: a.child, lesson: id, waitlist: full },
          full ? "Заявка в листе ожидания" : "Ребёнок записан",
        )
      ) {
        closeModal();
        if (role === "master") journal(id);
      }
    },
  );
}
function cancelModal(id) {
  const b = viewData.bookings.find((b) => b.id === id);
  if (!b || !["booked","waitlist"].includes(b.status))
    return toast("У этой записи уже отмечено посещение");
  const l = viewData.lessons.find((l) => l.id === b.lesson);
  showModal(
    "Отменить запись?",
    `<p class="subtitle">${escape(child(b.child).name)} · ${escape(l.title)}<br>${dateLabel(l.date)} в ${l.time}</p><div class="inline-notice">Занятие сохранится в абонементе. Место освободится для другой семьи.</div><div class="modal-actions"><button class="btn" data-movebooking="${id}">Перенести запись</button><button class="btn" id="keep-booking">Оставить запись</button><button class="btn primary" id="cancel-booking">Отменить запись</button></div>`,
  );
  bindOperations();
  document.querySelector("#keep-booking").onclick = closeModal;
  document.querySelector("#cancel-booking").onclick = async () => {
    if (await act({ type: "cancel", booking: id }, "Запись отменена"))
      closeModal();
  };
}
function childModal(id) {
  const c = child(id),
    h = viewData.history.filter((h) => h.child === id),
    studentPayments=viewData.payments.filter(p=>p.child===id);
  showModal(
    escape(c.name),
    `<div class="person">${avatar(c)}<div><b>${c.age} лет</b><small>${escape(c.parent)} · ${escape(c.phone)}</small>${c.email ? `<small>${escape(c.email)}</small>` : ""}${c.messenger ? `<small>${escape(c.messenger)}</small>` : ""}</div></div><div class="client-detail-grid" style="margin-top:22px"><div class="panel"><div class="mini-note">Остаток абонемента</div><div class="stat-val">${c.balance} <small style="font-size:12px">зан.</small></div></div><div class="panel"><div class="mini-note">Посещений</div><div class="stat-val">${h.filter((h) => h.status === "attended").length}</div></div></div><h3>История занятий</h3>${h.length ? h.map((h) => `<div class="reminder-row"><div class="reminder-info"><b>${escape(h.title)}</b><small>${dateLabel(h.date)}</small></div><span class="badge ${h.status === "missed" ? "warn" : ""}">${h.status === "attended" ? "Пришёл" : "Пропуск"}</span></div>`).join("") : empty("Первые открытия ещё впереди")}${studentPayments.length?`<h3>История оплат</h3>${studentPayments.map(p=>`<div class="reminder-row"><div class="reminder-info"><b>${money(p.amount)} · ${p.credits} зан.</b><small>${dateLabel(p.date)} · ${escape(p.method)}</small></div><span class="badge">${p.receipt?'Чек прикреплён':'Без чека'}</span></div>`).join('')}`:'<p class="mini-note">Оплат пока нет</p>'}<p class="mini-note">Денежный аванс: ${money((c.advanceMinor||0)/100)}</p>${backend ? `<button class="btn small" id="parent-access" style="margin-top:18px">${I("users")}Ссылка для родителя</button>` : ""}<div class="modal-actions management-actions">${c.archived?`<button class="btn primary" data-restorechild="${id}">Вернуть из архива</button>`:`<button class="btn" data-editchild="${id}">Изменить данные</button><button class="btn danger" data-archivechild="${id}">Убрать ребёнка</button>`}</div><div class="modal-actions"><button class="btn" id="child-remind">${I("send")}Напомнить</button><button class="btn primary" id="child-pay">Принять оплату</button></div>`,
  );
  document
    .querySelector("#parent-access")
    ?.addEventListener("click", () => parentAccount(c.family));
  document.querySelector("#child-pay").onclick = () => paymentModal(id);
  document.querySelector("#child-remind").onclick = () => remind(id);
  if(c.archived){document.querySelector("#child-pay").disabled=true;document.querySelector("#parent-access")?.remove()}
  bindOperations();
}
function remind(id) {
  const c = child(id),
    message = `Здравствуйте, ${c.parent.split(" ")[0]}! У ${c.name} осталось ${c.balance} занятий в мастерской «Ясна». Можно продлить абонемент: ${viewData.settings.credits} занятия — ${money(viewData.settings.price)}. Будем рады новым открытиям!`;
  showModal(
    "Напомнить о продлении",
    `<p class="subtitle">${escape(c.parent)} · ${escape(c.phone)}</p><label class="form-field" style="margin-top:20px">Текст для отправки<textarea id="reminder-text" rows="5">${escape(message)}</textarea></label><p class="mini-note">Скопируйте текст и отправьте родителю в привычном мессенджере. Автоматическая отправка не подключена.</p><div class="modal-actions"><button class="btn primary" id="copy-reminder">Скопировать текст</button></div>`,
  );
  document.querySelector("#copy-reminder").onclick = async () => {
    try {
      await navigator.clipboard.writeText(
        document.querySelector("#reminder-text").value,
      );
      await act({ type: "remind", child: id }, "Напоминание скопировано");
      closeModal();
    } catch {
      document.querySelector("#reminder-text").select();
      toast("Выделенный текст можно скопировать вручную");
    }
  };
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadDataURL(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
function exportCSV(key) {
  let rows;
  if (key === "children")
    rows = [
      ["Ребёнок", "Возраст", "Родитель", "Телефон", "Остаток"],
      ...viewData.children.map((c) => [
        c.name,
        c.age,
        c.parent,
        c.phone,
        c.balance,
      ]),
    ];
  if (key === "history")
    rows = [
      ["Ребёнок", "Дата", "Занятие", "Статус", "Списано"],
      ...viewData.history.map((h) => [
        child(h.child).name,
        h.date,
        h.title,
        h.status === "attended" ? "Посещение" : "Пропуск",
        h.charged ? 1 : 0,
      ]),
    ];
  if (key === "payments")
    rows = [
      ["Дата", "Ребёнок", "Сумма", "Занятий", "Способ", "Чек"],
      ...viewData.payments.map((p) => [
        p.date,
        child(p.child).name,
        p.amount,
        p.credits,
        p.method,
        p.receipt ? "Есть" : "Нет",
      ]),
    ];
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'" + "$&")
      .replaceAll('"', '""') +
    '"';
  download(
    "\ufeff" + rows.map((r) => r.map(cell).join(";")).join("\r\n"),
    "yasna-" + key + ".csv",
    "text/csv;charset=utf-8",
  );
  toast("CSV выгружен");
}
function uploadReceipt(id) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.jpg,.jpeg,.png";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024)
      return toast("Максимальный размер чека — 2 МБ");
    const reader = new FileReader();
    reader.onload = async () =>
      await act(
        {
          type: "receipt",
          payment: id,
          receipt: { name: file.name, data: reader.result },
        },
        "Чек доступен в кабинете родителя",
      );
    reader.readAsDataURL(file);
  };
  input.click();
}
const actions = {
  addparent:()=>parentEdit(),
  importdata:()=>importModal(),
  intake: () => navigateEnrollment(true),
  menu: () => toggleNavigation(),
  closemenu: () => closeNavigation(true),
  today: () => {},
  openjournal: () => {
    const l = viewData.lessons.find((l) => l.date === TODAY&&l.status!=="cancelled");
    if (l) journal(l.id);
    else toast("Сегодня занятий нет");
  },
  addpayment: () => paymentModal(),
  addlesson: () =>
    form(
      "Новое занятие",
      `<label class="form-field">Название<input name="title" placeholder="Например, полка для сокровищ" maxlength="100" required></label><div class="form-row"><label class="form-field">Дата<input name="date" type="date" value="${selectedDate}" required></label><label class="form-field">Время (Сургут)<input name="time" type="time" value="16:00" required></label></div><label class="form-field">Формат занятия<select name="lessonType">${Object.entries(LESSON_FORMATS).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label class="form-field">Направление<select name="format"><option>Столярная мастерская</option><option>Маленькие мастера</option><option>Семейная мастерская</option></select></label><label class="form-field">Длительность, минут<input name="duration" type="number" inputmode="numeric" min="1" max="1440" step="1" value="90" placeholder="Например, 45 или 75" required></label><label class="form-field">Количество мест<input name="capacity" type="number" min="1" max="30" value="6" required><span class="mini-note" id="capacity-note">Укажите количество мест в группе.</span></label><label class="form-field">Возраст<input name="age" value="7–10 лет" maxlength="30" required></label><details><summary>Участники группы</summary><p class="mini-note">Отметьте детей списком. Сервер проверит количество мест.</p>${viewData.children.filter(c=>!c.archived).map(c=>`<label class="check-label"><input type="checkbox" name="lessonMember" value="${c.id}">${escape(c.name)} · ${c.balance} зан.</label>`).join('')}</details>`,
      async (a) => {
        if (await act({ type: "lesson", ...a, children:[...document.querySelectorAll('[name=lessonMember]')].filter(c=>c.checked).map(c=>c.value) }, "Занятие добавлено")) {
          selectedDate = a.date;
          page = "schedule";
          closeModal();
          render();
        }
      },
    ),
  addchild: () =>
    form(
      "Новый маленький мастер",
      `<label class="form-field">Семья<select name="family"><option value="">Новая семья</option>${familyOptions()}</select></label><label class="form-field">Имя и фамилия ребёнка<input name="name" maxlength="100" required></label><label class="form-field">Возраст<input name="age" type="number" min="3" max="18" value="7" required></label><label class="form-field">Имя и фамилия родителя<input name="parent" maxlength="100" placeholder="Для новой семьи"></label><label class="form-field">Телефон<input name="phone" type="tel" placeholder="Для новой семьи: +7 (___) ___-__-__" maxlength="30"></label>`,
      async (a) => {
        if (await act({ type: "child", ...a }, "Ребёнок добавлен"))
          closeModal();
      },
    ),
  theme: () => {toggleTheme()},
  notifications: () => notificationsModal(),
  parentpay: () => familyPaymentModal(),
  paymentsettings: () => {page='settings';render();document.querySelector('#yookassa-form')?.scrollIntoView?.({behavior:'smooth',block:'start'})},
  onlinepay: () => familyPaymentModal(),
  backup: async () => {
    try {
      const r = await apiFetch("/api/backup"),
        backup = await readJson(r);
      if (!r.ok) throw Error(backup.error);
      download(
        JSON.stringify(backup, null, 2),
        "yasna-backup-" + new Date().toISOString().slice(0, 10) + ".json",
        "application/json",
      );
      toast("Полная резервная копия скачана");
    } catch (e) {
      toast(e.message);
    }
  },
  restore: () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = ".json";
    i.onchange = async () => {
      try {
        const file = i.files[0];
        if (file.size > 25 * 1024 * 1024) throw Error("Файл слишком большой");
        const value = JSON.parse(await file.text());
        validateState(value);
        showModal(
          "Заменить данные резервной копией?",
          `<p class="subtitle">В копии: ${value.children.length} детей, ${value.lessons.length} занятий, ${value.payments.length} оплат. Текущие данные будут заменены.</p><div class="modal-actions"><button class="btn" id="backup-cancel">Отмена</button><button class="btn primary" id="backup-confirm">Восстановить</button></div>`,
        );
        document.querySelector("#backup-cancel").onclick = closeModal;
        document.querySelector("#backup-confirm").onclick = async () => {
          try {
            if (backend) {
              const r = await apiFetch("/api/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ state: value, revision: data.revision }),
              });
              const result = await readJson(r);
              if (!r.ok) throw Error(result.error);
              data = result;
            } else {
              saveLocal(value);
            }
            closeModal();
            render();
            toast("Резервная копия восстановлена");
          } catch (e) {
            toast(e.message);
          }
        };
      } catch (e) {
        toast(e.message);
      }
    };
    i.click();
  },
  about: () =>
    showModal(
      "Ясна · первая версия",
      `<p class="subtitle">Расписание → запись → посещение → списание → оплата → чек.</p><div class="inline-notice">${backend ? "Серверный режим: отдельные сессии мастера и родителя, SQLite, проверка прав доступа и резервные копии." : "Демонстрация на вымышленных данных. Изменения сохраняются в браузере. Переключатель ролей показывает обе стороны приложения и не является защитой доступа."}</div><p class="subtitle">Для самостоятельного размещения предусмотрен Node.js 24 + SQLite без платной CRM. Онлайн-эквайринг, автоматическая выдача фискальных чеков и сообщения в мессенджере требуют подключения выбранных сервисов.</p><p class="mini-note">Лист ожидания доступен при заполненной группе. Автоматическое предложение освободившегося места, импорт «МойКласс» и отработки — следующий этап.</p>${!backend ? `<a class="btn green" href="https://github.com/vosavasof/Yasno" target="_blank" rel="noopener noreferrer">${I("download")}Скачать исходники и инструкцию</a>` : ""}`,
    ),
  logout: async () => {
    await apiFetch("/api/logout", { method: "POST" });
    user = { role: null };
    render();
  },
};
function login() {
  document.querySelector("#app").innerHTML =
    `<div class="login-page"><form id="login-form" class="login-card">${brand}${themeSwitch({id:'login-theme'})}<h2>Вход для мастера</h2><label class="form-field">Логин<input name="username" autocomplete="username" required></label><label class="form-field">Пароль<input name="password" type="password" autocomplete="current-password" required></label><p class="error" id="login-error"></p><button class="btn primary" type="submit">Войти ${I("arrow")}</button><p class="mini-note">Родителям не нужны логин и пароль: мастер выдаёт персональную ссылку на кабинет семьи.</p><button type="button" class="btn" id="login-intake">Впервые у нас? Записать ребёнка</button></form></div>`;
  document.querySelector("#login-theme").onclick=toggleTheme;
  document.querySelector("#login-intake").onclick = () =>
    navigateEnrollment(true);
  document.querySelector("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const r = await apiFetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        }),
        result = await readJson(r);
      if (!r.ok) throw Error(result.error);
      user = result;
      role = user.role;
      parentEntryError = null;
      page = "dashboard";
      await loadServer();
      render();
      if(returnPaymentId)void syncOnlinePayments(true);
    } catch (err) {
      document.querySelector("#login-error").textContent = err.message;
      button.disabled = false;
    }
  };
}

init();

async function parentAccount(family) {
  try {
    const r = await apiFetch(
        "/api/parent-links?family=" + encodeURIComponent(family),
        { cache: "no-store" },
      ),
      result = await readJson(r);
    if (!r.ok) throw Error(result.error);
    showParentLinks(family, result.links);
  } catch (e) {
    toast(e.message);
  }
}
function showParentLinks(family, links) {
  const c = viewData.children.find((c) => c.family === family),
    status = {
      active: "Действует",
      expired: "Срок истёк",
      revoked: "Отозвана",
    };
  showModal(
    "Ссылки для родителя",
    `<p class="subtitle">${escape(c?.parent || "Семья")} · ${viewData.children
      .filter((c) => c.family === family)
      .map((c) => escape(c.name))
      .join(
        ", ",
      )}</p><p class="mini-note">Ссылка открывает только кабинет этой семьи, без логина и пароля. Мастер может скопировать, перевыпустить или отозвать её.</p><div class="parent-links-list">${links.map((link) => `<article class="parent-link-card" data-parent-link="${link.id}"><div class="section-head"><h3>${escape(link.label)}</h3><span class="badge ${link.status === "active" ? "" : "warn"}">${status[link.status]}</span></div><p class="mini-note">До ${new Date(link.expiresAt).toLocaleDateString("ru-RU", { timeZone: "Asia/Yekaterinburg" })} ${link.lastUsed ? "· последний вход " + new Date(link.lastUsed).toLocaleDateString("ru-RU", { timeZone: "Asia/Yekaterinburg" }) : ""}</p>${link.url ? `<label class="form-field">Персональная ссылка<input readonly data-parent-url="${link.id}" value="${escape(link.url)}"></label><button class="btn small green" data-copy-parent="${link.id}">${I("file")}Скопировать</button> ` : ""}${link.status === "active" ? `<button class="btn small" data-rotate-parent="${link.id}">Перевыпустить</button> <button class="btn small" data-revoke-parent="${link.id}">Отозвать</button>` : ""}</article>`).join("") || empty("Ссылок пока нет. Создайте первую ниже.")}</div><form id="parent-link-form" style="margin-top:22px"><h3 style="margin-bottom:16px">Новая ссылка</h3><label class="form-field">Название для мастера<input name="label" maxlength="100" value="Родитель" required></label><label class="form-field">Срок действия, дней<input name="expiresDays" type="number" min="1" max="3650" step="1" value="365" required></label><p class="error" id="parent-link-error" role="alert"></p><button class="btn primary" type="submit">${I("plus")}Создать ссылку</button></form>`,
  );
  document.querySelector("#parent-link-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const input = Object.fromEntries(new FormData(e.target)),
        r = await apiFetch("/api/parent-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, family }),
        }),
        result = await readJson(r);
      if (!r.ok) throw Error(result.error);
      await parentAccount(family);
      toast("Ссылка создана. Скопируйте и передайте её родителю.");
    } catch (err) {
      document.querySelector("#parent-link-error").textContent = err.message;
      button.disabled = false;
    }
  };
  document.querySelectorAll("[data-copy-parent]").forEach(
    (b) =>
      (b.onclick = async () => {
        const input = document.querySelector(
          `[data-parent-url="${b.dataset.copyParent}"]`,
        );
        try {
          await navigator.clipboard.writeText(input.value);
          toast("Ссылка скопирована");
        } catch {
          input.focus();
          input.select();
          toast("Ссылка выделена — скопируйте её вручную");
        }
      }),
  );
  document
    .querySelectorAll("[data-revoke-parent]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirmParentLinkAction(family, b.dataset.revokeParent, "revoke")),
    );
  document
    .querySelectorAll("[data-rotate-parent]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirmParentLinkAction(family, b.dataset.rotateParent, "rotate")),
    );
}
function confirmParentLinkAction(family, id, action) {
  showModal(
    action === "revoke" ? "Отозвать ссылку?" : "Перевыпустить ссылку?",
    `<p class="subtitle">Старая ссылка и все открытые по ней сессии перестанут действовать.${action === "rotate" ? " Будет создана новая ссылка, которую нужно передать родителю." : ""}</p><div class="modal-actions"><button class="btn" id="cancel-link-change">Отмена</button><button class="btn primary" id="confirm-link-change">${action === "revoke" ? "Отозвать" : "Перевыпустить"}</button></div>`,
  );
  document.querySelector("#cancel-link-change").onclick = () =>
    parentAccount(family);
  document.querySelector("#confirm-link-change").onclick = async () => {
    const button = document.querySelector("#confirm-link-change");
    button.disabled = true;
    try {
      const r = await apiFetch(
          "/api/parent-links/" + encodeURIComponent(id) + "/" + action,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          },
        ),
        result = await readJson(r);
      if (!r.ok) throw Error(result.error);
      await parentAccount(family);
      toast(
        action === "revoke"
          ? "Ссылка отозвана"
          : "Новая ссылка создана. Старая больше не действует.",
      );
    } catch (e) {
      toast(e.message);
      button.disabled = false;
    }
  };
}
function renderParentLinkError() {
  document.querySelector("#app").innerHTML =
    `<div class="login-page"><section class="login-card">${brand}<h2>Не удалось открыть кабинет</h2><p class="error">${escape(parentEntryError)}</p><p class="subtitle">Свяжитесь с мастером мастерской «Ясна», чтобы получить действующую персональную ссылку.</p></section></div>`;
}

function renderPublicHome(){const prices=planSettings({});document.querySelector('#app').innerHTML=`<main class="web-home"><header class="section-head">${brand}${themeSwitch({id:'public-theme'})}</header><section class="panel"><div class="eyebrow">СТОЛЯРНАЯ МАСТЕРСКАЯ · СУРГУТ</div><h1>Мастерим своими руками.<br>Растём с каждым открытием.</h1><p class="subtitle">Занятия для детей, семей и компаний в мастерской «Ясна».</p><div class="modal-actions"><a class="btn primary" href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">Связаться и записаться</a><a class="btn" href="#web-formats">Форматы занятий</a></div></section><section id="web-formats"><h2>Выберите свой формат</h2><div class="public-formats">${Object.values(LESSON_FORMATS).map(label=>`<article class="panel"><h3>${label}</h3></article>`).join('')}</div></section><section><h2>Занятия и абонементы</h2><div class="public-formats">${[['Первый пробный урок',prices.trialPrice,'1 занятие'],['Разовое занятие',prices.singlePrice,'1 занятие'],['Абонемент',prices.subscriptionPrice,prices.subscriptionCredits+' занятия']].map(([title,price,detail])=>`<article class="panel"><h3>${title}</h3><div class="stat-val">${money(price)}</div><p class="mini-note">${detail}</p></article>`).join('')}</div><p class="inline-notice">При одной оплате для двух и более детей одной семьи — скидка 10%.</p></section><section class="panel"><h2>Запись и личный кабинет</h2><p>Общий сервер подключается. Пока записаться и уточнить расписание можно в группе мастерской.</p><p class="mini-note">Для мастера: веб-интерфейс опубликован. Чтобы включить кабинеты, общую базу, оплату и push, подключите новый HTTPS-сервер в Яндекс Cloud.</p><a class="text-link" href="https://github.com/vosavasof/Yasno/tree/main/deploy/yandex" target="_blank" rel="noopener noreferrer">Инструкция подключения сервера</a></section><footer class="footer">© 2026 Ясна · Сургут · <a href="https://vk.ru/yasna.vibe">ВКонтакте</a></footer></main>`;document.querySelector('#public-theme').onclick=toggleTheme}
function renderStartupError() {
  document.querySelector("#app").innerHTML =
    `<div class="login-page"><section class="login-card">${brand}<h2>Не удалось подключиться</h2><p class="error">${escape(startupError)}</p><button class="btn primary" id="retry-start">Повторить подключение</button></section></div>`;
  document.querySelector("#retry-start").onclick = init;
}

const applicationLabels = {
  pending: "Новая",
  contacted: "Связались",
  confirmed: "Подтверждена",
  declined: "Закрыта",
};
const contactLabels = {
  phone: "Телефон",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "Электронная почта",
};
async function loadPublicLessons() {
  if (backend) {
    const r = await apiFetch("/api/public/lessons", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const result = await readJson(r);
    if (!r.ok) throw Error(result.error || "Не удалось загрузить занятия");
    publicLessons = result.lessons;
    publicPrivacyUrl = result.privacyDocumentUrl||"";
  } else
    publicLessons = data.lessons.filter(
      (l) => l.status!=="cancelled"&&new Date(l.date + "T" + l.time + ":00+05:00") > demoNow(),
    );
  publicLessons.sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  );
}
async function navigateEnrollment(open) {
  enrollmentMode = open;
  enrollmentSuccess = null;
  closeModal();
  if (window.location) {
    if (window.history?.replaceState)
      window.history.replaceState(
        null,
        "",
        open ? "#enroll" : window.location.pathname + window.location.search,
      );
    else window.location.hash = open ? "#enroll" : "";
  }
  try {
    if (open) await loadPublicLessons();
    else if (backend && user.role) await loadServer();
    startupError = null;
  } catch (e) {
    startupError = e.message;
  }
  render();
}
window.addEventListener?.("hashchange", () => {
  const open = window.location?.hash === "#enroll";
  if (open !== enrollmentMode) navigateEnrollment(open);
});
function renderEnrollment() {
  const shell = (body) =>
    `<main class="intake-shell"><header class="intake-header">${brand}${themeSwitch({id:'intake-theme'})}</header>${body}<footer class="intake-footer">Мастерская «Ясна» · Сургут · Время занятий UTC+5<br><a href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">Группа мастерской ВКонтакте ↗</a></footer></main>`;
  if(enrollmentSuccess&&enrollmentSuccess.status!=='confirmed'){
    document.querySelector('#app').innerHTML=shell(`<section class="panel intake-success"><h1>Анкета отправлена</h1><p class="subtitle">Мастер получил контакты и свяжется с вами для записи. Доступ к кабинету семьи он выдаст персональной ссылкой.</p><p class="mini-note">Номер заявки: ${escape(enrollmentSuccess.id.slice(0,8))}</p><button class="btn primary" id="intake-another">Заполнить ещё одну анкету</button></section>`);
    document.querySelector('#intake-theme').onclick=toggleTheme;document.querySelector('#intake-another').onclick=()=>{enrollmentSuccess=null;renderEnrollment()};return;
  }
  if (enrollmentSuccess) {
    document.querySelector("#app").innerHTML = shell(
      `<section class="panel intake-success">${I('check')}<h1>Ребёнок записан</h1><p class="subtitle">Место закреплено. Оплатите сейчас или вернитесь к оплате позже в кабинете.</p>${enrollmentSuccess.lesson?`<p>${escape(enrollmentSuccess.lesson.title)} · ${dateLabel(enrollmentSuccess.lesson.date)} · ${enrollmentSuccess.lesson.time}</p>`:''}<p class="mini-note">Номер записи: ${escape(enrollmentSuccess.id.slice(0,8))}</p><p class="mini-note">Персональную ссылку для повторного входа в кабинет семьи выдаст мастер.</p><div class="modal-actions"><button class="btn primary" id="intake-pay-now">Оплатить сейчас</button><button class="btn" id="intake-pay-later">Оплатить позже</button><button class="text-link" id="intake-another">Записать ещё ребёнка</button></div></section>`,
    );
    document.querySelector("#intake-theme")?.addEventListener("click",toggleTheme);
    document.querySelector('#intake-pay-later').onclick=()=>navigateEnrollment(false);
    document.querySelector('#intake-pay-now').onclick=async()=>{const {child,plan='trial'}=enrollmentSuccess;selectedChild=child;await navigateEnrollment(false);if(startupError){toast(startupError);return}familyPaymentModal(plan)};
    document.querySelector("#intake-another").onclick = () => {
      enrollmentSuccess = null;
      renderEnrollment();
    };
    return;
  }
  document.querySelector("#app").innerHTML = shell(
    `<section class="intake-intro"><div class="eyebrow">ЗНАКОМСТВО С МАСТЕРСКОЙ</div><h1>Записать ребёнка</h1><p class="subtitle">Выберите свободное занятие и оставьте контакты. Ребёнок будет записан сразу, без подтверждения мастера. Оплатить можно сейчас или позже.</p><div class="intake-steps"><span>01 · Выбор занятия</span><span>02 · Запись</span><span>03 · Оплата сейчас или позже</span></div></section>${!backend ? '<div class="inline-notice">Демонстрационная форма. Используйте вымышленные контакты: заявка сохранится только в этом браузере. Для приёма заявок с других устройств нужен серверный режим.</div>' : ""}<form class="panel intake-form" id="intake-form"><h2>О ребёнке</h2><div class="form-row"><label class="form-field">Имя и фамилия ребёнка *<input name="childName" autocomplete="off" minlength="2" maxlength="100" placeholder="Например, Саша Иванов" required></label><label class="form-field">Возраст, лет *<input name="age" type="number" min="3" max="18" step="1" inputmode="numeric" placeholder="8" required></label></div><h2>Контакты родителя</h2><label class="form-field">ФИО родителя *<input name="parentName" autocomplete="name" minlength="2" maxlength="100" required></label><div class="form-row"><label class="form-field">Телефон *<input name="phone" type="tel" autocomplete="tel" maxlength="30" placeholder="+7 (___) ___-__-__" required></label><label class="form-field">Электронная почта *<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="parent@example.ru" required></label></div><div class="form-row"><label class="form-field">Как удобнее связаться *<select name="contactMethod"><option value="phone">По телефону</option><option value="telegram">В Telegram</option><option value="whatsapp">В WhatsApp</option><option value="email">По электронной почте</option></select></label><label class="form-field">Контакт в мессенджере<input name="messenger" maxlength="100" placeholder="@имя в Telegram или номер WhatsApp"><span class="mini-note">Для Telegram укажите имя пользователя. Для WhatsApp можно использовать указанный телефон.</span></label></div><label class="form-field">Удобное время для связи<input name="contactTime" maxlength="200" placeholder="Например, в будни после 18:00"></label><h2>Пожелания к занятию</h2><label class="form-field">Желаемый формат<select name="lessonType">${Object.entries(LESSON_FORMATS).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label class="form-field">Занятие *<select name="lesson" required><option value="">Выберите занятие</option>${publicLessons.map((l) => `<option value="${l.id}" ${l.available===0?'disabled':''}>${escape(l.title)} · ${dateLabel(l.date)} · ${l.time} · ${l.duration} мин. · ${l.available??'—'} мест</option>`).join("")}</select><span class="mini-note">Место закрепляется при отправке формы, если оно ещё свободно. Если группа заполнится, предложим выбрать другое занятие.</span></label><label class="form-field">Вариант оплаты<select name="plan"><option value="trial">Первый пробный урок</option><option value="single">Разовое занятие</option><option value="subscription">Абонемент</option></select></label><label class="form-field">Комментарий<textarea name="notes" rows="3" maxlength="500" placeholder="Что любит мастерить ребёнок, вопросы или пожелания"></textarea></label><label class="check-label intake-consent"><input name="consent" type="checkbox" required>${publicPrivacyUrl?`Согласен на обработку данных по <a href="${escape(publicPrivacyUrl)}" target="_blank" rel="noopener noreferrer">документу о персональных данных</a>.`:'Согласен на использование указанных данных для связи со мной и организации занятий.'}</label><p class="error" id="intake-error" role="alert"></p><button class="btn primary" type="submit">Записать ребёнка ${I("arrow")}</button><p class="mini-note">* Обязательные поля. Пароль на этом этапе не нужен.</p></form>`,
  );
  document.querySelector("#intake-theme")?.addEventListener("click",toggleTheme);
  const formatSelect=document.querySelector('#intake-form [name=lessonType]'),lessonSelect=document.querySelector('#intake-form [name=lesson]');
  const filterEnrollmentLessons=()=>{const type=formatSelect.value||formatSelect.querySelector('option[selected]')?.value||'group';lessonSelect.innerHTML='<option value="">'+'Выберите занятие'+'</option>'+publicLessons.filter(l=>(l.lessonType||'group')===type).map(l=>`<option value="${l.id}" ${l.available===0?'disabled':''}>${escape(l.title)} · ${dateLabel(l.date)} · ${l.time} · ${l.duration} мин. · ${l.available} мест</option>`).join('')};formatSelect.onchange=filterEnrollmentLessons;filterEnrollmentLessons();
  document.querySelector("#intake-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("[type=submit]");
    button.disabled = true;
    document.querySelector("#intake-error").textContent = "";
    try {
      const input = Object.fromEntries(new FormData(e.target));
      input.consent = e.target.querySelector("[name=consent]").checked;
      input.registrationKey=registrationKey;
      let result;
      if (backend) {
        const r = await apiFetch("/api/public/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        result = await readJson(r);
        if (!r.ok) throw Error(result.error || "Не удалось отправить заявку");
      } else {
        const next = structuredClone(data);
        result = enrollApplication(next, input, demoNow());
        saveLocal(next);
      }
      if(backend&&result.status==='confirmed'){user=await readJson(await apiFetch('/api/session'));role=user.role;await loadServer()}
      enrollmentSuccess = result;
      registrationKey=crypto.randomUUID();
      renderEnrollment();
    } catch (err) {
      document.querySelector("#intake-error").textContent = err.message;
      button.disabled = false;
    }
  };
}
function applicationsPage() {
  const rows = (viewData.applications || [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    head(
      "ЗНАКОМСТВО С НОВЫМИ СЕМЬЯМИ",
      "Первичные заявки",
      "Новые записи подтверждаются автоматически при наличии места. Старые заявки сохранены в истории.",
      `<button class="btn primary" data-action="intake">${I("plus")}Форма первичной записи</button>`,
    ) +
    `<div class="panel"><h2>Ссылка для новых родителей</h2><p class="subtitle">Форма открывается без личного кабинета. Место бронируется сразу при наличии свободных мест.</p><label class="form-field" style="margin-top:15px">Адрес формы<input readonly value="${escape((window.location?.origin || "") + (window.location?.pathname || "/") + "#enroll")}" aria-label="Ссылка на первичную запись"></label>${!backend ? '<p class="mini-note">Сейчас открыт деморежим: заявки видны только в этом браузере. Для общих заявок нужен сервер из комплекта исходников.</p>' : ""}</div><div class="table-wrap"><table><thead><tr><th>Дата</th><th>Ребёнок</th><th>Родитель</th><th>Контакты</th><th>Статус</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr data-request-row="${r.id}"><td>${dateLabel(r.createdAt.slice(0, 10))}</td><td><div class="person"><div><b>${escape(r.childName)}</b><small>${r.age} лет · ${r.lessonType === "individual" ? "Индивидуальное" : "Групповое"}</small></div></div></td><td>${escape(r.parentName)}</td><td>${escape(r.phone)}<br><span class="mini-note">${escape(r.email)}</span></td><td><span class="badge ${r.status === "pending" ? "warn" : ""}">${applicationLabels[r.status]}</span></td><td><button class="text-link" data-application="${r.id}">Открыть ${I("chevron")}</button></td></tr>`).join("")}</tbody></table>${rows.length ? "" : empty("Пока нет заявок. Отправьте родителям ссылку на форму первичной записи.")}</div>`
  );
}
function applicationModal(id) {
  const r = (viewData.applications || []).find((r) => r.id === id);
  if (!r) return;
  const l = viewData.lessons.find((l) => l.id === r.lesson);
  showModal(
    "Заявка: " + escape(r.childName),
    `<span class="badge ${r.status === "pending" ? "warn" : ""}">${applicationLabels[r.status]}</span><div class="intake-detail"><h3>Ребёнок</h3><p>${escape(r.childName)} · ${r.age} лет</p><h3>Родитель и контакты</h3><p>${escape(r.parentName)}<br>${escape(r.phone)}<br>${escape(r.email)}${r.messenger ? "<br>" + escape(r.messenger) : ""}</p><p>Способ связи: ${contactLabels[r.contactMethod]}${r.contactTime ? "<br>Удобное время: " + escape(r.contactTime) : ""}</p><h3>Пожелания</h3><p>${r.lessonType === "individual" ? "Индивидуальное" : "Групповое"} занятие<br>${l ? escape(l.title) + " · " + dateLabel(l.date) + " · " + l.time : "Нужна помощь с подбором занятия"}</p>${r.notes ? `<p style="white-space:pre-wrap">${escape(r.notes)}</p>` : ""}</div>${r.status === "pending" ? '<div class="inline-notice">Свяжитесь с родителем по указанным контактам. Отметка ниже не отправляет сообщение автоматически.</div>' : ""}${r.status === "confirmed" ? '<div class="inline-notice">Ребёнок добавлен. Мастер отдельно создаёт персональную ссылку и передаёт её родителю.</div>' : ""}<div class="modal-actions intake-request-actions">${r.status === "pending" ? '<button class="btn green" id="request-contacted">С родителем связались</button>' : ""}${r.status === "contacted" ? '<button class="btn primary" id="request-confirm">Подтвердить запись</button>' : ""}${["pending", "contacted"].includes(r.status) ? '<button class="btn" id="request-decline">Закрыть заявку</button>' : ""}${r.status === "confirmed" ? `<button class="btn" id="request-child">Карточка ребёнка</button><button class="btn primary" id="request-account">Ссылка для родителя</button>` : ""}</div>`,
  );
  document
    .querySelector("#request-contacted")
    ?.addEventListener("click", async () => {
      if (
        await act(
          { type: "application_status", application: id, status: "contacted" },
          "Отмечено: с родителем связались",
        )
      )
        applicationModal(id);
    });
  document
    .querySelector("#request-decline")
    ?.addEventListener("click", async () => {
      if (
        await act(
          { type: "application_status", application: id, status: "declined" },
          "Заявка закрыта",
        )
      )
        applicationModal(id);
    });
  document
    .querySelector("#request-confirm")
    ?.addEventListener("click", () => confirmApplication(id));
  document
    .querySelector("#request-child")
    ?.addEventListener("click", () => childModal(r.child));
  document.querySelector("#request-account")?.addEventListener("click", () => {
    if (backend) parentAccount(r.family);
    else
      showModal(
        "Личный кабинет родителя",
        `<p class="subtitle">В серверном режиме здесь мастер задаёт логин и пароль для этой семьи. Мастер создаёт и выдаёт персональную ссылку отдельно.</p><div class="inline-notice">Демо не создаёт настоящие учётные записи. Для выдачи доступа родителям запустите серверную версию из комплекта исходников.</div>`,
      );
  });
}
function confirmApplication(id) {
  const r = (viewData.applications || []).find((r) => r.id === id),
    lessons = viewData.lessons.filter(
      (l) =>
        l.status!=="cancelled"&&new Date(l.date + "T" + l.time + ":00+05:00") >
        (backend ? new Date() : demoNow()),
    );
  form(
    "Подтвердить запись ребёнка",
    `<p class="subtitle" style="margin-bottom:20px">${escape(r.childName)} · ${escape(r.parentName)}</p><label class="form-field">Семья<select name="family"><option value="">Создать новую семью</option>${familyOptions()}</select><span class="mini-note">Выбирайте существующую семью только после подтверждения родителем.</span></label><label class="form-field">Записать на занятие<select name="lesson"><option value="">Пока без записи на конкретное занятие</option>${lessons.map((l) => `<option value="${l.id}" ${l.id === r.lesson ? "selected" : ""}>${escape(l.title)} · ${dateLabel(l.date)} · ${l.time}</option>`).join("")}</select></label><div class="inline-notice">Ребёнок появится в списке клиентов. Занятия не начисляются, кабинет создаётся отдельно после подтверждения.</div>`,
    async (a) => {
      if (
        await act(
          { type: "application_confirm", application: id, ...a },
          "Запись подтверждена",
        )
      )
        applicationModal(id);
    },
  );
}

async function loadNotifications() {
  const r = await apiFetch("/api/notifications", { cache: "no-store" }),
    result = await readJson(r);
  if (r.status === 401) expireSession();
  if (!r.ok) throw Error(result.error || "Не удалось загрузить уведомления");
  alerts = result.items || [];
}
async function readNotifications(ids) {
  const r = await apiFetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }),
    result = await readJson(r);
  if (r.status === 401) expireSession();
  if (!r.ok) throw Error(result.error || "Не удалось сохранить отметку");
  alerts = result.items;
  render();
}
function notificationsModal() {
  const unread = alerts.filter((n) => !n.read);
  showModal(
    "Уведомления",
    `<div class="panel"><h3>Уведомления на iPhone</h3><p class="mini-note">Safari → Поделиться → На экран «Домой». Запустите сайт с экрана «Домой», затем разрешите уведомления. Нужны iOS 16.4+ и HTTPS.</p><div class="modal-actions"><button class="btn" id="enable-phone-push">Включить на этом устройстве</button><button class="btn primary" id="test-phone-push">Отправить проверку</button></div><p class="mini-note" id="phone-push-result" role="status"></p></div><div class="notification-summary"><span class="badge ${unread.length ? "warn" : ""}">${unread.length} непрочитанных</span>${unread.length ? '<button class="btn small green" id="read-all-notifications">Прочитать все</button>' : ""}</div><div class="notification-list">${
      alerts
        .slice()
        .sort((a, b) => Number(a.read) - Number(b.read))
        .map(
          (n) =>
            `<article class="notification-card ${n.read ? "is-read" : "is-unread"}" data-notification="${escape(n.id)}"><div class="notification-heading"><span class="activity-icon">${I(n.icon)}</span><h3>${escape(n.title)}</h3><span class="notification-label">${n.read ? "Прочитано" : "Новое"}</span></div><p>${escape(n.text)}</p><div class="notification-actions"><button class="text-link" data-open-notification="${escape(n.id)}">Открыть ${I("arrow")}</button>${!n.read ? `<button class="btn small" data-read-notification="${escape(n.id)}">${I("check")}Прочитано</button>` : ""}</div></article>`,
        )
        .join("") ||
      empty(
        "Новых уведомлений пока нет. Здесь появятся заявки, напоминания об абонементах и чеках.",
      )
    }</div>`,
  );
  document.querySelector('#enable-phone-push').onclick=async()=>{try{document.querySelector('#phone-push-result').textContent=await enablePush()}catch(error){document.querySelector('#phone-push-result').textContent=error.message}};
  document.querySelector('#test-phone-push').onclick=async()=>{const output=document.querySelector('#phone-push-result');try{const test=await testPush();output.textContent='Служба push приняла сообщение. Ждём подтверждение показа на телефоне…';for(let i=0;i<30&&output.isConnected;i++){await new Promise(r=>setTimeout(r,2000));const status=await pushStatus(test.id);if(status.status==='device_confirmed_display'){output.textContent='Устройство подтвердило показ уведомления. Проверьте уведомление на iPhone.';return}}if(output.isConnected)output.textContent='Телефон пока не подтвердил показ. Проверьте разрешения и запуск с экрана «Домой». Проверка доставки ещё не завершена.'}catch(error){output.textContent=error.message}};
  document
    .querySelector("#read-all-notifications")
    ?.addEventListener("click", async () => {
      try {
        await readNotifications(unread.map((n) => n.id));
        notificationsModal();
      } catch (e) {
        toast(e.message);
      }
    });
  document.querySelectorAll("[data-read-notification]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await readNotifications([b.dataset.readNotification]);
          notificationsModal();
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document.querySelectorAll("[data-open-notification]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          const n = alerts.find((n) => n.id === b.dataset.openNotification);
          if (!n.read) await readNotifications([n.id]);
          await loadServer();
          page = n.page;
          if (n.date) selectedDate = n.date;
          closeModal();
          render();
          if (n.application) applicationModal(n.application);
        } catch (e) {
          toast(e.message);
        }
      }),
  );
}

const notificationPoll = setInterval(async () => {
  if (!user.role || enrollmentMode || document.visibilityState === "hidden")
    return;
  try {
    await loadNotifications();
    const button = document.querySelector('[data-action="notifications"]');
    if (!button) return;
    const count = alerts.filter((n) => !n.read).length;
    button.classList.toggle("has-unread", count > 0);
    button.setAttribute("aria-label", `Уведомления: ${count} непрочитанных`);
    button.innerHTML =
      I("bell") +
      (count ? `<span class="notification-count">${count}</span>` : "");
  } catch {}
}, 30000);
notificationPoll.unref?.();

let masterSyncing=false;
async function syncMasterRegistrations(){
 const ready=()=>backend&&user.role==='master'&&!enrollmentMode&&document.visibilityState!=='hidden'&&!document.querySelector('.modal, #settings-form')&&!document.body.classList.contains('nav-open')&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);
 if(masterSyncing||!ready())return;
 masterSyncing=true;const owner=user.username||user.userId;
 try{const response=await apiFetch('/api/state');if(response.status===401){expireSession();return}if(!response.ok)return;const next=await readJson(response);if(!ready()||(user.username||user.userId)!==owner||next.revision<=data.revision)return;data=next;render()}catch{}finally{masterSyncing=false}
}
const masterRegistrationPoll=setInterval(syncMasterRegistrations,15000);masterRegistrationPoll.unref?.();
window.addEventListener?.('focus',syncMasterRegistrations);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')void syncMasterRegistrations()});

async function downloadRemoteReceipt(id,name){try{const r=await apiFetch('/api/receipts/'+encodeURIComponent(id));if(!r.ok){const e=await readJson(r);throw Error(e.error||'Не удалось скачать чек')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){toast(e.message)}}
function renderMasterSetup(code){document.querySelector('#app').innerHTML=`<div class="login-page"><form class="login-card" id="master-setup">${brand}<h2>Первый вход мастера</h2><p class="subtitle">Выберите логин и пароль. Эта персональная ссылка используется только один раз.</p><label class="form-field" style="margin-top:20px">Логин<input name="username" value="master" pattern="[a-zA-Z0-9_.-]{3,60}" autocomplete="username" required></label><label class="form-field">Пароль — от 12 символов<input name="password" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></label><label class="form-field">Повторите пароль<input name="confirmation" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></label><p class="error" id="setup-error" role="alert"></p><button class="btn primary" type="submit">Сохранить и открыть кабинет</button></form></div>`;document.querySelector('#master-setup').onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target)),button=e.target.querySelector('[type=submit]');if(values.password!==values.confirmation){document.querySelector('#setup-error').textContent='Пароли не совпадают';return}button.disabled=true;try{const r=await apiFetch('/api/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,username:values.username,password:values.password})}),result=await readJson(r);if(!r.ok)throw Error(result.error);user=result;role=result.role;page='dashboard';await loadServer();render()}catch(err){document.querySelector('#setup-error').textContent=err.message;button.disabled=false}}}

function mobileNavigation(){const tabs=role==='parent'?[['dashboard','grid','Моя семья'],['schedule','calendar','Записаться'],['payments','wallet','Оплаты']]:[['dashboard','grid','Обзор'],['schedule','calendar','Занятия'],['clients','users','Дети'],['payments','wallet','Оплаты']];const other=!tabs.some(t=>t[0]===page),pending=(viewData.applications||[]).filter(r=>r.status==='pending').length;return`<nav class="mobile-bottom-nav" aria-label="Основные разделы">${tabs.map(([id,icon,label])=>`<button data-page="${id}" class="${page===id?'is-active':''}"${page===id?' aria-current="page"':''}>${I(icon)}<span>${label}</span></button>`).join('')}${role==='master'?`<button data-action="menu" class="${other?'is-active':''}" aria-label="Ещё разделы" aria-controls="main-navigation" aria-expanded="false">${I('menu')}<span>Ещё</span>${pending?`<span class="mobile-nav-count">${pending}</span>`:''}</button>`:''}</nav>`}

async function paymentRequest(path,body){const r=await apiFetch('/api/payments/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),value=await readJson(r);if(!r.ok)throw Object.assign(Error(value.error||'Не удалось выполнить запрос оплаты'),{status:r.status});return value}
async function refreshPayments(){try{const[c,o]=await Promise.all([paymentRequest('config'),paymentRequest('orders')]);paymentConfig=c;onlineOrders=o.orders;hiddenPaymentCount=o.hiddenCount||0;paymentIssue=''}catch(e){paymentIssue=e.message}}
function onlinePaymentsPanel(){const tests=onlineOrders.filter(o=>o.test&&o.status==='succeeded'),pending=onlineOrders.filter(o=>['creating','pending'].includes(o.status)),failed=onlineOrders.filter(o=>o.status==='canceled'),paid=onlineOrders.filter(o=>!o.test&&o.status==='succeeded');return`<div class="panel online-payments"><div class="section-head"><h2>Онлайн-оплата · ЮKassa</h2>${role==='master'?'<button class="text-link" data-action="paymentsettings">Настроить</button>':''}</div>${role==='master'?`<div class="modal-actions">${onlineOrders.some(o=>o.test||o.status==='canceled')?'<button class="text-link" data-payment-history="hide">Убрать тесты и отменённые попытки</button>':''}${hiddenPaymentCount?`<button class="text-link" data-payment-history="restore">Вернуть скрытые записи · ${hiddenPaymentCount}</button>`:''}</div>`:''}${paymentResultBanner()}<p class="subtitle">${paymentConfig.enabled?(paymentConfig.test?'Тестовый режим. Успешные оплаты отображаются ниже, реальные деньги и остатки занятий не меняются.':'После подтверждения оплаты занятия начислятся автоматически.'):(role==='master'?'Подключите свой магазин в настройках мастерской.':'Онлайн-оплата пока не включена. Уточните способ оплаты у мастера.')}</p>${paymentConfig.enabled?`<button class="btn primary" data-action="onlinepay">${I('wallet')}${paymentConfig.test?'Тестовая оплата':'Оплатить занятия'}</button>`:''}${paymentIssue?`<p class="error" role="alert">${escape(paymentIssue)}</p>`:''}${pending.length?`<h3 class="payment-section-title">Ожидают подтверждения</h3>${pending.map(o=>onlineOrderCard(o)).join('')}`:''}${tests.length?`<section class="test-payment-history" aria-label="История тестовых оплат"><div class="section-head"><h3>Успешные тестовые оплаты</h3><span class="badge green">${tests.length} · ${money(tests.reduce((sum,o)=>sum+o.amount,0))}</span></div><p class="mini-note">Это проверки оплаты. В реальные поступления они не входят.</p>${tests.map(o=>onlineOrderCard(o)).join('')}</section>`:''}${paid.length?`<details><summary>Подтверждённые онлайн-оплаты · ${paid.length}</summary>${paid.map(o=>onlineOrderCard(o)).join('')}</details>`:''}${failed.length?`<details class="payment-failed"><summary>Отменённые попытки · ${failed.length}</summary>${failed.slice(0,10).map(o=>onlineOrderCard(o)).join('')}</details>`:''}</div>`}
function orderNames(o){return(o.items||[{child:o.child}]).map(i=>child(i.child).name).join(', ')}
function onlineOrderCard(o){const date=new Date(o.paidAt||o.created).toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});return`<article class="online-order" data-online-order="${o.id}" data-payment-status="${o.status}"><div><b>${escape(orderNames(o))} · ${money(o.amount)}</b><p class="mini-note">${escape(date)} · ${o.credits} зан. · ${o.advanceAfter?`Аванс ${money(o.advanceAfter)} · `:''}${o.test?'Тест · ':''}${({creating:'Создаётся',pending:'Ожидает оплаты',succeeded:'Оплачено',canceled:'Отменено'})[o.status]||escape(o.status)}</p>${o.status==='succeeded'?`<span class="badge green">${I('check')}Оплачено${o.test?' · тест':''}</span>`:''}${o.status==='succeeded'?`<button class="text-link" data-receipt-check="${o.id}">Проверить формирование чека</button>`:''}${o.failure?`<p class="error">${escape(o.failure.message)}</p>`:''}</div>${['creating','pending'].includes(o.status)?`<div class="online-order-actions">${o.confirmationUrl?`<a class="btn small" data-payment-link="${o.id}" href="${escape(o.confirmationUrl)}" rel="noreferrer">Продолжить оплату</a>`:`<button class="btn small" data-checkout-child="${o.child}">Открыть оплату</button>`}${o.canCheck||o.status==='pending'?`<button class="text-link" data-order-check="${o.id}">Проверить статус</button>`:''}</div>`:''}</article>`}
function paymentResultBanner(){if(!paymentResult)return'';const o=paymentResult;return`<div class="payment-result ${o.status==='succeeded'?'is-success':o.status==='canceled'?'is-canceled':'is-pending'}" role="status" data-payment-result="${o.id}"><span class="activity-icon">${I(o.status==='succeeded'?'check':o.status==='canceled'?'close':'clock')}</span><div><h3>${o.status==='succeeded'?'Оплата подтверждена':o.status==='canceled'?'Платёж отменён':'Проверяем оплату'}</h3><p>${escape(orderNames(o))} · ${money(o.amount)}${o.status==='succeeded'?(o.test?' · тестовая оплата сохранена в истории. Баланс не менялся.':` · добавлено ${o.credits} занятий. Денежный аванс: ${money(o.advanceAfter||0)}.`):o.status==='canceled'?' · деньги за этот платёж не зачислены.':' · ждём подтверждение ЮKassa. Статус обновится автоматически.'}</p></div></div>`}
function paymentSettingsPanel(){if(!backend||role!=='master')return'';if(paymentConfig.localOnly)return'<div class="panel"><h2>Локальный учёт оплат</h2><p class="subtitle">Принимайте оплату переводом или наличными и вносите её в разделе «Платежи». Занятия и денежный аванс рассчитываются по вашей цене занятия. Онлайн-оплата отключена: приложение работает на этом компьютере.</p></div>';return`<form class="panel" id="yookassa-form" style="margin-top:24px"><h2>Подключение ЮKassa</h2><p class="subtitle">Ключ хранится на сервере в зашифрованном виде и не возвращается в браузер.</p><div class="form-row"><label class="form-field">Shop ID<input name="shopId" inputmode="numeric" pattern="[0-9]+" value="${escape(paymentConfig.shopId||'')}" required autocomplete="off"></label><label class="form-field">Режим<select name="mode"><option value="test" ${paymentConfig.test?'selected':''}>Тестовый — без зачисления занятий</option><option value="live" ${!paymentConfig.test?'selected':''}>Рабочий — реальные платежи</option></select></label></div><label class="form-field">Секретный ключ ${paymentConfig.configured?'(оставьте пустым, чтобы сохранить текущий)':''}<input name="secretKey" type="password" maxlength="512" autocomplete="new-password" ${paymentConfig.configured?'':'required'}></label><label class="check-label"><input type="checkbox" name="enabled" ${paymentConfig.enabled?'checked':''}>Разрешить создание онлайн-платежей</label><label class="check-label"><input name="providerReceipts" type="checkbox" ${paymentConfig.providerReceipts?'checked':''}>В магазине ЮKassa подключено автоматическое формирование чеков через мой сервис</label><div class="inline-notice">В ЮKassa откройте «Интеграция → HTTP-уведомления». Добавьте этот адрес для событий payment.succeeded и payment.canceled:</div><label class="form-field">Адрес для уведомлений<input value="${escape(paymentConfig.webhookUrl||'')}" readonly aria-label="Адрес уведомлений ЮKassa"></label><p class="mini-note">Для самозанятого: ЮKassa принимает деньги, а чек НПД оформляется отдельно в «Мой налог». Автоматическая передача дохода в ФНС здесь пока не подключена.</p><p class="error" id="yookassa-error" role="alert"></p><div class="modal-actions"><button class="btn" type="button" id="yookassa-check">Проверить подключение</button><button class="btn primary" type="submit">Сохранить подключение</button></div><p class="mini-note" id="yookassa-diagnostic" role="status"></p></form>`}
function bindOnlinePayments(){document.querySelectorAll('[data-receipt-check]').forEach(b=>b.onclick=async()=>{try{const r=await paymentRequest('orders/'+b.dataset.receiptCheck+'/receipt',{});toast(({succeeded:'ЮKassa подтвердила регистрацию чека',pending:'ЮKassa ещё формирует чек',canceled:'Регистрация чека отменена',not_reported:'ЮKassa не передала статус чека НПД. Проверьте подключённый сервис в кабинете ЮKassa'})[r.status]||'Проверьте чек в ЮKassa')}catch(error){toast(error.message)}});document.querySelectorAll('[data-payment-history]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const result=await paymentRequest('history',{action:button.dataset.paymentHistory});if(result.ids.includes(returnPaymentId))forgetPayment(returnPaymentId);if(result.ids.includes(paymentResult?.id))paymentResult=null;await refreshPayments();render();toast(button.dataset.paymentHistory==='hide'?'Тесты и отменённые попытки убраны из списка':'Скрытые записи возвращены')}catch(error){toast(error.message);button.disabled=false}});document.querySelector('#yookassa-check')?.addEventListener('click',async e=>{e.target.disabled=true;const field=document.querySelector('#yookassa-diagnostic');field.textContent='Проверяю сохранённые настройки магазина без списания денег…';try{const info=await paymentRequest('diagnostics',{});field.textContent='Подключение подтверждено. Магазин '+info.accountId+' · '+(info.test?'тестовый':'рабочий')+(info.receiptRequired?'. В ЮKassa включена передача кассовых чеков: уточните настройки магазина для НПД.':'.') }catch(err){field.textContent=err.message}finally{e.target.disabled=false}});document.querySelector('#yookassa-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]');button.disabled=true;const input=Object.fromEntries(new FormData(form));try{await paymentRequest('config',{shopId:input.shopId,secretKey:input.secretKey||'',test:input.mode==='test',enabled:form.querySelector('[name=enabled]').checked,providerReceipts:form.querySelector('[name=providerReceipts]')?.checked===true});form.querySelector('[name=secretKey]').value='';await refreshPayments();render();toast('Настройки ЮKassa сохранены')}catch(err){document.querySelector('#yookassa-error').textContent=err.message;button.disabled=false}});document.querySelectorAll('[data-payment-link]').forEach(a=>a.addEventListener('click',()=>rememberPayment(a.dataset.paymentLink)));document.querySelectorAll('[data-order-check]').forEach(b=>b.onclick=()=>checkOnlineOrder(b.dataset.orderCheck,b));document.querySelectorAll('[data-checkout-child]').forEach(b=>b.onclick=()=>startCheckout(b.dataset.checkoutChild,b))}
function familyPaymentModal(initialPlan='subscription',manual=false,initialChild=null){
 if(!paymentConfig.enabled&&!manual){onlinePaymentModal();return}
 const targetFamily=viewData.children.find(c=>c.id===(initialChild||selectedChild))?.family||viewData.children.find(c=>!c.archived)?.family;
 const cs=viewData.children.filter(c=>!c.archived&&(role==='parent'||c.family===targetFamily));
 showModal('Оплата для семьи',`<form id="family-payment-form"><label class="check-label"><input id="pay-all-children" type="checkbox" ${selectedChild==='all'?'checked':''}>Все дети семьи</label><div class="payment-children">${cs.map(c=>`<label class="check-label"><input name="payChild" type="checkbox" value="${c.id}" ${manual||selectedChild==='all'||selectedChild===c.id?'checked':''}>${escape(c.name)}</label>`).join('')}</div><label class="form-field">Что оплачиваем<select name="plan"><option value="trial" ${initialPlan==='trial'?'selected':''}>Первый пробный урок · ${money(planSettings(viewData.settings).trialPrice)}</option><option value="single" ${initialPlan==='single'?'selected':''}>Разовое занятие · ${money(planSettings(viewData.settings).singlePrice)}</option><option value="subscription" ${initialPlan==='subscription'?'selected':''}>Абонемент · ${planSettings(viewData.settings).subscriptionCredits} занятия · ${money(planSettings(viewData.settings).subscriptionPrice)}</option></select></label><div class="inline-notice" id="family-payment-preview" role="status"></div><p class="mini-note">При одной оплате для двух и более детей одной семьи скидка 10% применяется автоматически. Аванс учитывается отдельно у каждого ребёнка.</p><p class="error" id="checkout-error" role="alert"></p><button class="btn primary wide" type="submit">${manual?'Внести оплату':paymentConfig.test?'Тестовая оплата':'Перейти к оплате'}</button>${manual?'<label class="form-field">Способ оплаты<select name="method"><option>Перевод</option><option>Наличные</option></select></label>':''}<button class="text-link" type="button" id="legacy-payment-mode">Оплатить произвольную сумму или другое количество занятий</button></form>`);
 const form=document.querySelector('#family-payment-form'),select=form.querySelector('[name=plan]'),button=form.querySelector('[type=submit]'),all=form.querySelector('#pay-all-children');const selected=()=>[...form.querySelectorAll('[name=payChild]')].filter(c=>c.checked).map(c=>c.value);const plan=()=>select.value||select.querySelector('option[selected]')?.value||'subscription';
 const quote=()=>familyPurchase(viewData,{children:selected(),plan:plan()},{role:user.role,family:user.family});const preview=()=>{try{const q=quote();document.querySelector('#family-payment-preview').textContent=q.items.map(i=>`${child(i.child).name}: ${i.credits} зан. · ${money(i.amountMinor/100)}`).join(' · ')+` · Скидка ${q.discountPercent}% · Итого ${money(q.amountMinor/100)}`;button.disabled=false}catch(error){document.querySelector('#family-payment-preview').textContent=error.message;button.disabled=true}};
 all.onchange=()=>{form.querySelectorAll('[name=payChild]').forEach(c=>c.checked=all.checked);preview()};all.checked=selected().length===cs.length;form.querySelectorAll('[name=payChild]').forEach(c=>c.onchange=()=>{all.checked=selected().length===cs.length;preview()});select.onchange=preview;preview();form.onsubmit=async e=>{e.preventDefault();try{const q=quote();if(manual){if(await act({type:'family-payment',children:selected(),plan:plan(),method:form.querySelector('[name=method]').value||'Перевод'},'Оплата семьи внесена'))closeModal();return}await startCheckout(q.items[0].child,button,undefined,undefined,{children:selected(),plan:plan(),expectedTotalMinor:q.amountMinor,expectedCredits:q.credits})}catch(error){document.querySelector('#checkout-error').textContent=error.message}};document.querySelector('#legacy-payment-mode').onclick=manual?()=>manualAmountModal(initialChild):onlinePaymentModal;
}
function onlinePaymentModal(){if(!paymentConfig.enabled){showModal('Продлить абонемент',`<h3>${planSettings(viewData.settings).subscriptionCredits} занятия · ${money(planSettings(viewData.settings).subscriptionPrice)}</h3><p class="subtitle">Онлайн-оплата пока не включена. Уточните способ оплаты у мастера.</p>`);return}const initial=selectedChild!=='all'?selectedChild:viewData.children.find(c=>!c.archived)?.id;
 showModal('Оплатить занятия',`<form id="online-payment-form">${selectChildren(initial)}<label class="form-field">Что оплачиваем<select name="paymentMode"><option value="lessons" selected>Отдельные занятия</option><option value="package">Весь абонемент · ${viewData.settings.credits} зан.</option><option value="amount">Произвольная сумма</option></select></label><label class="form-field" id="lesson-quantity-field">Количество занятий<input name="lessonQuantity" type="number" min="1" max="100000" step="1" value="1" required></label><label class="form-field">Сумма к оплате, ₽<input name="amount" type="number" min="1" max="1000000" step="0.01" value="${viewData.settings.price}" required></label><p class="mini-note">Стоимость одного занятия: ${money(lessonPriceMinor(viewData.settings)/100)}. Можно оплатить одно занятие или любое другое количество.</p><div class="inline-notice" id="online-payment-quote" role="status"></div><p class="mini-note">${paymentConfig.test?'Тестовый платёж: деньги, занятия и денежный аванс не изменятся.':'Откроется защищённая страница ЮKassa. После подтверждения оплаты занятия начислятся автоматически; остаток денег сохранится авансом.'}</p><p class="error" id="checkout-error" role="alert"></p><button class="btn primary wide" type="submit">${paymentConfig.test?'Перейти к тестовой оплате':'Перейти к оплате'}</button></form>`);
 const form=document.querySelector('#online-payment-form'),amount=form.querySelector('[name=amount]'),choice=form.querySelector('[name=child]'),mode=form.querySelector('[name=paymentMode]'),quantity=form.querySelector('[name=lessonQuantity]'),button=form.querySelector('[type=submit]');
 const selected=select=>select.value||select.querySelector('option[selected]')?.value||select.querySelector('option')?.value;
 const preview=()=>{const output=document.querySelector('#online-payment-quote'),kind=selected(mode),account=child(selected(choice));amount.readOnly=kind!=='amount';quantity.disabled=kind!=='lessons';document.querySelector('#lesson-quantity-field').style.display=kind==='lessons'?'':'none';try{const quote=kind==='amount'?paymentQuote(viewData.settings,amount.value,account.advanceMinor||0):lessonPurchase(viewData.settings,kind==='package'?viewData.settings.credits:quantity.value,account.advanceMinor||0);if(kind!=='amount')amount.value=(quote.amountMinor/100).toFixed(2);output.textContent=`Начислится ${quote.credits} зан. · имеющийся аванс ${money((account.advanceMinor||0)/100)} · аванс после оплаты ${money(quote.advanceAfterMinor/100)}`;button.disabled=false}catch(error){if(kind!=='amount')amount.value='';output.textContent=error.message;button.disabled=true}};
 for(const field of [amount,quantity])field.addEventListener('input',preview);for(const field of [choice,mode])field.addEventListener('change',preview);preview();form.onsubmit=async e=>{e.preventDefault();preview();if(button.disabled)return;const kind=selected(mode);await startCheckout(selected(choice),button,amount.value,kind==='amount'?undefined:kind==='package'?viewData.settings.credits:Number(quantity.value))};

}
async function startCheckout(childId,button,amount,lessons,basket){if(button)button.disabled=true;try{const order=await paymentRequest('checkout',basket||{child:childId,...(amount!==undefined?{amount}:{}),...(lessons!==undefined?{lessons}:{})});rememberPayment(order.id);if(['succeeded','canceled'].includes(order.status)){await finishPayment(order);return}paymentResult=order;await refreshPayments();if(page==='payments')render();if(order.confirmationToken){await openCheckoutWidget(order);return}if(!order.confirmationUrl)throw Error('Форма оплаты ещё не готова. Проверьте статус и повторите открытие.');window.location.assign(order.confirmationUrl)}catch(e){const field=document.querySelector('#checkout-error')||document.querySelector('#payment-widget-error');if(field)field.textContent=e.message;else toast(e.message);if(button)button.disabled=false}}
async function checkOnlineOrder(id,button){if(button)button.disabled=true;try{rememberPayment(id);await syncOnlinePayments(true,id)}catch(e){toast(e.message)}finally{if(button)button.disabled=false}}
function paymentStorageKey(){return'yasna-payment-return:'+(globalThis.YASNA_API_BASE||'')}
function rememberedPayment(){const hash=window.location?.hash||'',match=hash.match(/^#payment=([a-zA-Z0-9-]{1,100})$/);if(match)return match[1];try{const value=sessionStorage.getItem(paymentStorageKey());return /^[a-zA-Z0-9-]{1,100}$/.test(value||'')?value:null}catch{return null}}
function rememberPayment(id){returnPaymentId=id;try{sessionStorage.setItem(paymentStorageKey(),id)}catch{}}
function forgetPayment(id){if(returnPaymentId!==id)return;returnPaymentId=null;try{sessionStorage.removeItem(paymentStorageKey())}catch{};if((window.location?.hash||'').startsWith('#payment='))forgetLinkToken()}
function disposeCheckout(){const previous=activeCheckout;activeCheckout=null;if(previous?.widget)try{const destroyed=previous.widget.destroy();destroyed?.catch?.(()=>{})}catch{}}
async function openCheckoutWidget(order){showModal(order.test?'Тестовая оплата · ЮKassa':'Оплата · ЮKassa',`<p class="subtitle">${escape(child(order.child).name)} · ${money(order.amount)} · ${order.credits} занятия</p><div class="inline-notice">${order.test?'Тестовая оплата. Реальные деньги не списываются и занятия не начисляются.':'Оплата проходит в защищённой форме ЮKassa.'} После подтверждения форма закроется и результат появится в кабинете.</div><p class="mini-note" id="payment-widget-loading" role="status">Загружаем защищённую форму ЮKassa…</p><div id="yookassa-payment-form" class="payment-widget-container"></div><p class="error" id="payment-widget-error" role="alert"></p><button class="text-link" id="widget-payment-check">Проверить оплату</button>`,true);const context={id:order.id,widget:null};activeCheckout=context;document.querySelector('#widget-payment-check').onclick=()=>syncOnlinePayments(true,order.id);try{const widget=await mountCheckout({token:order.confirmationToken,container:'yookassa-payment-form',onComplete:()=>syncOnlinePayments(true,order.id),onError:message=>{if(activeCheckout!==context)return;const el=document.querySelector('#payment-widget-error');if(el)el.textContent=message;void syncOnlinePayments(true,order.id)}});if(activeCheckout!==context){try{widget?.destroy()}catch{};return}context.widget=widget;document.querySelector("#payment-widget-loading")?.remove();void syncOnlinePayments(false,order.id)}catch(e){if(activeCheckout===context){document.querySelector('#payment-widget-loading')?.remove();const el=document.querySelector('#payment-widget-error');if(el)el.textContent=e.message+' Этот платёж сохранён. Проверьте его статус перед повторной оплатой.'}}}
async function finishPayment(order){paymentResult=order;forgetPayment(order.id);if(activeCheckout?.id===order.id||document.querySelector('#online-payment-form'))closeModal();await loadServer();page='payments';render();toast(order.status==='succeeded'?(order.test?'Тестовая оплата подтверждена и сохранена в истории':'Оплата подтверждена, занятия начислены'):'Платёж отменён')}
async function syncOnlinePayments(force=false,onlyId=null){if(paymentsSyncing){if(force)queuedPaymentCheck=onlyId||activeCheckout?.id||returnPaymentId;return}if(!user.role||enrollmentMode||(!force&&document.visibilityState==='hidden'))return;paymentsSyncing=true;const actor=user.role+':'+(user.family||user.username||'');try{const previous=new Map(onlineOrders.map(o=>[o.id,o.status]));await refreshPayments();if(actor!==user.role+':'+(user.family||user.username||''))return;let changed=onlineOrders.some(o=>previous.get(o.id)!==o.status)||previous.size!==onlineOrders.length;let id=onlyId||activeCheckout?.id||returnPaymentId,selected=[];if(id)selected=[id];else{const candidates=onlineOrders.filter(o=>['pending'].includes(o.status)&&o.canCheck!==false);for(let i=0;i<Math.min(3,candidates.length);i++)selected.push(candidates[(paymentPollCursor+i)%candidates.length].id);if(candidates.length)paymentPollCursor=(paymentPollCursor+3)%candidates.length}if(!selected.length){if(changed){await loadServer();if(!document.querySelector('.modal'))render()}return}const results=await Promise.allSettled(selected.map(orderId=>paymentRequest('orders/'+encodeURIComponent(orderId)+'/check',{})));if(actor!==user.role+':'+(user.family||user.username||''))return;for(let i=0;i<results.length;i++){const result=results[i];if(result.status==='rejected'){if(result.reason.status===401){expireSession();return}if(result.reason.status===404&&selected[i]===returnPaymentId)forgetPayment(selected[i]);if(force){paymentIssue=result.reason.message;toast(paymentIssue)}continue}const order=result.value;changed||=previous.get(order.id)!==order.status;if(order.id===id){paymentResult=order;if(['succeeded','canceled'].includes(order.status)){await finishPayment(order);return}}}if(changed){await loadServer();if(!document.querySelector('.modal'))render()}else if(force&&id&&!activeCheckout){page='payments';render()}}catch(e){if(force)toast(e.message)}finally{paymentsSyncing=false;if(queuedPaymentCheck){const queued=queuedPaymentCheck;queuedPaymentCheck=null;void syncOnlinePayments(true,queued)}}}
const paymentMonitor=setInterval(()=>{if(user.role&&(activeCheckout||returnPaymentId||page==='payments'))void syncOnlinePayments(false)},6000);paymentMonitor.unref?.();
window.addEventListener?.('focus',()=>{if(user.role)void syncOnlinePayments(false)});
window.addEventListener?.('pageshow',()=>{if(user.role)void syncOnlinePayments(false)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden'&&user.role)void syncOnlinePayments(false)});


function familyOptions(selected=''){const families=new Map();for(const p of parentsFor(viewData).filter(p=>!p.archived))families.set(p.family,p.name);for(const c of viewData.children.filter(c=>!c.archived))if(!families.has(c.family))families.set(c.family,c.parent);return [...families].map(([id,name])=>`<option value="${id}" ${id===selected?'selected':''}>${escape(name)}</option>`).join('')}
function parentsTable(archived){const rows=parentsFor(viewData).filter(p=>!!p.archived===archived&&[p.name,p.phone,p.email].join(' ').toLowerCase().includes(filter.toLowerCase()));return`<div class="table-wrap"><table><thead><tr><th>Родитель</th><th>Контакты</th><th>Дети</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td><b>${escape(p.name)}</b></td><td>${escape(p.phone)}${p.email?`<br>${escape(p.email)}`:''}</td><td>${viewData.children.filter(c=>c.family===p.family&&!c.archived).map(c=>escape(c.name)).join(', ')||'Дети ещё не добавлены'}</td><td><button class="text-link" data-parent="${p.id}" aria-label="Открыть данные ${escape(p.name)}">${I('chevron')}</button></td></tr>`).join('')}</tbody></table>${rows.length?'':empty(archived?'В архиве родителей нет':'Родителей пока нет')}</div>`}
function bindOperations(){for(const [attr,fn]of Object.entries({movelesson:lessonMoveModal,cancellesson:lessonCancelModal,movebooking:bookingMoveModal,parent:parentModal,editchild:childEdit,archivechild:id=>archiveConfirmation('child',id),restorechild:async id=>{if(await act({type:'child-restore',child:id},'Ребёнок возвращён из архива'))closeModal()},archiveparent:id=>archiveConfirmation('parent',id),restoreparent:async id=>{if(await act({type:'parent-restore',parent:id},'Родитель возвращён из архива'))closeModal()}}))document.querySelectorAll('[data-'+attr+']').forEach(b=>b.onclick=()=>fn(b.dataset[attr]));document.querySelectorAll('[data-clienttab]').forEach(b=>b.onclick=()=>{clientTab=b.dataset.clienttab;filter='';render()})}
function lessonMoveModal(id){const l=viewData.lessons.find(l=>l.id===id);if(!l)return;form('Перенести занятие',`<p class="subtitle">${escape(l.title)} · ${dateLabel(l.date)} в ${l.time}</p><div class="inline-notice">Все записи детей сохранятся. Родители увидят новое время и уведомление. Остатки абонементов не изменятся.</div><div class="form-row"><label class="form-field">Новая дата<input name="date" type="date" value="${l.date}" min="${TODAY}" required></label><label class="form-field">Новое время<input name="time" type="time" value="${l.time}" required></label></div><label class="form-field">Длительность, минут<input name="duration" type="number" min="1" max="1440" value="${l.duration}" required></label><label class="form-field">Комментарий для родителей<textarea name="reason" maxlength="500" rows="2"></textarea></label>`,async a=>{if(await act({type:'lesson-update',lesson:id,...a},'Занятие перенесено')){selectedDate=a.date;closeModal();render()}})}
function lessonCancelModal(id){const l=viewData.lessons.find(l=>l.id===id);if(!l)return;form('Отменить занятие',`<p class="subtitle">${escape(l.title)} · ${dateLabel(l.date)} в ${l.time}</p><div class="inline-notice">Отменятся записи всей группы и лист ожидания. Занятия в абонементах сохранятся. Родители получат уведомление в кабинете.</div><label class="form-field">Причина отмены<textarea name="reason" maxlength="500" placeholder="Например, мастер заболел" rows="3" required></textarea></label>`,async a=>{if(await act({type:'lesson-cancel',lesson:id,...a},'Занятие и записи отменены'))closeModal()});document.querySelector('#dialog-form [type=submit]').textContent='Отменить занятие';document.querySelector('#dialog-form [type=submit]').classList.add('danger')}
function bookingMoveModal(id){const b=viewData.bookings.find(b=>b.id===id);if(!b)return;const from=viewData.lessons.find(l=>l.id===b.lesson),lessons=viewData.lessons.filter(l=>l.id!==b.lesson&&l.status!=='cancelled'&&new Date(l.date+'T'+l.time+':00+05:00')>new Date()&&occupancy(l.id)<l.capacity).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));if(!lessons.length){showModal('Перенести запись',empty('Свободных предстоящих занятий пока нет. Обратитесь к мастеру.'));return}form('Перенести запись',`<p class="subtitle">${escape(child(b.child).name)} · ${escape(from.title)}</p><label class="form-field">Новое занятие<select name="lesson" ${publicPrivacyUrl?'required':''}>${lessons.map(l=>`<option value="${l.id}">${dateLabel(l.date)} · ${l.time} · ${escape(l.title)}</option>`).join('')}</select></label><div class="inline-notice">Прежнее место освободится, новая запись сохранится. Занятие из абонемента не списывается.${role==='parent'?` Перенос доступен не позднее чем за ${viewData.settings.cancelHours} ч. до начала.`:''}</div>`,async a=>{if(await act({type:'booking-move',booking:id,lesson:a.lesson},'Запись перенесена'))closeModal()})}
function parentEdit(id,family=''){const p=parentsFor(viewData).find(p=>p.id===id);form(p?'Изменить родителя':'Добавить родителя',`${p?'':`<label class="form-field">Семья<select name="family"><option value="">Новая семья</option>${familyOptions(family)}</select></label>`}<label class="form-field">Имя и фамилия<input name="name" value="${escape(p?.name||'')}" maxlength="100" required></label><div class="form-row"><label class="form-field">Телефон<input name="phone" type="tel" value="${escape(p?.phone||'')}" maxlength="30"></label><label class="form-field">Электронная почта<input name="email" type="email" value="${escape(p?.email||'')}" maxlength="254"></label></div><p class="mini-note">Укажите телефон или почту. Доступ в кабинет выдаётся отдельно специальной ссылкой.</p>`,async a=>{if(await act({type:p?'parent-update':'parent',...(p?{parent:p.id}:{}),...a},'Родитель сохранён'))closeModal()})}
function parentModal(id){const p=parentsFor(viewData).find(p=>p.id===id);if(!p)return;const children=viewData.children.filter(c=>c.family===p.family&&!c.archived);showModal(escape(p.name),`<p class="subtitle">${escape(p.phone)}${p.email?`<br>${escape(p.email)}`:''}</p><h3>Дети семьи</h3>${children.length?children.map(c=>`<div class="reminder-row"><b>${escape(c.name)}</b><span class="badge">${c.balance} зан.</span></div>`).join(''):empty('Можно добавить ребёнка и выбрать эту семью.')}<div class="modal-actions">${p.archived?`<button class="btn primary" data-restoreparent="${id}">Вернуть из архива</button>`:`<button class="btn" id="edit-parent">Изменить</button>${children.length?'<button class="btn" id="family-access">Ссылка для родителя</button>':''}<button class="btn danger" data-archiveparent="${id}">Убрать родителя</button>`}</div>`);document.querySelector('#edit-parent')?.addEventListener('click',()=>parentEdit(id));document.querySelector('#family-access')?.addEventListener('click',()=>parentAccount(p.family));bindOperations()}
function childEdit(id){const c=child(id);form('Изменить ребёнка',`<label class="form-field">Имя и фамилия<input name="name" maxlength="100" value="${escape(c.name)}" required></label><label class="form-field">Возраст<input name="age" type="number" min="3" max="18" value="${c.age}" required></label><p class="mini-note">Контакты изменяются в разделе «Родители».</p>`,async a=>{if(await act({type:'child-update',child:id,...a},'Данные ребёнка сохранены'))closeModal()})}
function archiveConfirmation(kind,id){const person=kind==='child'?child(id):parentsFor(viewData).find(p=>p.id===id);showModal(kind==='child'?'Убрать ребёнка из активного списка?':'Убрать родителя из активного списка?',`<p class="subtitle">${escape(person.name)}</p><div class="inline-notice">${kind==='child'?'Предстоящие записи ребёнка отменятся. Оплаты, посещения и остаток сохранятся в архиве.':'Ссылки доступа всей семьи перестанут действовать. Оставшимся родителям потребуется выдать новые ссылки. Дети и их записи сохранятся.'} Данные можно восстановить из архива.</div><p class="error" id="archive-error" role="alert"></p><div class="modal-actions"><button class="btn" id="archive-keep">Оставить</button><button class="btn danger" id="archive-confirm">Убрать в архив</button></div>`);document.querySelector('#archive-keep').onclick=closeModal;document.querySelector('#archive-confirm').onclick=async e=>{e.target.disabled=true;if(await act({type:kind+'-archive',[kind]:id},'Данные перемещены в архив'))closeModal();else e.target.disabled=false}}
function importModal(){importSelection=null;showModal('Перенос из «МойКласс»',`<p class="subtitle">Загрузите выгрузку CSV или XLSX. Клиенты переносятся с текущими остатками. История оплат и посещений переносится отдельно и повторно остатки не меняет.</p><label class="form-field">Что переносим<select id="import-kind"><option value="clients" selected>Дети, родители и остатки</option><option value="payments">История оплат</option><option value="history">История посещений</option></select></label><label class="form-field">Файл выгрузки<input id="import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label><p class="mini-note">Не более 2000 строк и 5 МБ. Для XLSX читается первый лист. Старый XLS сохраните как XLSX или CSV.</p><button class="text-link" id="import-template">Скачать CSV-шаблон</button><p class="error" id="import-error" role="alert"></p><div id="import-mapping"></div><div id="import-preview"></div>`,true);document.querySelector('#import-file').onchange=readImportFile;document.querySelector('#import-kind').onchange=()=>{if(importSelection)importMapping()};document.querySelector('#import-template').onclick=()=>{const kind=document.querySelector('#import-kind').value;download('\uFEFF'+importFields[kind].map(f=>f[1]).join(';')+'\r\n','yasna-'+kind+'-template.csv','text/csv;charset=utf-8')}}
async function readImportFile(e){const file=e.target.files?.[0],field=document.querySelector('#import-error');if(!file)return;field.textContent='';try{if(file.size>5*1024*1024)throw Error('Размер файла — не более 5 МБ');let table;if(file.name.toLowerCase().endsWith('.xlsx')){field.textContent='Читаю таблицу…';const{readSheet}=await import('./xlsx-reader.js?v=operations2');table=await readSheet(await file.arrayBuffer(),1)}else if(file.name.toLowerCase().endsWith('.csv')){const bytes=await file.arrayBuffer();let text=new TextDecoder('utf-8').decode(bytes);if(text.includes('\uFFFD'))text=new TextDecoder('windows-1251').decode(bytes);table=parseCSV(text)}else throw Error('Выберите CSV или XLSX');if(table.length<2||table.length>2001||table.some(row=>row.length>100))throw Error('Нужны заголовки и от 1 до 2000 строк, не более 100 столбцов');importSelection={table,name:file.name};field.textContent='';importMapping()}catch(err){importSelection=null;field.textContent=err.message;document.querySelector('#import-mapping').innerHTML='';document.querySelector('#import-preview').innerHTML=''}}
function importMapping(){const kind=document.querySelector('#import-kind').value,{table}=importSelection,headers=table[0].map(x=>String(x??'')),map=suggestMapping(kind,headers);document.querySelector('#import-preview').innerHTML='';document.querySelector('#import-mapping').innerHTML=`<h3>Выберите столбцы</h3><p class="mini-note">${table.length-1} строк. Ничего не будет сохранено до подтверждения.${kind!=='clients'?' Для ребёнка укажите ID из «МойКласс» или уникальное ФИО.':''}</p><div class="form-row import-columns">${importFields[kind].map(([key,label,required])=>`<label class="form-field">${label}${required?' *':''}<select data-import-field="${key}"><option value="">Не переносить</option>${headers.map((h,i)=>`<option value="${i}" ${String(i)===map[key]?'selected':''}>${escape(h||'Столбец '+(i+1))}</option>`).join('')}</select></label>`).join('')}</div><div class="inline-notice">${kind==='clients'?'Остатки задаются только новым детям. Существующие балансы не перезаписываются.':'Сначала перенесите клиентов. Исторические оплаты и посещения не начисляют и не списывают занятия повторно.'}</div><button class="btn primary" id="import-validate">Проверить перед импортом</button>`;document.querySelectorAll('[data-import-field]').forEach(el=>el.onchange=()=>document.querySelector('#import-preview').innerHTML='');document.querySelector('#import-validate').onclick=()=>{const field=document.querySelector('#import-error');field.textContent='';try{const mapping=Object.fromEntries([...document.querySelectorAll('[data-import-field]')].map(el=>[el.dataset.importField,el.value??'']));for(const [key,label,required]of importFields[kind])if(required&&mapping[key]==='')throw Error('Выберите столбец «'+label+'»');if(kind!=='clients'&&mapping.childSourceId===''&&mapping.name==='')throw Error('Выберите ID ребёнка или ФИО');const rows=mappedRows(table,mapping),{report}=planImport(viewData,{kind,rows});document.querySelector('#import-preview').innerHTML=`<div class="import-report"><h3>Результат проверки</h3><p>Добавится: <b>${report.added}</b> · Уже есть: <b>${report.skipped}</b> · Ошибок: <b>${report.errors.length}</b></p>${report.errors.length?`<div class="inline-notice">${report.errors.slice(0,15).map(e=>`Строка ${e.row}: ${escape(e.message)}`).join('<br>')}<br>Исправьте файл или выбор столбцов, затем проверьте снова. До этого ничего не сохранится.</div>`:`${report.sample.map(r=>`<div class="reminder-row"><b>${escape(r.name)}</b><span class="mini-note">${escape(r.detail)}</span></div>`).join('')}<p class="mini-note">Повторяющиеся записи будут пропущены.</p><button class="btn primary" id="import-confirm" ${!report.added?'disabled':''}>Подтвердить импорт: ${report.added} записей</button>`}</div>`;document.querySelector('#import-confirm')?.addEventListener('click',async e=>{e.target.disabled=true;if(await act({type:'import',kind,rows},'Импорт завершён: '+report.added+' записей'))closeModal();else{e.target.disabled=false;field.textContent='Импорт не завершён. Проверьте сообщение и повторите проверку.'}})}catch(err){field.textContent=err.message}}}
