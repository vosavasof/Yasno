import { seed } from "./fixtures.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyAction,
  familyView,
  validateState,
  submitApplication,
} from "../dist/domain.js";
const now = new Date("2026-11-14T08:30:00+05:00");
const master = { role: "master" },
  parent = { role: "parent", family: "f1" };
const run = (s, a, u = master) => applyAction(s, a, u, now);
test("attendance is idempotent, corrections refund exactly one credit", () => {
  const s = seed();
  run(s, { type: "attendance", booking: "b1", status: "attended" });
  run(s, { type: "attendance", booking: "b1", status: "attended" });
  assert.equal(s.children[0].balance, 1);
  assert.equal(s.history.filter((h) => h.booking === "b1").length, 1);
  run(s, { type: "attendance", booking: "b1", status: "missed" });
  assert.equal(s.children[0].balance, 1);
  run(s, { type: "attendance", booking: "b1", status: "booked" });
  assert.equal(s.children[0].balance, 2);
  assert.equal(s.history.filter((h) => h.booking === "b1").length, 0);
});
test("no negative balance; payment enables full attendance flow", () => {
  const s = seed();
  assert.throws(
    () => run(s, { type: "attendance", booking: "b4", status: "attended" }),
    /Сначала внесите/,
  );
  run(s, {
    type: "payment",
    child: "c5",
    amount: 6400,
    credits: 4,
    method: "Тестовая оплата",
  });
  run(s, { type: "attendance", booking: "b4", status: "attended" });
  assert.equal(s.children.find((c) => c.id === "c5").balance, 3);
});
test("parent sees own children and records, with aggregate occupancy only", () => {
  const s = familyView(seed(), "f1");
  assert.deepEqual(
    s.children.map((c) => c.id),
    ["c1", "c2"],
  );
  assert.equal(s.occupancy.l1, 5);
  assert.ok(s.bookings.every((b) => ["c1", "c2"].includes(b.child)));
  assert.equal(s.activity.length, 0);
  assert.ok(s.payments.every((p) => p.child === "c2"));
});
test("parent cannot modify other family or master-only actions", () => {
  for (const a of [
    { type: "book", child: "c3", lesson: "l4" },
    { type: "cancel", booking: "b2" },
    { type: "payment", child: "c1", amount: 1, credits: 2 },
    { type: "attendance", booking: "b1", status: "attended" },
    { type: "settings" },
    { type: "receipt", payment: "p1" },
  ])
    assert.throws(() => run(seed(), a, parent));
});
test("booking respects capacity, duplicate protection, waitlist", () => {
  const s = seed();
  run(s, { type: "book", child: "c2", lesson: "l1" });
  assert.throws(
    () => run(s, { type: "book", child: "c7", lesson: "l1" }),
    /места заняты/,
  );
  run(s, { type: "book", child: "c7", lesson: "l1", waitlist: true });
  assert.equal(s.bookings.at(-1).status, "waitlist");
  assert.throws(
    () => run(s, { type: "book", child: "c2", lesson: "l1" }),
    /уже записан/,
  );
});
test("cancellation rules are configurable and enforce parent window", () => {
  let s = seed();
  assert.throws(
    () => run(s, { type: "cancel", booking: "b1" }, parent),
    /меньше 12/,
  );
  s.settings.cancelHours = 1;
  run(s, { type: "cancel", booking: "b1" }, parent);
  assert.equal(s.bookings[0].status, "cancelled");
  assert.equal(s.children[0].balance, 2);
});
test("missed lesson respects configurable charging policy", () => {
  const s = seed();
  s.settings.chargeMissed = false;
  run(s, { type: "attendance", booking: "b1", status: "missed" });
  assert.equal(s.children[0].balance, 2);
  s.settings.chargeMissed = true;
  run(s, { type: "attendance", booking: "b1", status: "missed" });
  assert.equal(s.children[0].balance, 1);
});
test("receipt can only be PDF/JPEG/PNG and restored copies validate", () => {
  let s = seed();
  assert.equal(validateState(s), true);
  assert.throws(() =>
    run(s, {
      type: "receipt",
      payment: "p1",
      receipt: { name: "x", data: "javascript:alert(1)" },
    }),
  );
  run(s, {
    type: "receipt",
    payment: "p1",
    receipt: { name: "test.pdf", data: "data:application/pdf;base64,JVBERg==" },
  });
  assert.equal(validateState(s), true);
  s.children[0].id = 'x" onclick="evil';
  assert.throws(() => validateState(s));
});

