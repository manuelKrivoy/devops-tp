// DD_API_KEY, DD_SITE, DD_SERVICE, DD_ENV y DD_VERSION se configuran en Render.
require("dd-trace").init({
  service: process.env.DD_SERVICE || "book-library-api",
  env: process.env.DD_ENV || "production",
  version: process.env.DD_VERSION || process.env.RENDER_GIT_COMMIT || "dev",
  logInjection: true,
});
