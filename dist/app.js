import{enhanceTables,closeNavigation,toggleNavigation,setNavigation}from'./mobile-ui.js?v=mobile1';
import {apiFetch,clearAccess} from './api-client.js?v=pages1';
import {
  emptyState,
  applyAction,
  familyView,
  validateState,
  submitApplication,
  TODAY as DEMO_TODAY,
} from "./domain.js?v=pages1";
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
const lessonTypeLabel = (l) =>
  l.lessonType === "individual"
    ? "Индивидуальное занятие"
    : "Групповое занятие";
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
  modalLesson = null,
  startupError = null,
  localPersistent = true,
  parentEntryError = null,
  alerts = [],
  enrollmentMode = window.location?.hash === "#enroll",
  publicLessons = [],
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
}
function expireSession() {
  const parent = user.role === "parent";
  user = { role: null, authMode: "password" };
  role = null;
  data = emptyState();
  alerts = [];
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
const logoPicture=(compact=false)=>`<picture${compact?' class="mobile-wordmark"':''}><source srcset="./yasna-logo-light.webp" type="image/webp"><img${compact?'':' class="brand-lockup"'} src="./yasna-logo-light.png" alt="Ясна — жёлтый рукописный логотип с красным кругом на белом фоне" width="${compact?72:168}" height="${compact?44:106}"></picture>`;
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
          `<button class="${page === id ? "active" : ""}" data-page="${id}">${I(ico)}<span>${label}</span>${id === "applications" ? `<span class="count">${(viewData.applications || []).filter((r) => r.status === "pending").length}</span>` : ""}${id === "subscriptions" ? `<span class="count">${viewData.children.filter((c) => c.balance <= viewData.settings.remindAt).length}</span>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom">${role === "master" ? `<nav class="nav"><button data-page="settings" class="${page === "settings" ? "active" : ""}">${I("settings")}<span>Настройки</span></button></nav>` : ""}<div class="help-box"><b>У всего есть своя история</b>У маленьких открытий — тоже.<br>Пусть для них будет больше времени.<a class="vk-link" href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">Мы ВКонтакте ${I("arrow")}</a></div><div class="profile"><span class="avatar green">${role === "master" ? "М" : initials(viewData.children[0]?.parent || "Родитель")}</span><div><b>${role === "master" ? "Кабинет мастера" : escape(viewData.children[0]?.parent || "Родитель")}</b><small>${role === "master" ? "Мастерская в Сургуте" : "Кабинет семьи"}</small></div><button class="text-link" data-action="${backend ? "logout" : "about"}" aria-label="${backend ? "Выйти" : "О демонстрации"}">${I(backend ? "logout" : "down")}</button></div></div></aside><main class="main"><header class="topbar"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Открыть меню" aria-controls="main-navigation" aria-expanded="false">${I("menu")}</button>${logoPicture(true)}<div class="breadcrumb">Мастерская «Ясна» <span>/</span><strong>${title}</strong></div><div class="top-tools"><button class="btn small intake-top-btn" data-action="intake" aria-label="Первичная запись без личного кабинета">${I("plus")}<span>Первичная запись</span></button>${!backend ? `<span class="demo-label">${localPersistent ? "Демо-данные" : "Без сохранения"}</span><div class="role-switch"><button class="${role === "master" ? "on" : ""}" data-role="master">Кабинет мастера</button><button class="${role === "parent" ? "on" : ""}" data-role="parent">Я родитель</button></div>` : `<span class="demo-label">${role === "master" ? "Мастер" : "Родитель"}</span>`}<button class="icon-btn notifications-button ${alerts.some((n) => !n.read) ? "has-unread" : ""}" data-action="notifications" aria-label="Уведомления: ${alerts.filter((n) => !n.read).length} непрочитанных">${I("bell")}${alerts.some((n) => !n.read) ? `<span class="notification-count">${alerts.filter((n) => !n.read).length}</span>` : ""}</button></div></header><div class="content">${role === "parent" && page === "dashboard" ? parentPage() : page === "dashboard" ? dashboard() : page === "schedule" ? schedule() : page === "applications" ? applicationsPage() : page === "clients" ? clients() : page === "subscriptions" ? subscriptions() : page === "payments" ? payments() : page === "reports" ? reports() : settings()}<footer class="footer"><span>© 2026 Ясна · сделано с заботой о маленьких мастерах · <a href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">ВКонтакте ↗</a></span><span>${backend ? "Данные сохраняются на сервере" : localPersistent ? "Демонстрация · данные хранятся в этом браузере" : "Данные в памяти вкладки · скачайте резервную копию"} <span style="margin-left:12px">Сургут · UTC+5</span></span></footer></div></main>${mobileNavigation()}`;
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
      (c) => c.balance <= viewData.settings.remindAt,
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
      )}</div><div class="dashboard-grid"><section><div class="section-head"><h2>Сегодня в мастерской <span>${dateLabel(TODAY)}</span></h2><button class="text-link" data-page="schedule">Всё расписание ${I("arrow")}</button></div><div class="tabs"><button class="active" data-action="today">Все занятия <span>· ${ls.length}</span></button><button data-action="openjournal">Журнал посещений</button></div>${ls.map(lessonCard).join("") || empty("Сегодня занятий нет")}<div class="section-head table-title"><h2>Маленькие мастера <span>${viewData.children.length} детей</span></h2><button class="text-link" data-page="clients">Все дети ${I("arrow")}</button></div>${childrenTable(viewData.children.slice(0, 3), true)}</section><aside class="right-column"><div class="panel"><div class="panel-head">${I("ticket")}<h2>Пора продлить абонемент</h2><span class="badge warn" style="margin-left:auto">${renew.length}</span></div><div class="muted">Немного заботы, чтобы не было пауз</div>${renew
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
    )}${bs.length > 3 ? `<span class="avatar green">+${bs.length - 3}</span>` : ""}</div><span class="badge ${n >= l.capacity ? "warn" : l.color === "purple" ? "purple" : ""}">${n} из ${l.capacity} мест</span></div><div class="lesson-foot"><span>${I(n >= l.capacity ? "users" : "leaf")}${n >= l.capacity ? "Группа набрана" : `Ещё ${l.capacity - n} ${l.capacity - n === 1 ? "место" : "места"} для открытий`}</span><button class="text-link" ${role === "master" ? `data-journal="${l.id}"` : `data-signup="${l.id}"`}>${role === "master" ? "Открыть журнал" : my ? (selectedChild === "all" ? "Записать ещё ребёнка" : "Вы записаны") : n >= l.capacity ? "В лист ожидания" : "Записать ребёнка"} ${I("arrow")}</button></div></article>`;
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
        .filter((l) => l.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(lessonCard)
        .join("") ||
      empty("В этот день мастерская отдыхает.<br>Выберите другую дату.")
    }<p class="subnav-note">Отмена родителем возможна не позднее чем за ${viewData.settings.cancelHours} ч. до начала. ${viewData.settings.chargeMissed ? "Пропуск без отмены списывает занятие." : "Пропуск без отмены не списывает занятие."}</p>`
  );
}
function clients() {
  const cs = viewData.children.filter((c) =>
    (c.name + " " + c.parent + " " + c.phone)
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    head(
      "ДЕТИ И РОДИТЕЛИ",
      "Каждого знаем по имени",
      "Контакты, посещения и маленькие достижения.",
      `<button class="btn primary" data-action="addchild">${I("plus")}Добавить ребёнка</button>`,
    ) +
    `<div class="toolbar"><label class="search">${I("search")}<input id="client-search" value="${escape(filter)}" placeholder="Найти ребёнка или родителя" aria-label="Поиск детей и родителей"></label><span class="mini-note">${cs.length} детей · ${new Set(cs.map((c) => c.family)).size} семей</span></div><div id="client-results">${childrenTable(cs)}</div>`
  );
}
function subscriptions() {
  const cs =
    filter === "renew"
      ? viewData.children.filter((c) => c.balance <= viewData.settings.remindAt)
      : viewData.children;
  return (
    head(
      "БОЛЬШЕ ВРЕМЕНИ НА ТВОРЧЕСТВО",
      "Абонементы",
      "Простой баланс: оплатили, пришли, создали.",
      `<button class="btn primary" data-action="addpayment">${I("plus")}Принять оплату</button>`,
    ) +
    `<div class="tabs"><button class="${filter !== "renew" ? "active" : ""}" data-subfilter="all">Все абонементы</button><button class="${filter === "renew" ? "active" : ""}" data-subfilter="renew">Пора продлить · ${viewData.children.filter((c) => c.balance <= viewData.settings.remindAt).length}</button></div><div class="subscription-grid">${cs.map((c) => `<div class="panel"><div class="person">${avatar(c)}<div><b>${escape(c.name)}</b><small>${escape(c.parent)}</small></div></div><div class="balance">${c.balance} <small>${c.balance === 1 ? "занятие осталось" : "занятий осталось"}</small></div><div class="progress"><div style="width:${Math.min(100, (c.balance / viewData.settings.credits) * 100)}%"></div></div><p class="mini-note">Абонемент · ${viewData.settings.credits} занятия / ${money(viewData.settings.price)}</p><div class="section-head" style="margin:20px 0 0"><button class="btn small" data-paychild="${c.id}">${I("plus")}Продлить</button><button class="text-link" data-remind="${c.id}">${I("send")}Напомнить</button></div></div>`).join("")}</div>`
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
    `<div class="stats" style="grid-template-columns:repeat(3,1fr)">${[
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
      )}</div><div class="table-wrap"><table><thead><tr><th>Дата</th><th>Ребёнок</th><th>Абонемент</th><th>Сумма</th><th>Способ оплаты</th><th>Чек</th></tr></thead><tbody>${ps.map((p) => `<tr><td>${dateLabel(p.date)}</td><td><div class="person">${avatar(child(p.child))}<b>${escape(child(p.child).name)}</b></div></td><td>${p.credits} занятия</td><td style="color:#8b6300;font-weight:600">${money(p.amount)}</td><td>${escape(p.method)}</td><td>${p.receipt ? `<button class="text-link" data-receipt="${p.id}">${I("file")}Скачать</button>` : role === "master" ? `<button class="text-link" data-upload="${p.id}">${I("plus")}Прикрепить</button>` : '<span class="mini-note">Ожидает прикрепления</span>'}</td></tr>`).join("")}</tbody></table>${ps.length ? "" : empty("Оплат пока нет")}</div><div class="inline-notice">${backend ? "Учёт оплат вручную. Онлайн-эквайринг и автоматическая фискализация не подключены." : "Демонстрационный режим. Оплаты тестовые, деньги не переводятся. Прикрепляйте только вымышленные чеки."}</div>`
  );
}
function reports() {
  return (
    head(
      "ПОРЯДОК В ДЕТАЛЯХ",
      "Отчёты и выгрузки",
      "Все данные мастерской всегда под рукой.",
    ) +
    `<div class="settings-grid"><div class="panel"><h2>Выгрузка в CSV</h2><p class="subtitle">UTF-8 · подходит для Excel и переноса в другую систему</p>${[
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
    `<form id="settings-form"><div class="settings-grid"><div class="panel"><h2>Запись и отмена</h2><p class="subtitle" style="margin-bottom:24px">Правила действуют для новых действий. История сохраняется.</p><label class="form-field">Бесплатная отмена не позднее, чем за (часов)<input name="cancelHours" type="number" min="0" max="168" value="${s.cancelHours}" required></label><label class="check-label"><input name="chargeMissed" type="checkbox" ${s.chargeMissed ? "checked" : ""}>Списывать занятие при пропуске без отмены</label><label class="form-field">Напоминать при остатке занятий<input name="remindAt" type="number" min="0" max="168" value="${s.remindAt}" required></label></div><div class="panel"><h2>Абонемент по умолчанию</h2><p class="subtitle" style="margin-bottom:24px">Стоимость можно скорректировать при приёме оплаты.</p><label class="form-field">Количество занятий<input name="credits" type="number" min="1" max="100" value="${s.credits}" required></label><label class="form-field">Стоимость, ₽<input name="price" type="number" min="1" max="100000" value="${s.price}" required></label><p class="mini-note">Мастерская «Ясна» · Сургут<br>Все занятия отображаются в часовом поясе UTC+5.</p></div></div><button class="btn primary" type="submit">${I("check")}Сохранить настройки</button></form><div class="panel" style="margin-top:24px"><h2>О приложении</h2><p class="subtitle">${backend ? "Рабочий сервер · общая база данных · отдельные доступы" : "Интерактивная демонстрация · вымышленные данные · локальное сохранение"}</p><p class="mini-note">Для реальных семей используйте серверный режим с отдельными учётными записями. Инструкция и исходный код входят в комплект для самостоятельного размещения.</p>${!backend ? `<a class="btn small" href="/yasna-source.zip" download>${I("download")}Исходники и инструкция</a>` : ""} <button class="text-link" data-action="about">О версии ${I("arrow")}</button></div>`
  );
}
function childPicker() {
  return `<div class="parent-child" role="group" aria-label="Показать данные ребёнка">${viewData.children.length > 1 ? `<button data-selectchild="all" class="${selectedChild === "all" ? "on" : ""}" aria-pressed="${selectedChild === "all"}">${I("users")} Все дети</button>` : ""}${viewData.children.map((c) => `<button data-selectchild="${c.id}" class="${c.id === selectedChild ? "on" : ""}" aria-pressed="${c.id === selectedChild}">${escape(c.name.split(" ")[0])} · ${c.age} лет</button>`).join("")}</div>`;
}
function parentSubscription(c) {
  return `<div class="panel" data-balance-child="${c.id}"><div class="section-head"><h2>Абонемент ${escape(c.name.split(" ")[0])}</h2>${I("ticket")}</div><div class="big-number">${c.balance}<span class="balance-unit muted"> занятий осталось</span></div><div class="progress"><div style="width:${Math.min(100, (c.balance / viewData.settings.credits) * 100)}%"></div></div><p class="subtitle">${viewData.settings.credits} занятия · ${money(viewData.settings.price)}</p>${c.balance <= viewData.settings.remindAt ? '<div class="inline-notice">Скоро время продлить абонемент. Уточните оплату у мастера.</div>' : ""}<button class="btn wide" data-action="parentpay">Как продлить ${I("arrow")}</button></div>`;
}
function familySubscriptions(cs) {
  return `<div class="panel family-subscriptions"><div class="section-head"><h2>Абонементы семьи</h2>${I("ticket")}</div><div class="big-number">${cs.reduce((n, c) => n + c.balance, 0)}<span class="balance-unit muted"> занятий всего</span></div><p class="mini-note">Остатки учитываются отдельно у каждого ребёнка.</p>${cs.map((c) => `<div class="family-balance-row" data-balance-child="${c.id}"><div class="person">${avatar(c)}<div><b>${escape(c.name)}</b><small>${c.balance <= viewData.settings.remindAt ? "Пора продлить" : "Абонемент действует"}</small></div></div><span class="badge ${c.balance <= viewData.settings.remindAt ? "warn" : ""}">${c.balance} зан.</span><button class="text-link" data-selectchild="${c.id}" aria-label="Открыть данные ${escape(c.name)}">${I("chevron")}</button></div>`).join("")}<button class="btn wide" data-action="parentpay">Как продлить ${I("arrow")}</button></div>`;
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
  document
    .querySelector("#settings-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = Object.fromEntries(new FormData(e.target));
      a.type = "settings";
      a.chargeMissed = e.target.querySelector("[name=chargeMissed]").checked;
      await act(a, "Правила сохранены");
    });
}
function showModal(title, body, large = false) {
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
const selectChildren = (id, cs = viewData.children) =>
  `<label class="form-field">Ребёнок<select name="child" required>${cs.map((c) => `<option value="${c.id}" ${c.id === id ? "selected" : ""}>${escape(c.name)}</option>`).join("")}</select></label>`;
function paymentModal(id) {
  form(
    "Принять оплату",
    selectChildren(id) +
      `<div class="inline-notice">${backend ? "Запись об оплате подтверждает получение денег вручную." : "Тестовая оплата. Деньги не переводятся."}</div><div class="form-row"><label class="form-field">Сумма, ₽<input name="amount" type="number" min="1" max="1000000" value="${viewData.settings.price}" required></label><label class="form-field">Занятий в абонементе<input name="credits" type="number" min="1" max="100" value="${viewData.settings.credits}" required></label></div><label class="form-field">Способ оплаты<select name="method"><option>Перевод</option><option>Наличные</option></select></label><p class="mini-note">Занятия добавятся к текущему остатку. Чек можно прикрепить на странице оплат.</p>`,
    async (a) => {
      if (
        await act(
          { type: "payment", ...a },
          "Оплата внесена. Абонемент пополнен.",
        )
      )
        closeModal();
    },
  );
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
        return `<tr><td><div class="person">${avatar(c)}<div><b>${escape(c.name)}</b><small>${escape(c.parent)}</small></div></div></td><td><span class="badge ${c.balance <= viewData.settings.remindAt ? "warn" : ""}">${c.balance} зан.</span></td><td><div class="attendance-actions"><button class="btn small ${b.status === "attended" ? "selected" : ""}" data-attend="${b.id}" data-status="attended">${I("check")}Пришёл</button><button class="btn small ${b.status === "missed" ? "missed" : ""}" data-attend="${b.id}" data-status="missed">Пропуск</button>${b.status !== "booked" ? `<button class="text-link" data-attend="${b.id}" data-status="booked" title="Снять отметку">${I("refresh")}</button>` : `<button class="text-link" data-cancelbook="${b.id}" title="Отменить запись">${I("close")}</button>`}</div></td></tr>`;
      })
      .join(
        "",
      )}</tbody></table>${bs.length ? "" : empty("В группе пока никого нет")}</div><p class="mini-note">«Пришёл» списывает 1 занятие. ${viewData.settings.chargeMissed ? "Пропуск тоже списывает занятие." : "Пропуск сохраняет занятие."} Повторная отметка не приводит к повторному списанию. ↻ возвращает занятие.</p>${waiting.length ? `<h3 style="margin-top:20px">Лист ожидания</h3>${waiting.map((b) => `<p class="subtitle">${escape(child(b.child).name)} · ${escape(child(b.child).parent)}</p>`).join("")}` : ""}<div class="modal-actions"><button class="btn primary" id="journal-add">${I("plus")}Записать ребёнка</button></div>`,
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
      : viewData.children;
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
  if (!b || b.status !== "booked")
    return toast("У этой записи уже отмечено посещение");
  const l = viewData.lessons.find((l) => l.id === b.lesson);
  showModal(
    "Отменить запись?",
    `<p class="subtitle">${escape(child(b.child).name)} · ${escape(l.title)}<br>${dateLabel(l.date)} в ${l.time}</p><div class="inline-notice">Занятие сохранится в абонементе. Место освободится для другой семьи.</div><div class="modal-actions"><button class="btn" id="keep-booking">Оставить запись</button><button class="btn primary" id="cancel-booking">Отменить запись</button></div>`,
  );
  document.querySelector("#keep-booking").onclick = closeModal;
  document.querySelector("#cancel-booking").onclick = async () => {
    if (await act({ type: "cancel", booking: id }, "Запись отменена"))
      closeModal();
  };
}
function childModal(id) {
  const c = child(id),
    h = viewData.history.filter((h) => h.child === id);
  showModal(
    escape(c.name),
    `<div class="person">${avatar(c)}<div><b>${c.age} лет</b><small>${escape(c.parent)} · ${escape(c.phone)}</small>${c.email ? `<small>${escape(c.email)}</small>` : ""}${c.messenger ? `<small>${escape(c.messenger)}</small>` : ""}</div></div><div class="client-detail-grid" style="margin-top:22px"><div class="panel"><div class="mini-note">Остаток абонемента</div><div class="stat-val">${c.balance} <small style="font-size:12px">зан.</small></div></div><div class="panel"><div class="mini-note">Посещений</div><div class="stat-val">${h.filter((h) => h.status === "attended").length}</div></div></div><h3>История занятий</h3>${h.length ? h.map((h) => `<div class="reminder-row"><div class="reminder-info"><b>${escape(h.title)}</b><small>${dateLabel(h.date)}</small></div><span class="badge ${h.status === "missed" ? "warn" : ""}">${h.status === "attended" ? "Пришёл" : "Пропуск"}</span></div>`).join("") : empty("Первые открытия ещё впереди")}${backend ? `<button class="btn small" id="parent-access" style="margin-top:18px">${I("users")}Ссылка для родителя</button>` : ""}<div class="modal-actions"><button class="btn" id="child-remind">${I("send")}Напомнить</button><button class="btn primary" id="child-pay">Принять оплату</button></div>`,
  );
  document
    .querySelector("#parent-access")
    ?.addEventListener("click", () => parentAccount(c.family));
  document.querySelector("#child-pay").onclick = () => paymentModal(id);
  document.querySelector("#child-remind").onclick = () => remind(id);
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
  intake: () => navigateEnrollment(true),
  menu: () => toggleNavigation(),
  closemenu: () => closeNavigation(true),
  today: () => {},
  openjournal: () => {
    const l = viewData.lessons.find((l) => l.date === TODAY);
    if (l) journal(l.id);
    else toast("Сегодня занятий нет");
  },
  addpayment: () => paymentModal(),
  addlesson: () =>
    form(
      "Новое занятие",
      `<label class="form-field">Название<input name="title" placeholder="Например, полка для сокровищ" maxlength="100" required></label><div class="form-row"><label class="form-field">Дата<input name="date" type="date" value="${selectedDate}" required></label><label class="form-field">Время (Сургут)<input name="time" type="time" value="16:00" required></label></div><label class="form-field">Формат занятия<select name="lessonType"><option value="group">Групповое</option><option value="individual">Индивидуальное</option></select></label><label class="form-field">Направление<select name="format"><option>Столярная мастерская</option><option>Маленькие мастера</option><option>Семейная мастерская</option></select></label><label class="form-field">Длительность, минут<input name="duration" type="number" inputmode="numeric" min="1" max="1440" step="1" value="90" placeholder="Например, 45 или 75" required></label><label class="form-field">Количество мест<input name="capacity" type="number" min="1" max="30" value="6" required><span class="mini-note" id="capacity-note">Укажите количество мест в группе.</span></label><label class="form-field">Возраст<input name="age" value="7–10 лет" maxlength="30" required></label>`,
      async (a) => {
        if (await act({ type: "lesson", ...a }, "Занятие добавлено")) {
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
      `<label class="form-field">Семья<select name="family"><option value="">Новая семья</option>${[...new Map(viewData.children.map((c) => [c.family, c])).values()].map((c) => `<option value="${c.family}">${escape(c.parent)}</option>`).join("")}</select></label><label class="form-field">Имя и фамилия ребёнка<input name="name" maxlength="100" required></label><label class="form-field">Возраст<input name="age" type="number" min="3" max="18" value="7" required></label><label class="form-field">Имя и фамилия родителя<input name="parent" maxlength="100" placeholder="Для новой семьи"></label><label class="form-field">Телефон<input name="phone" type="tel" placeholder="Для новой семьи: +7 (___) ___-__-__" maxlength="30"></label>`,
      async (a) => {
        if (await act({ type: "child", ...a }, "Ребёнок добавлен"))
          closeModal();
      },
    ),
  notifications: () => notificationsModal(),
  parentpay: () =>
    showModal(
      "Продлить абонемент",
      `<h3>${viewData.settings.credits} занятия · ${money(viewData.settings.price)}</h3><p class="subtitle">Оплатите абонемент привычным способом по договорённости с мастером. После подтверждения мастер внесёт оплату и прикрепит чек.</p><div class="inline-notice">${backend ? "Для уточнения реквизитов свяжитесь с мастером напрямую." : "Это демонстрация. Реквизиты и онлайн-оплата не подключены; переводить деньги не нужно."}</div>`,
    ),
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
      `<p class="subtitle">Расписание → запись → посещение → списание → оплата → чек.</p><div class="inline-notice">${backend ? "Серверный режим: отдельные сессии мастера и родителя, SQLite, проверка прав доступа и резервные копии." : "Демонстрация на вымышленных данных. Изменения сохраняются в браузере. Переключатель ролей показывает обе стороны приложения и не является защитой доступа."}</div><p class="subtitle">Для самостоятельного размещения предусмотрен Node.js 24 + SQLite без платной CRM. Онлайн-эквайринг, автоматическая выдача фискальных чеков и сообщения в мессенджере требуют подключения выбранных сервисов.</p><p class="mini-note">Лист ожидания доступен при заполненной группе. Автоматическое предложение освободившегося места, импорт «МойКласс» и отработки — следующий этап.</p>${!backend ? `<a class="btn green" href="/yasna-source.zip" download>${I("download")}Скачать исходники и инструкцию</a>` : ""}`,
    ),
  logout: async () => {
    await apiFetch("/api/logout", { method: "POST" });
    user = { role: null };
    render();
  },
};
function login() {
  document.querySelector("#app").innerHTML =
    `<div class="login-page"><form id="login-form" class="login-card">${brand}<h2>Вход для мастера</h2><label class="form-field">Логин<input name="username" autocomplete="username" required></label><label class="form-field">Пароль<input name="password" type="password" autocomplete="current-password" required></label><p class="error" id="login-error"></p><button class="btn primary" type="submit">Войти ${I("arrow")}</button><p class="mini-note">Родителям не нужны логин и пароль: мастер выдаёт персональную ссылку на кабинет семьи.</p><button type="button" class="btn" id="login-intake">Впервые у нас? Записать ребёнка</button></form></div>`;
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
  } else
    publicLessons = data.lessons.filter(
      (l) => new Date(l.date + "T" + l.time + ":00+05:00") > demoNow(),
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
    `<main class="intake-shell"><header class="intake-header">${brand}<button class="btn small" id="intake-back">${backend ? (user.role ? "В кабинет" : "Вход в кабинет") : "Вернуться к демо"}</button></header>${body}<footer class="intake-footer">Мастерская «Ясна» · Сургут · Время занятий UTC+5<br><a href="https://vk.ru/yasna.vibe" target="_blank" rel="noopener noreferrer">Группа мастерской ВКонтакте ↗</a></footer></main>`;
  if (enrollmentSuccess) {
    document.querySelector("#app").innerHTML = shell(
      `<section class="panel intake-success">${I("check")}<div class="eyebrow">ПЕРВЫЙ ШАГ СДЕЛАН</div><h1>Заявка ${backend ? "отправлена" : "сохранена в демо"}</h1><p class="subtitle">Мастер свяжется с вами выбранным способом, уточнит детали и подтвердит занятие. После общения мастер пришлёт персональную ссылку на кабинет семьи.</p><div class="inline-notice">Заявка не бронирует место автоматически. Доступ к кабинету мастер выдаст персональной ссылкой.${!backend ? " Это демонстрация: заявка сохранена только в этом браузере и не отправляется в мастерскую." : ""}</div><p class="mini-note">Номер заявки: ${escape(enrollmentSuccess.id.slice(0, 8))}</p><button class="btn green" id="intake-another">Записать ещё одного ребёнка</button></section>`,
    );
    document.querySelector("#intake-back").onclick = () =>
      navigateEnrollment(false);
    document.querySelector("#intake-another").onclick = () => {
      enrollmentSuccess = null;
      renderEnrollment();
    };
    return;
  }
  document.querySelector("#app").innerHTML = shell(
    `<section class="intake-intro"><div class="eyebrow">ЗНАКОМСТВО С МАСТЕРСКОЙ</div><h1>Записать ребёнка</h1><p class="subtitle">Оставьте контакты — мы свяжемся с вами и подберём занятие. Личный кабинет создадим после знакомства.</p><div class="intake-steps"><span>01 · Заявка</span><span>02 · Разговор с мастером</span><span>03 · Личный кабинет</span></div></section>${!backend ? '<div class="inline-notice">Демонстрационная форма. Используйте вымышленные контакты: заявка сохранится только в этом браузере. Для приёма заявок с других устройств нужен серверный режим.</div>' : ""}<form class="panel intake-form" id="intake-form"><h2>О ребёнке</h2><div class="form-row"><label class="form-field">Имя и фамилия ребёнка *<input name="childName" autocomplete="off" minlength="2" maxlength="100" placeholder="Например, Саша Иванов" required></label><label class="form-field">Возраст, лет *<input name="age" type="number" min="3" max="18" step="1" inputmode="numeric" placeholder="8" required></label></div><h2>Контакты родителя</h2><label class="form-field">ФИО родителя *<input name="parentName" autocomplete="name" minlength="2" maxlength="100" required></label><div class="form-row"><label class="form-field">Телефон *<input name="phone" type="tel" autocomplete="tel" maxlength="30" placeholder="+7 (___) ___-__-__" required></label><label class="form-field">Электронная почта *<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="parent@example.ru" required></label></div><div class="form-row"><label class="form-field">Как удобнее связаться *<select name="contactMethod"><option value="phone">По телефону</option><option value="telegram">В Telegram</option><option value="whatsapp">В WhatsApp</option><option value="email">По электронной почте</option></select></label><label class="form-field">Контакт в мессенджере<input name="messenger" maxlength="100" placeholder="@имя в Telegram или номер WhatsApp"><span class="mini-note">Для Telegram укажите имя пользователя. Для WhatsApp можно использовать указанный телефон.</span></label></div><label class="form-field">Удобное время для связи<input name="contactTime" maxlength="200" placeholder="Например, в будни после 18:00"></label><h2>Пожелания к занятию</h2><label class="form-field">Желаемый формат<select name="lessonType"><option value="group">Групповое</option><option value="individual">Индивидуальное</option></select></label><label class="form-field">Интересующее занятие<select name="lesson"><option value="">Помогите подобрать занятие и время</option>${publicLessons.map((l) => `<option value="${l.id}">${escape(l.title)} · ${dateLabel(l.date)} · ${l.time} · ${l.duration} мин.</option>`).join("")}</select><span class="mini-note">Выбор занятия — пожелание. Наличие места и время подтвердит мастер.</span></label><label class="form-field">Комментарий<textarea name="notes" rows="3" maxlength="500" placeholder="Что любит мастерить ребёнок, вопросы или пожелания"></textarea></label><label class="check-label intake-consent"><input name="consent" type="checkbox" required>Согласен на использование указанных данных для связи со мной и организации занятий.</label><p class="error" id="intake-error" role="alert"></p><button class="btn primary" type="submit">Оставить заявку ${I("arrow")}</button><p class="mini-note">* Обязательные поля. Пароль на этом этапе не нужен.</p></form>`,
  );
  document.querySelector("#intake-back").onclick = () =>
    navigateEnrollment(false);
  document.querySelector("#intake-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("[type=submit]");
    button.disabled = true;
    document.querySelector("#intake-error").textContent = "";
    try {
      const input = Object.fromEntries(new FormData(e.target));
      input.consent = e.target.querySelector("[name=consent]").checked;
      let result;
      if (backend) {
        const r = await apiFetch("/api/public/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        result = await readJson(r);
        if (!r.ok) throw Error(result.error || "Не удалось отправить заявку");
      } else {
        const next = structuredClone(data);
        result = submitApplication(next, input, demoNow());
        saveLocal(next);
      }
      enrollmentSuccess = result;
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
      "Сначала свяжитесь с родителем, затем подтвердите запись и создайте кабинет.",
      `<button class="btn primary" data-action="intake">${I("plus")}Форма первичной записи</button>`,
    ) +
    `<div class="panel"><h2>Ссылка для новых родителей</h2><p class="subtitle">Форма открывается без личного кабинета. Место бронируется только после вашего подтверждения.</p><label class="form-field" style="margin-top:15px">Адрес формы<input readonly value="${escape((window.location?.origin || "") + (window.location?.pathname || "/") + "#enroll")}" aria-label="Ссылка на первичную запись"></label>${!backend ? '<p class="mini-note">Сейчас открыт деморежим: заявки видны только в этом браузере. Для общих заявок нужен сервер из комплекта исходников.</p>' : ""}</div><div class="table-wrap"><table><thead><tr><th>Дата</th><th>Ребёнок</th><th>Родитель</th><th>Контакты</th><th>Статус</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr data-request-row="${r.id}"><td>${dateLabel(r.createdAt.slice(0, 10))}</td><td><div class="person"><div><b>${escape(r.childName)}</b><small>${r.age} лет · ${r.lessonType === "individual" ? "Индивидуальное" : "Групповое"}</small></div></div></td><td>${escape(r.parentName)}</td><td>${escape(r.phone)}<br><span class="mini-note">${escape(r.email)}</span></td><td><span class="badge ${r.status === "pending" ? "warn" : ""}">${applicationLabels[r.status]}</span></td><td><button class="text-link" data-application="${r.id}">Открыть ${I("chevron")}</button></td></tr>`).join("")}</tbody></table>${rows.length ? "" : empty("Пока нет заявок. Отправьте родителям ссылку на форму первичной записи.")}</div>`
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
        new Date(l.date + "T" + l.time + ":00+05:00") >
        (backend ? new Date() : demoNow()),
    );
  form(
    "Подтвердить запись ребёнка",
    `<p class="subtitle" style="margin-bottom:20px">${escape(r.childName)} · ${escape(r.parentName)}</p><label class="form-field">Семья<select name="family"><option value="">Создать новую семью</option>${[...new Map(viewData.children.map((c) => [c.family, c])).values()].map((c) => `<option value="${c.family}">${escape(c.parent)}</option>`).join("")}</select><span class="mini-note">Выбирайте существующую семью только после подтверждения родителем.</span></label><label class="form-field">Записать на занятие<select name="lesson"><option value="">Пока без записи на конкретное занятие</option>${lessons.map((l) => `<option value="${l.id}" ${l.id === r.lesson ? "selected" : ""}>${escape(l.title)} · ${dateLabel(l.date)} · ${l.time}</option>`).join("")}</select></label><div class="inline-notice">Ребёнок появится в списке клиентов. Занятия не начисляются, кабинет создаётся отдельно после подтверждения.</div>`,
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
    `<div class="notification-summary"><span class="badge ${unread.length ? "warn" : ""}">${unread.length} непрочитанных</span>${unread.length ? '<button class="btn small green" id="read-all-notifications">Прочитать все</button>' : ""}</div><div class="notification-list">${
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

async function downloadRemoteReceipt(id,name){try{const r=await apiFetch('/api/receipts/'+encodeURIComponent(id));if(!r.ok){const e=await readJson(r);throw Error(e.error||'Не удалось скачать чек')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){toast(e.message)}}
function renderMasterSetup(code){document.querySelector('#app').innerHTML=`<div class="login-page"><form class="login-card" id="master-setup">${brand}<h2>Первый вход мастера</h2><p class="subtitle">Выберите логин и пароль. Эта персональная ссылка используется только один раз.</p><label class="form-field" style="margin-top:20px">Логин<input name="username" value="master" pattern="[a-zA-Z0-9_.-]{3,60}" autocomplete="username" required></label><label class="form-field">Пароль — от 12 символов<input name="password" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></label><label class="form-field">Повторите пароль<input name="confirmation" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></label><p class="error" id="setup-error" role="alert"></p><button class="btn primary" type="submit">Сохранить и открыть кабинет</button></form></div>`;document.querySelector('#master-setup').onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target)),button=e.target.querySelector('[type=submit]');if(values.password!==values.confirmation){document.querySelector('#setup-error').textContent='Пароли не совпадают';return}button.disabled=true;try{const r=await apiFetch('/api/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,username:values.username,password:values.password})}),result=await readJson(r);if(!r.ok)throw Error(result.error);user=result;role=result.role;page='dashboard';await loadServer();render()}catch(err){document.querySelector('#setup-error').textContent=err.message;button.disabled=false}}}

function mobileNavigation(){const tabs=role==='parent'?[['dashboard','grid','Моя семья'],['schedule','calendar','Записаться'],['payments','wallet','Оплаты']]:[['dashboard','grid','Обзор'],['schedule','calendar','Занятия'],['clients','users','Дети'],['payments','wallet','Оплаты']];const other=!tabs.some(t=>t[0]===page),pending=(viewData.applications||[]).filter(r=>r.status==='pending').length;return`<nav class="mobile-bottom-nav" aria-label="Основные разделы">${tabs.map(([id,icon,label])=>`<button data-page="${id}" class="${page===id?'is-active':''}"${page===id?' aria-current="page"':''}>${I(icon)}<span>${label}</span></button>`).join('')}${role==='master'?`<button data-action="menu" class="${other?'is-active':''}" aria-label="Ещё разделы" aria-controls="main-navigation" aria-expanded="false">${I('menu')}<span>Ещё</span>${pending?`<span class="mobile-nav-count">${pending}</span>`:''}</button>`:''}</nav>`}
