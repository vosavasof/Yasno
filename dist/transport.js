// Static hosting can serve index.html with status 200 for an unknown API path.
// Only a valid JSON session enables server mode.
export async function detectSession(fetcher = fetch) {
  const response = await fetcher("/api/session", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw Error("Сервер временно недоступен. Попробуйте ещё раз.");
  if (
    !response.headers
      ?.get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    return null;
  const session = await readJson(response);
  if (
    !session ||
    !Object.hasOwn(session, "role") ||
    ![null, "master", "parent"].includes(session.role)
  )
    throw Error("Сервер вернул некорректный ответ.");
  return session;
}
export async function readJson(response) {
  if (
    !response.headers
      ?.get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw Error(
      "Сервер не вернул данные приложения. Обновите страницу или повторите позже.",
    );
  try {
    return await response.json();
  } catch {
    throw Error("Не удалось прочитать ответ сервера. Повторите позже.");
  }
}
