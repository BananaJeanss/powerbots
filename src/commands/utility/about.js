import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Shows information about the bot.")
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether the response should be ephemeral (only visible to you)"
      )
      .setRequired(false)
  );
export async function execute(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") || false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.ephemeral : undefined,
  });

  // and embed
  try {
    let uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    let serverCount = interaction.client.guilds.cache.size;

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("PowerBots")
      .setThumbnail(
        "https://github.com/BananaJeanss/powerbots/blob/main/src/site/public/logo.png?raw=true"
      )
      .setDescription("A simple, yet powerful discord bot.")
      .addFields(
        {
          name: "Bot Invite",
          value:
            "[Invite](https://discord.com/oauth2/authorize?client_id=1397525248202637312)",
          inline: true,
        },
        {
          name: "Support/Test Server",
          value: "[Join Here](https://discord.gg/jKSrkhSG4V)",
          inline: true,
        },
        {
          name: "Commands List",
          value:
            "[View Commands](https://github.com/BananaJeanss/powerbots/blob/main/commands.md)",
          inline: true,
        },
        {
          name: "GitHub",
          value: "[View on GitHub](https://github.com/BananaJeanss/powerbots)",
          inline: true,
        },
        { name: "Server Count", value: serverCount.toString(), inline: true }
      )
      .setFooter({ text: `Uptime: ${uptime}` })
      .setTimestamp();

    return interaction.editReply({
      embeds: [embed],
      flags: ephemeral ? MessageFlags.ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error creating embed:", error);
    return interaction.editReply({
      content: "An error occurred.",
      flags: ephemeral ? MessageFlags.ephemeral : undefined,
    });
  }
}
