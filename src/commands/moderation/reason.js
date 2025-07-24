import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { modifyModlogReason } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("reason")
  .setDescription("Change the reason for a moderation action")
  .addStringOption((option) =>
    option
      .setName("case")
      .setDescription("The case of the moderation action")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The new reason for the moderation action")
      .setRequired(true)
  )
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether to make the response ephemeral (only visible to you), defaults to false"
      )
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);
export async function execute(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  const id = interaction.options.getString("case");
  const reason = interaction.options.getString("reason");

  // convert id to number before passing to modifyModlogReason
  const success = await modifyModlogReason(interaction, Number(id), reason);

  var description;
  if (success) {
    description = "The reason for this moderation action has been updated.";
    description += `\n\n**New Reason:** ${reason}`;
  } else {
    description = "Failed to update the reason. The case ID may not exist.";
  }
  const responseEmbed = new EmbedBuilder()
    .setColor(success ? 0x00ff00 : 0xff0000)
    .setTitle(
      success ? `Case ${id} | Reason Updated` : "Failed to Update Reason"
    )
    .setDescription(description)
    .setTimestamp();
  await interaction.editReply({
    embeds: [responseEmbed],
  });
}
