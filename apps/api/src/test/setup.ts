process.env.NODE_ENV ??= "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/erp-test";
process.env.JWT_SECRET ??=
  "test-only-access-secret-at-least-32-characters-long";
process.env.JWT_REFRESH_SECRET ??=
  "test-only-refresh-secret-at-least-32-characters-long";
