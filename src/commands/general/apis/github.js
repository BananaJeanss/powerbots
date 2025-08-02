import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("github")
  .setDescription("Get info from GitHub")
  .addSubcommandGroup((group) =>
    group
      .setName("get")
      .setDescription("Get information from GitHub")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("user")
          .setDescription("Get information about a GitHub user")
          .addStringOption((option) =>
            option
              .setName("username")
              .setDescription("The GitHub username to get info about")
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
          .setName("repo")
          .setDescription("Get information about a GitHub repository")
          .addStringOption((option) =>
            option
              .setName("repository")
              .setDescription(
                "The GitHub repository to get info about (owner/repo)"
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
          )
      )
  );
  
export const cooldown = 10;

export async function execute(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  const subcommand =
    interaction.options.getSubcommandGroup() ||
    interaction.options.getSubcommand();

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    switch (subcommand) {
      case "get":
        const getSubcommand = interaction.options.getSubcommand();
        switch (getSubcommand) {
          case "user": {
            const username = interaction.options.getString("username").trim();
            const response = await fetch(
              `https://api.github.com/users/${username}`
            );
            if (!response.ok) {
              return interaction.editReply({
                content: `User not found: ${username}`,
                flags: ephemeral ? MessageFlags.Ephemeral : undefined,
              });
            }
            const userData = await response.json();
            let starsEarned = await fetch(
              "https://api.github-star-counter.workers.dev/user/" +
                userData.login
            );
            starsEarned = await starsEarned.json();
            const stars = starsEarned.stars || 0;
            const forks = starsEarned.forks || 0;

            const respEmbed = new EmbedBuilder()
              .setColor("#24292e")
              .setTitle(userData.login)
              .setURL(userData.html_url)
              .setThumbnail(userData.avatar_url)
              .addFields(
                {
                  name: "Name",
                  value: userData.name || "N/A",
                  inline: true,
                },
                {
                  name: "Followers",
                  value: `[${userData.followers}](https://github.com/${userData.login}?tab=followers)`,
                  inline: true,
                },
                {
                  name: "Following",
                  value: `[${userData.following}](https://github.com/${userData.login}?tab=following)`,
                  inline: true,
                },
                {
                  name: "Public Repositories",
                  value: `[${userData.public_repos}](https://github.com/${userData.login}?tab=repositories)`,
                  inline: true,
                },
                {
                  name: "Stars Earned",
                  value: stars.toString(),
                  inline: true,
                },
                {
                  name: "Forks",
                  value: forks.toString(),
                  inline: true,
                },
                { name: "Bio", value: userData.bio || "N/A", inline: false },
                {
                  name: "Joined on",
                  value: new Date(userData.created_at).toLocaleDateString(),
                }
              )
              .setFooter({ text: `ID: ${userData.id}` })
              .setTimestamp();

            await interaction.editReply({
              embeds: [respEmbed],
              flags: ephemeral ? MessageFlags.Ephemeral : undefined,
            });
            break;
          }
          case "repo": {
            const repo = interaction.options.getString("repository").trim();

            // validate repo
            if (!/^[^/]+\/[^/]+$/.test(repo)) {
              return interaction.editReply({
                content:
                  "Please provide the repository in the format `owner/repo`.",
                flags: ephemeral ? MessageFlags.Ephemeral : undefined,
              });
            }

            const response = await fetch(
              `https://api.github.com/repos/${repo}`
            );
            if (!response.ok) {
              return interaction.editReply({
                content: `Repository not found: ${repo}`,
                flags: ephemeral ? MessageFlags.Ephemeral : undefined,
              });
            }
            const repoData = await response.json();
            let fields = [
              {
                name: "Stars",
                value: repoData.stargazers_count.toString(),
                inline: true,
              },
              {
                name: "Forks",
                value: repoData.forks_count.toString(),
                inline: true,
              },
              {
                name: "Repository Size",
                value: `${(repoData.size / 1024).toFixed(2)} MB`,
                inline: true,
              },
            ];
            // if issues are enabled, push
            if (repoData.has_issues) {
              fields.push({
                name: "Open Issues",
                value: repoData.open_issues_count.toString(),
                inline: true,
              });
            }
            // if last push available, push
            if (repoData.pushed_at) {
              fields.push({
                name: "Last Push",
                value: new Date(repoData.pushed_at).toLocaleDateString(),
                inline: true,
              });
            }
            // if license available, push
            if (repoData.license) {
              fields.push({
                name: "License",
                value: repoData.license.name,
                inline: true,
              });
            }
            // if homepage available, push
            if (repoData.homepage) {
              fields.push({
                name: "Homepage",
                value: `[Link](${repoData.homepage})`,
                inline: false,
              });
            }
            // if topics available, push
            if (repoData.topics && repoData.topics.length > 0) {
              fields.push({
                name: "Topics",
                value: repoData.topics.join(", "),
                inline: false,
              });
            }
            // if repo archived, push
            if (repoData.archived) {
              fields.push({
                name: "Archived",
                value: "Yes",
                inline: true,
              });
            }

            const respEmbed = new EmbedBuilder()
              .setColor("#24292e")
              .setTitle(repoData.full_name)
              .setURL(repoData.html_url)
              .setThumbnail(repoData.owner.avatar_url)
              .setDescription(
                repoData.description || "No description available."
              )
              .addFields(fields)
              .setFooter({
                text: `Created at: ${new Date(
                  repoData.created_at
                ).toLocaleDateString()}`,
              })
              .setTimestamp();

            await interaction.editReply({
              embeds: [respEmbed],
              flags: ephemeral ? MessageFlags.Ephemeral : undefined,
            });
            break;
          }
          default:
            return interaction.editReply({
              content: "Invalid subcommand.",
              flags: ephemeral ? MessageFlags.Ephemeral : undefined,
            });
        }
        break;
      default:
        return interaction.editReply({
          content: "Invalid command.",
          flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
    }
  } catch (error) {
    console.error("Error executing GitHub command:", error);
    await interaction.editReply({
      content: "An error occurred while executing the command.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
