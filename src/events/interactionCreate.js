import { Events, MessageFlags, Collection, EmbedBuilder } from "discord.js";

// build embed for logging
const buildLogEmbed = (userPfp, username, commandName, timestamp, channelName) => {
  return new EmbedBuilder()
    .setColor("#0099ff")
    .setAuthor({
      name: username,
      iconURL: userPfp,
    })
    .setDescription(`Ran command \`${commandName}\` in \`#${channelName}\``)
    .setTimestamp(timestamp);
};

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) return;
  console.log(`>> ${interaction.commandName} from ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name} (${interaction.guild.id}) at ${new Date().toISOString()}`);

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  // check if command is enabled for this guild
  const db = interaction.client.db;
  const guildId = interaction.guildId;
  const commandName = interaction.commandName;
  const settings = await db
    .collection("guildCommands")
    .findOne({ guild_id: guildId });
  if (settings && settings.disabled_commands?.includes(commandName)) {
    return interaction.reply({
      content: `The \`${commandName}\` command is disabled in this server.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const { cooldowns } = interaction.client;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 3;
  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1_000);
      return interaction.reply({
        content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction);

    // additionaly log in servers log channel if logging enabled
    const settings = await db.collection("guildLogs").findOne({ guild_id: guildId });
    if (settings && settings.logging_enabled && settings.log_channel) {
      const logChannel = interaction.guild.channels.cache.get(settings.log_channel);
      if (logChannel && logChannel.isTextBased()) {
          logChannel.send({
            embeds: [buildLogEmbed(
              interaction.user.displayAvatarURL({ dynamic: true }),
              interaction.user.tag,
              command.data.name,
              new Date(),
              interaction.channel.name
            )]
          }).catch(console.error);
      } else {
        console.log(`Log channel not found or not text-based for guild ${guildId}.`);
      }
    }
  } catch (error) {
    console.error(error);
    // only reply if interaction is still valid
    if (error.code === 10062) {
      return;
    }
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      if (err.code !== 10062) console.error(err);
    }
  }
}
