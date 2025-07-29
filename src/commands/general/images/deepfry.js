import {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
export const cooldown = 10;
export const data = new SlashCommandBuilder()
  .setName("deepfry")
  .setDescription("Deepfry an image")
  .addAttachmentOption((option) =>
    option
      .setName("image")
      .setDescription("The image to deepfry")
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

    // deepfry
    for (let i = 0; i < data.length; i += 4) {
      // start by increasing contrast
      const contrast = 3;
      data[i] = (data[i] - 128) * contrast + 128; // red
      data[i + 1] = (data[i + 1] - 128) * contrast + 128; // green
      data[i + 2] = (data[i + 2] - 128) * contrast + 128; // blue

      // add noise
      const noise = (Math.random() - 0.5) * 60;
      data[i] += noise; // red
      data[i + 1] += noise; // green
      data[i + 2] += noise; // blue

      // clamp
      data[i] = Math.min(Math.max(data[i], 0), 255);
      data[i + 1] = Math.min(Math.max(data[i + 1], 0), 255);
      data[i + 2] = Math.min(Math.max(data[i + 2], 0), 255);

      // increase saturation
      const saturation = 3;
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg + (data[i] - avg) * saturation; // red
      data[i + 1] = avg + (data[i + 1] - avg) * saturation; // green
      data[i + 2] = avg + (data[i + 2] - avg) * saturation; // blue

      // increase brightness
      // not too much, otherwise looks washed out
      const sharpness = 50;
      data[i] = Math.min(data[i] + sharpness, 255); // red
      data[i + 1] = Math.min(data[i + 1] + sharpness, 255); // green
      data[i + 2] = Math.min(data[i + 2] + sharpness, 255); // blue

      // red+orange tint
      const redTint = 30;
      data[i] = Math.min(data[i] + redTint, 255); // red
      data[i + 1] = Math.min(data[i + 1] + 15, 255); // green
    }

    // posterizer
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / 32) * 32;
      data[i + 1] = Math.round(data[i + 1] / 32) * 32;
      data[i + 2] = Math.round(data[i + 2] / 32) * 32;
    }

    ctx.putImageData(imageData, 0, 0);

    // downscale and then upscale for pixelation
    const scale = 0.75;
    let tempCanvas = canvas;
    for (let i = 0; i < 2; i++) {
      const downCanvas = createCanvas(
        tempCanvas.width * scale,
        tempCanvas.height * scale
      );
      // downscale
      const downCtx = downCanvas.getContext("2d");
      downCtx.drawImage(tempCanvas, 0, 0, downCanvas.width, downCanvas.height);

      // upscale
      const upCanvas = createCanvas(canvas.width, canvas.height);
      const upCtx = upCanvas.getContext("2d");
      upCtx.drawImage(downCanvas, 0, 0, upCanvas.width, upCanvas.height);

      tempCanvas = upCanvas;
    }

    // Draw pixelated result back to main canvas
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

    // Output
    const outBuffer = canvas.toBuffer("image/png");

    const resultAttachment = new AttachmentBuilder(outBuffer, {
      name: "deepfried.png",
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
