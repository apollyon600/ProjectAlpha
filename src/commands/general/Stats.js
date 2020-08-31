const { Command } = require('../../structures/CommandStructure.js');
const os = require('os');
class Stats extends Command {
    constructor(client) {
        super(client, {
            name: "stats",
            aliases: ["stat", "botinfo", "info", "information"],
            description: "View commands of Project Alpha",
            category: "General",
            autoTip: true,
            cooldown: 1000
        });
    }
    async exec(message, args, templateEmbed) {
      
        let RamUsages = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        let RamTotal = (os.totalmem() / 1024 / 1024).toFixed(2);
        let percentRAM = RamUsages / RamTotal * 100;

        templateEmbed
            .setDescription(`**RAM USAGE**: ${RamUsages}MB/${RamTotal}MB`)
            .setAuthor("Project Alpha's Statistics", this.client.user.displayAvatarURL)
            .setThumbnail(this.client.user.displayAvatarURL)
            .addField("Top 10 Guilds", `
\`\`\`fix
\n${this.client.guilds.filter(x=>x.id != "264445053596991498").sort(function(a, b){return b.memberCount - a.memberCount}).map(x=>`${x.name} - ${x.memberCount} Members`).slice(0, 10).join("\n")}\`\`\``)
            .addField("**Bot Statistics**", `
\`\`\`fix
• Uptime: ${this.client.func.prettyms(this.client.uptime)}
• Guilds: ${this.client.guilds.size.toLocaleString()}
• Users: ${this.client.guilds.reduce((a, b) => a.memberCount + b.memberCount).toLocaleString()}
• Channels: ${this.client.guilds.reduce((a, b) => a.channels.size + b.channels.size).toLocaleString()}\`\`\``)
            .addField("**Bot Information**", `
\`\`\`fix
• CPU: ${percentRAM.toFixed(2)}%
• Location: United States, New York
• Library: discord.js@11.6.4
• Created By: Apollo#6000\`\`\``)
        message.channel.send(templateEmbed)

    }
}

module.exports = Stats;
