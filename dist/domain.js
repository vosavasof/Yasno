export const TODAY = "2026-11-14";
export const emptyState = () => ({
  version: 1,
  revision: 0,
  settings: {
    cancelHours: 12,
    chargeMissed: true,
    remindAt: 2,
    price: 6400,
    credits: 4,
  },
  children: [],
  lessons: [],
  bookings: [],
  payments: [],
  history: [],
  activity: [],
  reminders: [],
  applications: [],
});
export function applyAction(
  s,
  a,
  actor = { role: "master" },
  now = new Date(),
) {
  const isMaster = actor.role === "master";
  const child = (id) => {
    const c = s.children.find((c) => c.id === id);
    if (!c) throw Error("Ребёнок не найден");
    if (!isMaster && c.family !== actor.family) throw Error("Нет доступа");
    return c;
  };
  const master = () => {
    if (!isMaster) throw Error("Только для мастера");
  };
  const uid = () => crypto.randomUUID();
  const log = (text) =>
    s.activity.unshift({
      text,
      time: now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Yekaterinburg",
      }),
      type: a.type,
    });
  if (a.type === "book") {
    child(a.child);
    const l = s.lessons.find((l) => l.id === a.lesson);
    if (!l) throw Error("Занятие не найдено");
    if (new Date(l.date + "T" + l.time + ":00+05:00") <= now)
      throw Error("Запись на прошедшее занятие закрыта");
    if (
      s.bookings.some(
        (b) =>
          b.child === a.child &&
          b.lesson === a.lesson &&
          b.status !== "cancelled",
      )
    )
      throw Error("Ребёнок уже записан");
    const full =
      s.bookings.filter(
        (b) =>
          b.lesson === l.id && !["cancelled", "waitlist"].includes(b.status),
      ).length >= l.capacity;
    if (full && !a.waitlist) throw Error("Все места заняты");
    s.bookings.push({
      id: uid(),
      child: a.child,
      lesson: l.id,
      status: full ? "waitlist" : "booked",
    });
    log(
      child(a.child).name + (full ? " — в листе ожидания" : " — новая запись"),
    );
  } else if (a.type === "attendance") {
    master();
    const b = s.bookings.find((b) => b.id === a.booking);
    if (!b || ["cancelled", "waitlist"].includes(b.status))
      throw Error("Запись недоступна");
    if (!["booked", "attended", "missed"].includes(a.status))
      throw Error("Некорректная отметка");
    const c = child(b.child);
    const charge =
      a.status === "attended" ||
      (a.status === "missed" && s.settings.chargeMissed);
    const was = !!b.charged;
    if (charge && !was && c.balance < 1)
      throw Error("Нет занятий в абонементе. Сначала внесите оплату.");
    c.balance += (was ? 1 : 0) - (charge ? 1 : 0);
    b.status = a.status;
    b.charged = charge;
    s.history = s.history.filter((h) => h.booking !== b.id);
    if (a.status !== "booked") {
      const l = s.lessons.find((l) => l.id === b.lesson);
      s.history.push({
        id: uid(),
        booking: b.id,
        child: b.child,
        date: l.date,
        title: l.title,
        status: a.status,
        charged: charge,
      });
    }
    log(
      c.name +
        " — " +
        (a.status === "attended"
          ? "посещение отмечено"
          : a.status === "missed"
            ? "пропуск отмечен"
            : "отметка снята"),
    );
  } else if (a.type === "cancel") {
    const b = s.bookings.find((b) => b.id === a.booking);
    if (!b || b.status !== "booked")
      throw Error("Отменить можно только предстоящую запись");
    child(b.child);
    const l = s.lessons.find((l) => l.id === b.lesson);
    const hours = (new Date(l.date + "T" + l.time + ":00+05:00") - now) / 36e5;
    if (hours < 0) throw Error("Занятие уже началось");
    if (!isMaster && hours < s.settings.cancelHours)
      throw Error(
        "До занятия меньше " +
          s.settings.cancelHours +
          " ч. Свяжитесь с мастером",
      );
    b.status = "cancelled";
    log(child(b.child).name + " — запись отменена");
  } else if (a.type === "payment") {
    master();
    const c = child(a.child);
    const amount = Number(a.amount),
      credits = Number(a.credits);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1000000 ||
      !Number.isInteger(credits) ||
      credits < 1 ||
      credits > 100
    )
      throw Error("Проверьте сумму и количество занятий");
    s.payments.unshift({
      id: uid(),
      child: c.id,
      amount,
      credits,
      date: now.toLocaleDateString("sv-SE", { timeZone: "Asia/Yekaterinburg" }),
      method: String(a.method).slice(0, 50),
      receipt: null,
    });
    c.balance += credits;
    log("Оплата " + c.name + " · " + amount + " ₽");
  } else if (a.type === "receipt") {
    master();
    const p = s.payments.find((p) => p.id === a.payment);
    if (!p) throw Error("Оплата не найдена");
    if (
      !a.receipt ||
      !/^data:(application\/pdf|image\/(png|jpeg));base64,/.test(
        a.receipt.data,
      ) ||
      a.receipt.data.length > 2800000
    )
      throw Error("Чек: PDF, PNG или JPG до 2 МБ");
    p.receipt = {
      name: String(a.receipt.name).slice(0, 150),
      data: a.receipt.data,
    };
    log("Чек прикреплён к оплате");
  } else if (a.type === "lesson") {
    master();
    const lessonType = a.lessonType || "group";
    if (!["group", "individual"].includes(lessonType))
      throw Error("Выберите формат занятия");
    const capacity = lessonType === "individual" ? 1 : +a.capacity;
    if (
      !a.title?.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(a.date) ||
      !/^\d{2}:\d{2}$/.test(a.time) ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 30 ||
      !Number.isInteger(+a.duration) ||
      +a.duration < 1 ||
      +a.duration > 1440
    )
      throw Error("Проверьте поля занятия");
    s.lessons.push({
      id: uid(),
      title: a.title.trim().slice(0, 100),
      date: a.date,
      time: a.time,
      capacity,
      lessonType,
      duration: +a.duration,
      format: a.format || "Столярная мастерская",
      age: a.age || "7–12 лет",
      color: "orange",
    });
    log("Добавлено занятие «" + a.title + "»");
  } else if (a.type === "child") {
    master();
    const family = s.children.find((c) => c.family === a.family);
    if (family) {
      a.parent = family.parent;
      a.phone = family.phone;
    }
    if (
      !a.name?.trim() ||
      !a.parent?.trim() ||
      !Number.isInteger(+a.age) ||
      +a.age < 3 ||
      +a.age > 18
    )
      throw Error("Укажите имя, возраст и родителя");
    s.children.push({
      id: uid(),
      name: a.name.trim().slice(0, 100),
      parent: a.parent.trim().slice(0, 100),
      age: +a.age,
      phone: String(a.phone || "").slice(0, 30),
      family: family?.family || uid(),
      balance: 0,
      color: "peach",
    });
    log("Добавлен ребёнок " + a.name);
  } else if (a.type === "settings") {
    master();
    for (const k of ["cancelHours", "remindAt", "price", "credits"])
      if (
        !Number.isInteger(+a[k]) ||
        +a[k] < 0 ||
        +a[k] > (k === "price" ? 100000 : 168)
      )
        throw Error("Проверьте настройки");
    if (+a.credits < 1 || +a.price < 1)
      throw Error("Цена и занятия должны быть больше нуля");
    s.settings = {
      cancelHours: +a.cancelHours,
      remindAt: +a.remindAt,
      price: +a.price,
      credits: +a.credits,
      chargeMissed: !!a.chargeMissed,
    };
    log("Правила мастерской обновлены");
  } else if (a.type === "application_status") {
    master();
    const r = (s.applications || []).find((r) => r.id === a.application);
    if (
      !r ||
      !["pending", "contacted"].includes(r.status) ||
      !["contacted", "declined"].includes(a.status)
    )
      throw Error("Статус заявки нельзя изменить");
    r.status = a.status;
    log(
      "Заявка " +
        r.childName +
        " — " +
        (a.status === "contacted" ? "с родителем связались" : "закрыта"),
    );
  } else if (a.type === "application_confirm") {
    master();
    const r = (s.applications || []).find((r) => r.id === a.application);
    if (!r || r.status !== "contacted")
      throw Error("Сначала свяжитесь с родителем и отметьте это в заявке");
    const family = a.family
      ? s.children.find((c) => c.family === a.family)
      : null;
    if (a.family && !family) throw Error("Семья не найдена");
    const lesson = a.lesson ? s.lessons.find((l) => l.id === a.lesson) : null;
    if (a.lesson && !lesson) throw Error("Занятие не найдено");
    if (lesson) {
      if (new Date(lesson.date + "T" + lesson.time + ":00+05:00") <= now)
        throw Error("Выберите предстоящее занятие");
      if (
        s.bookings.filter(
          (b) =>
            b.lesson === lesson.id &&
            !["cancelled", "waitlist"].includes(b.status),
        ).length >= lesson.capacity
      )
        throw Error(
          "В группе нет свободных мест. Выберите другое занятие или подтвердите без записи.",
        );
    }
    const c = {
      id: uid(),
      name: r.childName,
      age: r.age,
      parent: family?.parent || r.parentName,
      phone: family?.phone || r.phone,
      email: family?.email || r.email,
      messenger: family?.messenger || r.messenger,
      contactMethod: family?.contactMethod || r.contactMethod,
      contactTime: r.contactTime,
      family: family?.family || uid(),
      balance: 0,
      color: "peach",
    };
    s.children.push(c);
    if (lesson)
      s.bookings.push({
        id: uid(),
        child: c.id,
        lesson: lesson.id,
        status: "booked",
      });
    r.status = "confirmed";
    r.child = c.id;
    r.family = c.family;
    r.confirmedAt = now.toISOString();
    log(
      "Заявка " +
        r.childName +
        " подтверждена. Доступ родителю создаётся отдельно.",
    );
  } else if (a.type === "remind") {
    master();
    child(a.child);
    s.reminders.push({ child: a.child, date: now.toISOString() });
    log("Подготовлено напоминание для " + child(a.child).parent);
  } else throw Error("Неизвестное действие");
  s.revision++;
  return s;
}
export function familyView(s, family) {
  const copy = structuredClone(s),
    ids = new Set(
      s.children.filter((c) => c.family === family).map((c) => c.id),
    );
  copy.children = copy.children.filter((c) => ids.has(c.id));
  copy.bookings = copy.bookings.filter((b) => ids.has(b.child));
  copy.occupancy = Object.fromEntries(
    s.lessons.map((l) => [
      l.id,
      s.bookings.filter(
        (b) =>
          b.lesson === l.id && !["cancelled", "waitlist"].includes(b.status),
      ).length,
    ]),
  );
  copy.payments = copy.payments.filter((p) => ids.has(p.child));
  copy.history = copy.history.filter((h) => ids.has(h.child));
  copy.activity = [];
  copy.reminders = [];
  copy.applications = [];
  return copy;
}
export function validateState(s) {
  const fail = () => {
    throw Error("Некорректная резервная копия");
  };
  const id = (v) => typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v),
    str = (v) => typeof v === "string" && v.length <= 500;
  if (
    s?.version !== 1 ||
    !Number.isInteger(s.revision) ||
    !s.settings ||
    ![
      "children",
      "lessons",
      "bookings",
      "payments",
      "history",
      "activity",
      "reminders",
    ].every((k) => Array.isArray(s[k]) && s[k].length < 100000)
  )
    fail();
  for (const k of ["cancelHours", "remindAt", "price", "credits"])
    if (
      !Number.isInteger(s.settings[k]) ||
      s.settings[k] < 0 ||
      s.settings[k] > 100000
    )
      fail();
  if (
    s.settings.price < 1 ||
    s.settings.credits < 1 ||
    typeof s.settings.chargeMissed !== "boolean"
  )
    fail();
  const children = new Set(s.children.map((c) => c.id)),
    lessons = new Set(s.lessons.map((l) => l.id));
  if (children.size !== s.children.length || lessons.size !== s.lessons.length)
    fail();
  for (const c of s.children)
    if (
      !id(c.id) ||
      !id(c.family) ||
      !str(c.name) ||
      !str(c.parent) ||
      !str(c.phone) ||
      !Number.isInteger(c.age) ||
      c.age < 3 ||
      c.age > 18 ||
      !Number.isInteger(c.balance) ||
      c.balance < 0 ||
      !["peach", "green", "rose", "blue", "yellow", "lilac"].includes(c.color)
    )
      fail();
  for (const l of s.lessons)
    if (
      !id(l.id) ||
      !str(l.title) ||
      !str(l.format) ||
      !str(l.age) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(l.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(l.time) ||
      !Number.isInteger(l.capacity) ||
      l.capacity < 1 ||
      l.capacity > 30 ||
      !Number.isInteger(l.duration) ||
      l.duration < 1 ||
      l.duration > 1440 ||
      !["group", "individual"].includes(l.lessonType || "group") ||
      (l.lessonType === "individual" && l.capacity !== 1) ||
      !["orange", "green", "purple"].includes(l.color)
    )
      fail();
  for (const b of s.bookings)
    if (
      !id(b.id) ||
      !children.has(b.child) ||
      !lessons.has(b.lesson) ||
      !["booked", "attended", "missed", "cancelled", "waitlist"].includes(
        b.status,
      )
    )
      fail();
  for (const h of s.history)
    if (
      !id(h.id) ||
      !children.has(h.child) ||
      !str(h.date) ||
      !str(h.title) ||
      !["attended", "missed"].includes(h.status) ||
      typeof h.charged !== "boolean"
    )
      fail();
  for (const p of s.payments) {
    if (
      !id(p.id) ||
      !children.has(p.child) ||
      !Number.isFinite(p.amount) ||
      p.amount <= 0 ||
      !Number.isInteger(p.credits) ||
      p.credits < 1 ||
      !str(p.date) ||
      !str(p.method)
    )
      fail();
    if (
      p.receipt &&
      (!str(p.receipt.name) ||
        !(
          (typeof p.receipt.data === "string" &&
            /^data:(application\/pdf|image\/(png|jpeg));base64,/.test(
              p.receipt.data,
            ) &&
            p.receipt.data.length <= 2800000) ||
          (typeof p.receipt.key === "string" &&
            /^receipts\/[a-zA-Z0-9-]{1,100}$/.test(p.receipt.key))
        ))
    )
      fail();
  }
  for (const a of s.activity)
    if (!str(a.text) || !str(a.time) || !str(a.type)) fail();
  if (s.applications !== undefined) {
    if (!Array.isArray(s.applications) || s.applications.length >= 100000)
      fail();
    const seen = new Set();
    for (const r of s.applications) {
      if (
        !id(r.id) ||
        seen.has(r.id) ||
        !str(r.childName) ||
        !str(r.parentName) ||
        !str(r.phone) ||
        !str(r.email) ||
        !str(r.messenger) ||
        !str(r.contactTime) ||
        !str(r.notes) ||
        !Number.isInteger(r.age) ||
        r.age < 3 ||
        r.age > 18 ||
        !["phone", "telegram", "whatsapp", "email"].includes(r.contactMethod) ||
        !["group", "individual"].includes(r.lessonType) ||
        !["pending", "contacted", "confirmed", "declined"].includes(r.status) ||
        !str(r.createdAt) ||
        r.consent !== true ||
        (r.lesson && !lessons.has(r.lesson)) ||
        (r.status === "confirmed" && (!children.has(r.child) || !id(r.family)))
      )
        fail();
      seen.add(r.id);
    }
  }
  for (const r of s.reminders)
    if (!children.has(r.child) || !str(r.date)) fail();
  return true;
}

