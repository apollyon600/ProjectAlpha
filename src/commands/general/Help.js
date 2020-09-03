const { Command } = require('../../structures/CommandStructure.js');
class Help extends Command {
    constructor(client) {
        super(client, {
            name: "help",
            aliases: ["cmds", "command", "commands"],
            description: "View commands of Project Alpha",
            category: "General",
            autoTip: true,
            cooldown: 1000
        });
    }
    async exec(message, args, templateEmbed) {
      
        templateEmbed
            .setDescription("Thank you for using **Project Alpha**,\n\nAn all in one Hypixel Skyblock Discord Bot to make your hypixel experience easier than ever.\n\n[Click here to invite Project Alpha](https://projectalpha.cc/invite)")
            .addField("<:utility:749839780518297702>   **General Commands**", `\`\`\`fix\n${this.client.commands.filter(x=>x.category=="General").map(x=>`${x.name}`).join('\n')}\`\`\``)
            .addField("<:utility:749839780518297702>   **Utility Commands**", `\`\`\`fix\n${this.client.commands.filter(x=>x.category=="Utility").map(x=>`${x.name}`).join('\n')}\`\`\``)
            .addField("<:utility:749839780518297702>   **Resources Used**", `[sky.lea.moe](https://sky.lea.moe) **DEPRECATED**\n[sky.shiiyu.moe](https://sky.shiiyu.moe)\n[HyAuctions](https://auctions.craftlink.xyz/)\n[Slothpixel](https://docs.slothpixel.me/)\n[Hypixel API](https://api.hypixel.net)`)
            .setFooter(`Requested by ${message.author.tag}\nUse "alpha stats" for info about the bot.`, message.author.displayAvatarURL())
            .setThumbnail(this.client.user.displayAvatarURL())
            .setImage('https://top.gg/api/widget/656739867404795934.png?usernamecolor=FFFFFF&topcolor=2F3136')
        message.channel.send(templateEmbed);

    }
}

module.exports = Help;
