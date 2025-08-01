import {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
export const cooldown = 10;
export const data = new SlashCommandBuilder()
  .setName("pixelate")
  .setDescription("Pixelates an image")
  .addAttachmentOption((option) =>
    option
      .setName("image")
      .setDescription("The image to pixelate")
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName("pixelation")
      .setDescription(
        "Pixelation level, defaults to 100 (less is more pixelated) (1-200)"
      )
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(200)
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
  const pixelation = interaction.options.getNumber("pixelation") ?? 100;

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

  // validate pixelation level
  if (pixelation < 1 || pixelation > 200) {
    return interaction.editReply({
      content: "Please provide a pixelation level between 1 and 200.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
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

    // pixelate the image
    const pixelSize = Math.max(
      1,
      Math.floor(Math.min(canvas.width, canvas.height) / pixelation)
    );
    for (let y = 0; y < canvas.height; y += pixelSize) {
      for (let x = 0; x < canvas.width; x += pixelSize) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // fill the block with the average color
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }

    // and output image
    const outputBuffer = canvas.toBuffer("image/png");

    const resultAttachment = new AttachmentBuilder(outputBuffer, {
      name: "pixelated.png",
    });

    await interaction.editReply({
      files: [resultAttachment],
    });
  } catch (err) {
    console.error("Error pixelating image:", err);
    await interaction.editReply({
      content: "Failed to pixelate the image.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
