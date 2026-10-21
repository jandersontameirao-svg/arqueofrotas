const isolatedUrl = process.env.FLEET_TEST_DATABASE_URL;

if (!isolatedUrl) {
  // Unit tests must never fall back to an injected development or production URL.
  delete process.env.DATABASE_URL;
} else {
  const parsed = new URL(isolatedUrl);
  const socketPath = parsed.searchParams.get("socketPath");
  if (
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.pathname !== "/arqueofrotas_test" ||
    socketPath !== "/workspace/test-db.sock"
  ) {
    throw new Error(
      "Database tests require FLEET_TEST_DATABASE_URL for local arqueofrotas_test via /workspace/test-db.sock"
    );
  }

  process.env.DATABASE_URL = isolatedUrl;
}
