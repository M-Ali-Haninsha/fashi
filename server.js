const mongoose = require("mongoose");
const { MongoStore } = require("connect-mongo");
const config = require("./config/env");
const { createApp } = require("./app");

async function start() {
  await mongoose.connect(config.databaseUrl);
  console.log("Database connected");

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "sessions",
    ttl: 24 * 60 * 60,
  });

  createApp({ sessionStore }).listen(config.port, () => {
    console.log(`Fashi is running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