test("manual durations and separate lesson types persist and survive backup validation", () => {
  const s = seed();
  const lesson = {
    type: "lesson",
    title: "Ручная длительность",
    date: "2026-11-20",
    time: "14:00",
    capacity: 5,
    format: "Столярная мастерская",
    age: "7–10 лет",
  };
  run(s, { ...lesson, lessonType: "group", duration: 75 });
  assert.equal(s.lessons.at(-1).duration, 75);
  assert.equal(s.lessons.at(-1).lessonType, "group");
  assert.equal(s.lessons.at(-1).capacity, 5);
  run(s, { ...lesson, lessonType: "individual", duration: 45, capacity: 6 });
  assert.equal(s.lessons.at(-1).capacity, 1);
  assert.equal(s.lessons.at(-1).duration, 45);
  assert.equal(s.lessons.at(-1).lessonType, "individual");
  assert.equal(validateState(JSON.parse(JSON.stringify(s))), true);
  for (const duration of [0, -1, 2.5, 1441, ""])
    assert.throws(() => run(s, { ...lesson, duration }));
  assert.throws(() =>
    run(s, { ...lesson, duration: 45, lessonType: "unknown" }),
  );
  const broken = structuredClone(s);
  broken.lessons.at(-1).capacity = 2;
  assert.throws(() => validateState(broken));
  assert.equal(validateState(seed()), true);
});

const intake = {
  childName: "Саша Иванов",
  age: 8,
  parentName: "Иванова Анна Петровна",
  phone: "+7 (900) 123-45-67",
  email: "anna@example.test",
  messenger: "@anna",
  contactMethod: "telegram",
  contactTime: "После 18:00",
  lessonType: "individual",
  lesson: "",
  notes: "Первое знакомство",
  consent: true,
};
test("intake stores a pending request without enrolling or creating a family, then requires contact before approval", () => {
  const s = seed(),
    initial = s.children.length,
    booked = s.bookings.length;
  const result = submitApplication(s, intake, now);
  assert.equal(result.status, "pending");
  assert.equal(s.children.length, initial);
  assert.equal(s.bookings.length, booked);
  assert.equal(s.applications.length, 1);
  assert.throws(() => submitApplication(s, intake, now), /уже получена/);
  assert.throws(
    () => run(s, { type: "application_confirm", application: result.id }),
    /Сначала свяжитесь/,
  );
  assert.throws(
    () =>
      run(
        s,
        {
          type: "application_status",
          application: result.id,
          status: "contacted",
        },
        parent,
      ),
    /Только для мастера/,
  );
  run(s, {
    type: "application_status",
    application: result.id,
    status: "contacted",
  });
  run(s, { type: "application_confirm", application: result.id, lesson: "l5" });
  assert.equal(s.applications[0].status, "confirmed");
  const c = s.children.at(-1);
  assert.equal(c.name, intake.childName);
  assert.equal(c.email, intake.email);
  assert.equal(c.messenger, intake.messenger);
  assert.equal(c.balance, 0);
  assert.equal(s.bookings.at(-1).child, c.id);
  assert.equal(s.bookings.at(-1).lesson, "l5");
  assert.throws(() =>
    run(s, { type: "application_confirm", application: result.id }),
  );
  assert.equal(s.children.length, initial + 1);
  assert.equal(validateState(JSON.parse(JSON.stringify(s))), true);
  assert.deepEqual(familyView(s, "f1").applications, []);
  const legacy = seed();
  delete legacy.applications;
  assert.equal(validateState(legacy), true);
});

test("intake validates contacts and consent; confirming a full group creates no partial child", () => {
  for (const change of [
    { phone: "abc" },
    { phone: "123" },
    { email: "wrong" },
    { age: 2 },
    { age: 4.5 },
    { consent: false },
    { contactMethod: "telegram", messenger: "" },
    { lessonType: "wrong" },
    { notes: "x".repeat(501) },
  ])
    assert.throws(() =>
      submitApplication(seed(), { ...intake, ...change }, now),
    );
  const s = seed();
  const r = submitApplication(s, intake, now);
  run(s, {
    type: "application_status",
    application: r.id,
    status: "contacted",
  });
  s.lessons.find((l) => l.id === "l1").capacity = 5;
  const before = s.children.length;
  assert.throws(
    () =>
      run(s, { type: "application_confirm", application: r.id, lesson: "l1" }),
    /нет свободных мест/,
  );
  assert.equal(s.children.length, before);
  assert.equal(s.applications[0].status, "contacted");
  run(s, {
    type: "application_confirm",
    application: r.id,
    family: "f1",
    lesson: "",
  });
  assert.equal(s.children.at(-1).family, "f1");
  assert.equal(s.bookings.length, 11);
});
