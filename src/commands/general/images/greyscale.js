import {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";

export const data = new SlashCommandBuilder()
  .setName("greyscale")
  .setDescription("Converts an image to greyscale")
  .addAttachmentOption((option) =>
    option
      .setName("image")
      .setDescription("The image to convert to greyscale")
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

    // for each pixel, convert to greyscale
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = gray; // red
      data[i + 1] = gray; // green
      data[i + 2] = gray; // blue
    }

    ctx.putImageData(imageData, 0, 0);

    // and output image
    const outBuffer = canvas.toBuffer("image/png");

    const resultAttachment = new AttachmentBuilder(outBuffer, {
      name: "greyscale.png",
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
