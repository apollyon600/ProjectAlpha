const { Command } = require('../../structures/CommandStructure.js');
class Help extends Command {
    constructor(client) {
        super(client, {
            name: "help",
            description: "View commands of Project Alpha",
            category: "General",
            autoTip: true,
            cooldown: 1000
        });
    }
    async exec(message, args, templateEmbed) {
      
      message.channel.send(
        templateEmbed
          .setDescription("Thank you for using **Project Alpha**,\nAn all in one Hypixel Skyblock Discord Bot to make your hypixel experience easier than ever.\n\n[Click here to invite Project Alpha to your server](https://projectalpha.cc/invite)")
          .addField("General Commands", `General Commands to view bot statistics or sync your discord account to your MC Account. \`\`\`fix\n${this.client.commands.filter(x=>x.category == 'General').map(x=>`${x.name}`).join('\n')}\`\`\``, true)
          .addField("Utility Commands", `View stats of a guild, user, or even use commands that may help you in the long run. \`\`\`fix\n${this.client.commands.filter(x=>x.category == 'Utility').map(x=>`${x.name}`).join('\n')}\`\`\``, true)
          .addField("Configuration Commands", `Configurate your guild settings\`\`\`fix\nprefix\nconfig\`\`\``, true)
          .addField("Changelog", `
\`\`\`diff
+ Price Command: Check an items price, with our estimated AI Searcher.
- Removed the following: Party System, Fraud Detection
\`\`\``)
          .setThumbnail("https://media.discordapp.net/attachments/723816845508870254/723843661934231572/MOSHED-2020-6-20-3-11-58.gif")
          .setFooter("Made By: Apollo#6000", 'https://cdn.discordapp.com/avatars/507408804145528832/d6d57a40eea89d2c2dfa362276a84308.png?size=2048'))
    }
}

module.exports = Help;
