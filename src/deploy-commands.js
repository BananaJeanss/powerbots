import { REST, Routes } from "discord.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config();
const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_APP_ID;

const commands = [];

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

const rest = new REST().setToken(token);

// Deploy the commands
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // Refreshes all commands
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
