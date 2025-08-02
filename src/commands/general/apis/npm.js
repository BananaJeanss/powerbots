import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("npm")
  .setDescription("Get info about a npm package")
  .addStringOption((option) =>
    option
      .setName("package")
      .setDescription("The name of the npm package")
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
  const packageName = interaction.options.getString("package").trim();
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

  // defer reply
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });

  try {
    // fetch package info from npm registry
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!response.ok) {
      return interaction.editReply({
        content: `Package not found: ${packageName}`,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }
    const packageData = await response.json();

    // and embed
    let fields = [
      {
        name: "Version",
        value: packageData["dist-tags"].latest,
        inline: true,
      },
      {
        name: "Author",
        value: packageData.author ? packageData.author.name : "Unknown",
        inline: true,
      },
      {
        name: "Unpacked Size",
        value: (() => {
          const size =
            packageData.versions[packageData["dist-tags"].latest].dist
              .unpackedSize;
          if (!size) return "Unknown";
          if (size >= 1024 * 1024)
            return `${(size / (1024 * 1024)).toFixed(2)} MB`;
          if (size >= 1024) return `${(size / 1024).toFixed(2)} KB`;
          return `${size} B`;
        })(),
        inline: true,
      },
      {
        name: "License",
        value: packageData.license || "Unknown",
        inline: true,
      },
      {
        name: "Last Publish",
        value:
          `<t:${Math.floor(
            new Date(packageData.time.modified).getTime() / 1000
          )}:R>` || "Unknown",
        inline: true,
      },
    ];

    // fetch weekly downloads
    let weeklyDownloads = "Unknown";
    try {
      const downloadsRes = await fetch(
        `https://api.npmjs.org/downloads/point/last-week/${packageName}`
      );
      if (downloadsRes.ok) {
        const downloadsData = await downloadsRes.json();
        weeklyDownloads = downloadsData.downloads
          ? downloadsData.downloads.toLocaleString()
          : "Unknown";
      }
      fields.push({
        name: "Weekly Downloads",
        value: weeklyDownloads,
        inline: true,
      });
    } catch (e) {
      // ignore
    }

    // if repo available, push
    if (packageData.repository) {
      // remove the git+ prefix
      const repoUrl = packageData.repository.url.replace(/^git\+/, "");
      fields.push({
        name: "Repository",
        value: repoUrl || "No repository available",
        inline: false,
      });
    }
    // if homepage available, push
    if (packageData.homepage) {
      fields.push({
        name: "Homepage",
        value: packageData.homepage || "No homepage available",
        inline: false,
      });
    }
    const respEmbed = new EmbedBuilder()
      .setColor("#cb3837")
      .setTitle(packageData.name)
      .setURL(`https://www.npmjs.com/package/${packageData.name}`)
      .setDescription(packageData.description || "No description available.")
      .addFields(fields)
      .setThumbnail(
        "https://github.com/npm/logos/blob/master/npm%20square/n-large.png?raw=true"
      )
      .setFooter({
        text: `Last updated: ${new Date(
          packageData.time.modified
        ).toLocaleDateString()}`,
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [respEmbed],
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (error) {
    console.error("Error fetching npm package:", error);
    await interaction.editReply({
      content: "An error occurred while fetching the package information.",
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  }
}
