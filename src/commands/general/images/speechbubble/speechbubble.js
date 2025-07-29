import {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const cooldown = 10;
export const data = new SlashCommandBuilder()
  .setName("speechbubble")
  .setDescription("Adds a speech bubble to an image")
  .addAttachmentOption((option) =>
    option
      .setName("image")
      .setDescription("The image to add a speech bubble to")
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

    // load speech bubble image
    const speechBubblePath = join(__dirname, "speech.png");
    const speechBubble = await loadImage(speechBubblePath);

    const bubbleWidth = canvas.width;
    const bubbleAspect = speechBubble.width / speechBubble.height;
    let bubbleHeight = bubbleWidth / bubbleAspect;
    const maxBubbleHeight = canvas.height * 0.25;
    if (bubbleHeight > maxBubbleHeight) {
      bubbleHeight = maxBubbleHeight;
    }

    // center bubble horizontally at top
    const bubbleX = 0;
    const bubbleY = 0;

    ctx.drawImage(speechBubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

    // output image
    const outBuffer = canvas.toBuffer("image/png");
    const resultAttachment = new AttachmentBuilder(outBuffer, {
      name: "speechbubble.png",
    });

    await interaction.editReply({
      files: [resultAttachment],
    });
  } catch (error) {
    console.error(error);
    return interaction.editReply({
      content: "There was an error processing your request.",
    });
  }
}
