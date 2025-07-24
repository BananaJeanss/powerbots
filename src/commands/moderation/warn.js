import { addModlog } from "#utils/modlogs.js";
import {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warns a user")
  .addUserOption((option) =>
    option.setName("user").setDescription("The user to warn").setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("The reason for the warning")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("dm")
      .setDescription(
        "Whether to send the warning to the target via DM, defaults to true"
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
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers); // only allow mods
export async function execute(interaction) {
  const targetUser = interaction.options.getUser("user");
  const reason =
    interaction.options.getString("reason") || "No reason provided";
  const sendDM = interaction.options.getBoolean("dm") !== false; // default to true if not specified
  const ephemeral = interaction.options.getBoolean("ephemeral") === true;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // check if the target user is not a mod+
  if (
    interaction.guild.members.cache
      .get(targetUser.id)
      .permissions.has(PermissionsBitField.Flags.ModerateMembers)
  ) {
    return interaction.editReply({
      content: "You cannot warn a user with moderation permissions.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // check if the target user is not the bot itself
  if (targetUser.id === interaction.client.user.id) {
    return interaction.editReply({
      content: "You cannot warn the bot itself.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // check if the target user is not the command invoker
  if (targetUser.id === interaction.user.id) {
    return interaction.editReply({
      content: "You cannot warn yourself.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // warn the user
  await addModlog(
    interaction, // pass the interaction, not interaction.guild
    "Warning",
    targetUser,
    interaction.user,
    reason
  );

  var couldDm = false;
  // and optionally send the target a dm
  if (sendDM) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("You have been warned")
        .setDescription(
          `You have been warned in **${interaction.guild.name}** for: ${reason}`
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      couldDm = true;
    } catch (error) {
      if (error.code === 50007) {
        // do nothing
      } else {
        console.warn(`Failed to send DM to ${targetUser.tag}:`);
        console.warn(error);
      }
    }
  }

  let description = `**${targetUser.tag}** has been warned for: ${reason}`;
  if (!couldDm && sendDM) {
    description += "\n\n*Note: Could not DM the user about this warning.*";
  }
  const warningEmbed = new EmbedBuilder()
    .setColor("#FFA500")
    .setTitle("User Warned")
    .setDescription(description)
    .setTimestamp();

  interaction.editReply({
    embeds: [warningEmbed],
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
}
