const Sentry = require("@sentry/node");

Sentry.init({
  // SENTRY_DSN, SENTRY_ENVIRONMENT y SENTRY_RELEASE se configuran en Render.
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || "dev",
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 1),
});
