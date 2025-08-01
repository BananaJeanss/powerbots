import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { modifyUserNotes, getUserNotes } from "#utils/modlogs.js";

export const data = new SlashCommandBuilder()
  .setName("note")
  .setDescription("Adds a note to a user")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("modify")
      .setDescription("Add or modify a user note")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to add or modify a note for")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("note")
          .setDescription("The content of the note")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("ephemeral")
          .setDescription(
            "Whether to make the response ephemeral (only visible to you), defaults to false"
          )
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("view")
      .setDescription("View a users note, if set")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to view the note for")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("ephemeral")
          .setDescription(
            "Whether to make the response ephemeral (only visible to you), defaults to false"
          )
          .setRequired(false)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers); // only allow mods to modify notes

export async function execute(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  const chosenSubcommand = interaction.options.getSubcommand();

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  switch (chosenSubcommand) {
    case "modify": {
      const user = interaction.options.getUser("user");
      const note = interaction.options.getString("note");

      // ensure the user is valid
      if (!user) {
        return interaction.editReply({
          content: "You must specify a valid user to add/modify a note for.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // note validation
      if (note.length > 512) {
        return interaction.editReply({
          content: "The note must be under 512 characters.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // modify the user note
      try {
        const success = await modifyUserNotes(interaction, user.id, note);

        if (success === false) {
          return interaction.editReply({
            content: "Failed to modify user notes. Please try again later.",
            flags: ephemeral ? MessageFlags.Ephemeral : undefined,
          });
        }
        const respEmbed = new EmbedBuilder()
          .setColor("#9b59b6")
          .setTitle(`Notes modified`)
          .setDescription(
            `Notes modified for **${user.tag}**\n\n**New notes:** ${note}`
          );
        await interaction.editReply({
          embeds: [respEmbed],
          flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      } catch (error) {
        console.error("Error modifying user notes:", error);
        await interaction.editReply({
          content: "Failed to modify user notes. Please try again later.",
          flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      }
      break;
    }
    case "view": {
      const user = interaction.options.getUser("user");

      // ensure the user is valid
      if (!user) {
        return interaction.editReply({
          content: "You must specify a valid user to view notes for.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // fetch the user's notes
      // despite the name it's actually singular
      try {
        const notes = await getUserNotes(
          interaction.client.db,
          interaction.guildId,
          user.id
        );
        let embedDesc;
        if (!notes) {
          embedDesc = "No notes found for this user.";
        } else {
          embedDesc = notes;
        }

        const respEmbed = new EmbedBuilder()
          .setColor("#9b59b6")
          .setTitle(`Notes for ${user.tag}`)
          .setDescription(embedDesc);

        await interaction.editReply({
          embeds: [respEmbed],
          flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      } catch (error) {
        console.error("Error fetching user notes:", error);
        await interaction.editReply({
          content: "Failed to fetch user notes. Please try again later.",
          flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      }
      break;
    }
    default:
      await interaction.editReply({
        content: "Invalid subcommand.",
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
      break;
  }
}
