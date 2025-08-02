import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("commands")
  .setDescription("Shows a list of basic commands.")
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
    flags: ephemeral ? MessageFlags.Ephemeral : 0,
  });

  // and embed
  try {
    const embed = new EmbedBuilder()
      .setTitle("Basic Commands")
      .setColor("#0099ff")
      .addFields(
        {
          name: "/about",
          value: "Shows basic info about the bot.",
          inline: true,
        },
        {
          name: "/serverinfo",
          value: "Displays information about the server.",
          inline: true,
        },
        {
          name: "/whois",
          value: "Shows information about a user.",
          inline: true,
        },
        {
          name: "/8ball",
          value:
            "Ask the magic 8-ball a question, and your fate will be revealed.",
          inline: true,
        },
        { name: "/coinflip", value: "Flips a coin.", inline: true },
        {
          name: "/github",
          value: "Get information about a user, or a repo.",
          inline: true,
        },
        {
          name: "/npm",
          value: "Get information about a package.",
          inline: true,
        },
        {
          name: "/deepfry",
          value: "Deepfry an image, self explanatory.",
          inline: true,
        },
        { name: "/pixelate", value: "Pixelate an image.", inline: true },
        {
          name: "\u200B",
          value:
            "More commands can be found in the [commands.md](https://github.com/BananaJeanss/powerbots/blob/main/commands.md) file.",
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error sending commands embed:", error);
    await interaction.editReply({
      content: "An error occurred while trying to display the commands.",
      flags: ephemeral ? MessageFlags.Ephemeral : 0,
    });
  }
}
