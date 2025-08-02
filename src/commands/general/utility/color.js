import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { createCanvas } from "canvas";
import Color from "color";
import { closest } from "color-2-name";

export const data = new SlashCommandBuilder()
  .setName("color")
  .setDescription("Get the info of a color")
  .addStringOption((option) =>
    option
      .setName("color")
      .setDescription(
        "The color to get info about (hex (#ffffff) or rgb (255, 255, 255))"
      )
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
  const colorInput = interaction.options.getString("color").trim();

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    // validate that the input is a valid color
    let color;
    // hex check
    if (/^#([0-9A-Fa-f]{3})$/.test(colorInput)) {
      // expand 3-digit hex to 6-digit, otherwise it errors
      color =
        "#" +
        colorInput
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("");
    } else if (/^#([0-9A-Fa-f]{6})$/.test(colorInput)) {
      color = colorInput;
    } else if (/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(colorInput)) {
      // rgb check
      const rgbValues = colorInput
        .split(",")
        .map((v) => parseInt(v.trim(), 10));
      if (rgbValues.some((v) => v < 0 || v > 255)) {
        await interaction.editReply({
          content: "RGB values must be between 0 and 255.",
          flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
        return;
      }
      color = `#${rgbValues
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")}`;
    } else {
      await interaction.editReply({
        content: "Please provide a valid color in hex or rgb format.",
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
      return;
    }

    // get other color info
    let HSL;
    try {
      const colorObj = new Color(color);
      HSL = colorObj.hsl().string();
    } catch (error) {
      console.error("Error processing color:", error);
      HSL = "N/A";
    }
    let HSV;
    try {
      const colorObj = new Color(color);
      HSV = colorObj.hsv().string();
    } catch (error) {
      console.error("Error processing color:", error);
      HSV = "N/A";
    }
    let CMYK;
    try {
      const colorObj = new Color(color);
      CMYK = colorObj.cmyk().string();
    } catch (error) {
      console.error("Error processing color:", error);
      CMYK = "N/A";
    }
    let closestName;
    try {
      closestName = closest(color);
      if (Array.isArray(closestName)) {
        closestName = closestName.join(", ");
      } else if (typeof closestName === "object" && closestName !== null) {
        // make sure it's a string
        closestName = closestName.name || JSON.stringify(closestName);
      }
      if (!closestName || typeof closestName !== "string") {
        closestName = "N/A";
      }
    } catch (error) {
      console.error("Error finding closest color name:", error);
      closestName = "N/A";
    }

    // square thingy to display the color
    const canvas = createCanvas(100, 100);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // create an attachment from the canvas
    const squarething = canvas.toBuffer("image/png");

    const attachment = new AttachmentBuilder(squarething, {
      name: "color_square.png",
    });

    // and embed
    const respEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Color Information")
      .setThumbnail("attachment://color_square.png")
      .addFields(
        { name: "Hex", value: color, inline: true },
        {
          name: "RGB",
          value: `${parseInt(color.slice(1, 3), 16)}, ${parseInt(
            color.slice(3, 5),
            16
          )}, ${parseInt(color.slice(5, 7), 16)}`,
          inline: true,
        },
        { name: "HSL", value: HSL, inline: true },
        { name: "HSV", value: HSV, inline: true },
        { name: "CMYK", value: CMYK, inline: true },
        { name: "Closest Name", value: closestName, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [respEmbed],
      files: [attachment],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error processing color command:", error);
    await interaction.editReply({
      content: "An error occurred while processing your request.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