export function submitApplication(s, input, now = new Date()) {
  const text = (key, max = 100) => {
    const v = typeof input[key] === "string" ? input[key].trim() : "";
    if (v.length > max) throw Error("Слишком длинное поле: " + key);
    return v;
  };
  const childName = text("childName"),
    parentName = text("parentName"),
    phone = text("phone", 30),
    email = text("email", 254),
    messenger = text("messenger", 100),
    contactTime = text("contactTime", 200),
    notes = text("notes", 500),
    lesson = text("lesson"),
    lessonType = input.lessonType || "group",
    contactMethod = input.contactMethod || "phone",
    age = Number(input.age);
  if (
    childName.length < 2 ||
    parentName.length < 2 ||
    !Number.isInteger(age) ||
    age < 3 ||
    age > 18
  )
    throw Error("Укажите имя ребёнка, возраст от 3 до 18 лет и ФИО родителя");
  if (
    !/^[+\d()\s-]+$/.test(phone) ||
    phone.replace(/\D/g, "").length < 10 ||
    phone.replace(/\D/g, "").length > 15
  )
    throw Error("Укажите корректный телефон родителя");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("Укажите корректную электронную почту");
  if (
    !["phone", "telegram", "whatsapp", "email"].includes(contactMethod) ||
    !["group", "individual"].includes(lessonType)
  )
    throw Error("Выберите способ связи и формат занятия");
  if (contactMethod === "telegram" && !messenger)
    throw Error("Укажите контакт в Telegram");
  if (input.consent !== true)
    throw Error("Необходимо согласие на использование данных для связи");
  if (lesson) {
    const l = s.lessons.find((l) => l.id === lesson);
    if (!l || new Date(l.date + "T" + l.time + ":00+05:00") <= now)
      throw Error("Выберите предстоящее занятие или помощь с подбором");
  }
  const current = s.applications || [];
  if (
    current.some(
      (r) =>
        ["pending", "contacted"].includes(r.status) &&
        r.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") &&
        r.childName.toLowerCase() === childName.toLowerCase(),
    )
  )
    throw Error(
      "Заявка на этого ребёнка уже получена. Дождитесь связи с мастером.",
    );
  const request = {
    id: crypto.randomUUID(),
    childName,
    age,
    parentName,
    phone,
    email,
    messenger,
    contactMethod,
    contactTime,
    notes,
    lesson,
    lessonType,
    consent: true,
    status: "pending",
    createdAt: now.toISOString(),
  };
  s.applications = [...current, request];
  s.revision++;
  return { id: request.id, status: request.status };
}

