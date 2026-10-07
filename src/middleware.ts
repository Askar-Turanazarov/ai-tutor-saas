import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // `\\.` — in a plain string `\.` is just `.`, and `.*.*` excluded every path, so server actions fell back to "ru".
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
