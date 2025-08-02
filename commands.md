# PowerBots Commands

## General

| Command    | Usage            | Description                                                                       | Permissions |
| ---------- | ---------------- | --------------------------------------------------------------------------------- | ----------- |
| ping       | /ping            | Replies with Pong!                                                                |             |
| avatar     | /avatar [user]   | Gets the avatar of a user, defaults to you                                        |             |
| serverinfo | /serverinfo      | Fetches information about the current server.                                     |             |
| whois      | /whois [user/id] | Fetches public information about a user. Defaults to you if no user is specified. |             |
| color      | /color <color>   | Get the info of a color (hex or rgb)                                              |             |

### Fun

| Command           | Usage                       | Description                                                      | Permissions |
| ----------------- | --------------------------- | ---------------------------------------------------------------- | ----------- |
| 8ball             | /8ball <question>           | Ask the magic 8-ball a question, and your fate will be revealed. |             |
| coinflip          | /coinflip                   | Flips a coin.                                                    |             |
| roll              | /roll [sides] [wait]        | Rolls a dice.                                                    |             |
| rockpaperscissors | /rockpaperscissors <choice> | Play a game of rock paper scissors.                              |             |

### Images

| Command      | Usage                          | Description                      | Permissions |
| ------------ | ------------------------------ | -------------------------------- | ----------- |
| deepfry      | /deepfry <image>               | Deepfry an image                 |             |
| invert       | /invert <image>                | Inverts the colors of an image   |             |
| greyscale    | /greyscale <image>             | Converts an image to greyscale   |             |
| pixelate     | /pixelate <image> [pixelation] | Pixelates an image               |             |
| togif        | /togif <image>                 | Converts an image to GIF format. |             |
| speechbubble | /speechbubble <image>          | Adds a speech bubble to an image |             |

### APIs

| Command    | Usage                       | Description                                    | Permissions |
| ---------- | --------------------------- | ---------------------------------------------- | ----------- |
| github     | /github get user <username> | Get information about a GitHub user            |             |
| npm        | /npm <package>              | Get info about a npm package                   |             |
| dictionary | /dictionary <word>          | Get definitions for a word from the dictionary |             |

## Moderation

| Command   | Usage                               | Description                                               | Permissions      |
| --------- | ----------------------------------- | --------------------------------------------------------- | ---------------- |
| kick      | /kick <user> [reason] [dm]          | Kicks a user from the server                              | Kick Members     |
| ban       | /ban <user/id> [reason] [dm]        | Ban a user from the server. Must include user, or id.     | Ban Members      |
| unban     | /unban <user/id> [reason]           | Unbans a user from the server, either via username or id. | Ban Members      |
| timeout   | /timeout <user> <duration> [reason] | Timeout a user for a specified duration                   | Moderate Members |
| untimeout | /untimeout <user> [reason] [dm]     | Removes a timeout from a user                             | Moderate Members |
| warn      | /warn <user> [reason] [dm]          | Warns a user                                              | Moderate Members |
| unwarn    | /unwarn <case> [reason] [dm]        | Removes a warning from a user                             | Moderate Members |
| warns     | /warns <user>                       | View the warns of a user                                  | Moderate Members |
| note      | /note modify <user> <note>          | Adds or modifies a note for a user                        | Moderate Members |
| note      | /note view <user>                   | Views notes for a user                                    | Moderate Members |
| purge     | /purge <amount> [reason]            | Purges a specified number of messages from the channel    | Manage Messages  |
| reason    | /reason <case> <reason>             | Change the reason for a moderation action                 | Moderate Members |
| slowmode  | /slowmode <duration> [reason]       | Sets the slowmode for a channel                           | Manage Channels  |

## Admin

| Command              | Usage                                 | Description                                  | Permissions     |
| -------------------- | ------------------------------------- | -------------------------------------------- | --------------- |
| modlogs              | /modlogs toggle <enable>              | Toggle modlogs for this server               | Admin/Moderator |
| modlogs              | /modlogs info                         | Get modlogs info for this server             | Admin/Moderator |
| logs                 | /logs toggle <enable>                 | Toggle logging for this server               | Administrator   |
| logs                 | /logs channel <channel>               | Set the logging channel for this server      | Administrator   |
| logs                 | /logs info                            | Get logging info for this server             | Administrator   |
| togglecommand        | /togglecommand <command> <enable>     | Toggles a command on or off for this server. | Administrator   |
| togglefiltercommands | /togglefiltercommands toggle <toggle> | Toggles the filter for command inputs.       | Administrator   |
| togglefiltercommands | /togglefiltercommands info            | Checks the current status of the filter.     | Administrator   |
