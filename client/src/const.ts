export const startLogin = (returnTo?: string) => {
  const requestedPath = returnTo ?? `${window.location.pathname}${window.location.search}`;
  const safePath = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/";
  const accountUrl = new URL("/account", window.location.origin);

  if (safePath !== "/account") accountUrl.searchParams.set("next", safePath);
  window.location.assign(accountUrl.toString());
};
