import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("togglefiltercommands")
  .setDescription(
    "Toggles if command inputs should be filtered for profanity, e.g. 8ball questions and such."
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("toggle")
      .setDescription("Toggles the filter for command inputs.")
      .addBooleanOption((option) =>
        option.setName("toggle").setDescription("Enable or disable the filter.")
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("info")
      .setDescription("Checks the current status of the filter.")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // only allow admins
export async function execute(interaction) {
  // defer reply
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // get the subcommand
    const subcommand = interaction.options.getSubcommand();

    const db = interaction.client.db;
    const guildId = interaction.guildId;
    if (subcommand === "toggle") {
      const toggle = interaction.options.getBoolean("toggle");
      await db
        .collection("guilds")
        .updateOne(
          { guild_id: guildId },
          { $set: { "filters.profanity": toggle } },
          { upsert: true }
        );
      await interaction.editReply({
        content: `Profanity filter has been ${
          toggle ? "enabled" : "disabled"
        }.`,
      });
    } else if (subcommand === "info") {
      const settings = await db
        .collection("guilds")
        .findOne({ guild_id: guildId });
      const isEnabled = settings?.filters?.profanity ?? false;
      await interaction.editReply({
        content: `Profanity filter is currently ${
          isEnabled ? "enabled" : "disabled"
        }.`,
      });
    } else {
      await interaction.editReply({
        content: "Invalid subcommand",
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error("Error executing toggleFilterCommands:", error);
    await interaction.editReply({
      content: "An error occurred while processing your request.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
