if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    console.error("DATABASE_URL must point to the durable SQLite file in production.");
    process.exit(1);
  }

  // Keep the existing Prisma default for local development and tests.
  process.env.DATABASE_URL = "file:dev.sqlite";
}
