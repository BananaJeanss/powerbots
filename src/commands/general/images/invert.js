import {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";

export const data = new SlashCommandBuilder()
  .setName("invert")
  .setDescription("Inverts the colors of an image")
  .addAttachmentOption((option) =>
    option
      .setName("image")
      .setDescription("The image to invert colors")
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

    // load onto canvas
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // invert colors
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // red
      data[i + 1] = 255 - data[i + 1]; // green
      data[i + 2] = 255 - data[i + 2]; // blue
    }

    ctx.putImageData(imageData, 0, 0);

    // and output image
    const outBuffer = canvas.toBuffer("image/png");

    const resultAttachment = new AttachmentBuilder(outBuffer, {
      name: "inverted.png",
    });

    await interaction.editReply({
      files: [resultAttachment],
    });
  } catch (err) {
    console.error(err);
    await interaction.editReply({
      content: "Failed to process the image.",
    });
  }
}
