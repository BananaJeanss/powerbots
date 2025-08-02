import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { startExpressSite } from "./site/express.js";

// env file config
config();
const token = process.env.DISCORD_BOT_TOKEN;
const SITE_ENABLED = process.env.SITE_ENABLED === "true";

// mongodb setup
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const mongoClient = new MongoClient(mongoUri);

await mongoClient.connect();
const db = mongoClient.db("powerbots");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});
client.db = db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

client.commands = new Collection();
client.cooldowns = new Collection();

function getAllCommandFiles(dir) {
  let results = [];
  const list = readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllCommandFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const foldersPath = join(__dirname, "commands");
const commandFiles = getAllCommandFiles(foldersPath);

for (const filePath of commandFiles) {
  const command = await import(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const eventModule = await import(filePath);
  const event = eventModule.default || eventModule;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(token);

if (SITE_ENABLED) {
  startExpressSite();
}
