function parseUser(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

export function getStoredUser() {
  const sessionUser = parseUser(sessionStorage.getItem("user"));
  if (sessionUser) return sessionUser;

  // Backward compatibility: migrate legacy localStorage auth into tab-scoped session storage.
  const localUser = parseUser(localStorage.getItem("user"));
  if (localUser) {
    sessionStorage.setItem("user", JSON.stringify(localUser));
    localStorage.removeItem("user");
    return localUser;
  }

  return null;
}

export function setStoredUser(user) {
  sessionStorage.setItem("user", JSON.stringify(user));
  // Keep auth tab-scoped so two tabs can use different accounts.
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearStoredUser() {
  sessionStorage.removeItem("user");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
}
