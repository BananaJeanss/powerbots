import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Gets the avatar of a user, defaults to you")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user to get the avatar of")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("ephemeral")
      .setDescription(
        "Whether to make the response ephemeral (only visible to you), defaults to false"
      )
      .setRequired(false)
  );
export async function execute(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  let user = interaction.options.getUser("user") || interaction.user;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    // fetch the user's avatar
    const avatarUrl = user.displayAvatarURL({ size: 1024, extension: "png" });
    const attachment = new AttachmentBuilder(avatarUrl, {
      name: `${user.username}_avatar.png`,
    });

    // and send the avatar as a reply
    await interaction.editReply({
      content: `${user.username}'s avatar`,
      files: [attachment],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error fetching avatar:", error);
    await interaction.editReply({
      content:
        "There was an error fetching the avatar. Please try again later.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
