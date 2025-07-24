import { deleteModlog, findLogByCase } from "#utils/modlogs.js";
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("unwarn")
  .setDescription("Removes a warning from a user")
  .addIntegerOption((option) =>
    option
      .setName("case")
      .setDescription("The case to remove the warning from")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for removing the warning")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("dm")
      .setDescription(
        "Whether to send the warning removal notification to the user via DM, defaults to true"
      )
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether to make the response ephemeral (only visible to you), defaults to false"
      )
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers); // only allow mods
export async function execute(interaction) {
  const caseNumber = interaction.options.getInteger("case");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const dm = interaction.options.getBoolean("dm") ?? true;
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  const caseLog = await findLogByCase(
    interaction.client.db,
    interaction.guildId,
    caseNumber
  );

  // confirm case log exists and is a warning
  if (!caseLog || caseLog.action !== "Warning") {
    return interaction.editReply({
      content: `No warning found with case number \`${caseNumber}\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // find the user associated with the case
  const user = await interaction.client.users
    .fetch(caseLog.user_id)
    .catch(() => null);
  if (!user) {
    return interaction.editReply({
      content: `No user found for case number \`${caseNumber}\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const member = await interaction.guild.members
    .fetch(user.id)
    .catch(() => null);

  // run role checks if member is still in the guild
  if (member) {
    if (
      member.roles.highest.position >=
        interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.editReply({
        content:
          "You cannot remove a warning from a user with an equal or higher role than yourself.",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (
      member.roles.highest.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.editReply({
        content:
          "I cannot remove the warning because this user's role is higher or equal to my highest role.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // self, bot, owner checks
  if (user.id === interaction.user.id) {
    return interaction.editReply({
      content: "You cannot remove your own warning.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.client.user.id) {
    return interaction.editReply({
      content: "You cannot remove the bot's warning.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (user.id === interaction.guild.ownerId) {
    return interaction.editReply({
      content: "You cannot remove the server owner's warning.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await deleteModlog(interaction, caseNumber, reason);
  } catch (error) {
    console.error("Failed to remove warning:", error);
    return interaction.editReply({
      content: "Failed to remove the warning. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }

  let couldDm = false;
  if (dm) {
    try {
      await user.send(
        `Your warning has been removed in **${interaction.guild.name}**.\nReason: ${reason}`
      );
      couldDm = true;
    } catch (error) {
      if (error.code === 50007) {
        // user has DMs disabled
      } else {
        console.error("Failed to send DM:", error);
      }
    }
  }

  let description = `Successfully removed warning from **${user.tag}**.`;
  if (reason) {
    description += `\n\nReason: ${reason}`;
  }
  if (dm && !couldDm) {
    description += `\n\n*Note: Could not DM the user about this warning.*`;
  }
  const respEmbed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("Warning Removed")
    .setDescription(description)
    .setTimestamp();

  await interaction.editReply({
    embeds: [respEmbed],
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
}
