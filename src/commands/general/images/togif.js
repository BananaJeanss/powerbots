import {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";

export const cooldown = 10;
export const data = new SlashCommandBuilder()
  .setName("togif")
  .setDescription("Converts an image to GIF format.")
  .addAttachmentOption((option) =>
    option
      .setName("image")
      .setDescription("The image to convert to a GIF")
      .setRequired(true)
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
  const attachment = interaction.options.getAttachment("image");

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  // make sure attachment is actually an image
  if (!attachment || !attachment.contentType.startsWith("image/")) {
    return interaction.editReply({
      content: "Please provide a valid image file.",
    });
  }

  try {
    // download image
    const response = await fetch(attachment.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // simply just change format to GIF
    const gifAttachment = new AttachmentBuilder(buffer, {
      name: "image.gif",
    });

    await interaction.editReply({
      files: [gifAttachment],
    });
  } catch (error) {
    console.error(error);
    return interaction.editReply({
      content: "There was an error processing your request.",
    });
  }
}