export function notificationsFor(s, actor, now = new Date()) {
  const result = [],
    master = actor.role === "master",
    children = s.children.filter((c) => master || c.family === actor.family),
    own = new Set(children.map((c) => c.id));
  for (const c of children)
    if (c.balance <= s.settings.remindAt)
      result.push({
        id: `balance:${c.id}:${s.payments.find((p) => p.child === c.id)?.id || "initial"}:${c.balance}`,
        title:
          c.balance === 0 ? "Закончились занятия" : "Пора продлить абонемент",
        text: `${c.name}: осталось ${c.balance} занятий.`,
        page: master ? "subscriptions" : "dashboard",
        icon: "ticket",
      });
  if (master) {
    for (const r of s.applications || [])
      if (r.status === "pending")
        result.push({
          id: `application:${r.id}`,
          title: "Новая заявка на занятие",
          text: `${r.childName} · ${r.parentName}. Свяжитесь с родителем.`,
          page: "applications",
          application: r.id,
          icon: "users",
        });
    for (const p of s.payments)
      if (!p.receipt)
        result.push({
          id: `receipt:${p.id}`,
          title: "Нужно прикрепить чек",
          text: `${s.children.find((c) => c.id === p.child)?.name || "Оплата"} · ${p.amount} ₽`,
          page: "payments",
          icon: "file",
        });
    for (const b of s.bookings)
      if (b.status === "waitlist") {
        const l = s.lessons.find((l) => l.id === b.lesson);
        if (
          l &&
          new Date(l.date + "T" + l.time + ":00+05:00") > now &&
          s.bookings.filter(
            (x) =>
              x.lesson === l.id &&
              !["cancelled", "waitlist"].includes(x.status),
          ).length < l.capacity
        )
          result.push({
            id: `waitlist:${b.id}`,
            title: "Освободилось место",
            text: `${l.title}: можно связаться с семьёй из листа ожидания.`,
            page: "schedule",
            icon: "calendar",
          });
      }
  } else {
    for (const p of s.payments)
      if (own.has(p.child) && p.receipt)
        result.push({
          id: `receipt-ready:${p.id}`,
          title: "Чек доступен",
          text: `${s.children.find((c) => c.id === p.child)?.name}: чек за оплату ${p.amount} ₽ можно скачать.`,
          page: "payments",
          icon: "file",
        });
    for (const b of s.bookings)
      if (own.has(b.child) && b.status === "booked") {
        const l = s.lessons.find((l) => l.id === b.lesson),
          time = l ? new Date(l.date + "T" + l.time + ":00+05:00") : null;
        if (time && time > now && time - now < 72 * 36e5)
          result.push({
            id: `lesson:${b.id}`,
            title: "Скоро занятие",
            text: `${s.children.find((c) => c.id === b.child)?.name}: ${l.title}, ${l.date} в ${l.time}.`,
            page: "schedule",
            date: l.date,
            icon: "calendar",
          });
      }
  }
  return result;
}
