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

        
        if (['cmd', 'cmds', 'commands'].includes(args[0])) {
            let commands = await this.client.comp("mongo").database.findOne({id:"commands"}).then(x=>x.commandsUsed);
            let array = [], commandsArray = Object.entries(commands);
            commandsArray.forEach(x => { if (parseInt(x[1])) array.push(x); });
            return message.channel.send(
                templateEmbed
                    .setTitle("Command Statistics")
                    .setDescription(`\`\`\`js\n${array.map(x=>`${x[0].titleCase()}: ${x[1]} Uses`).join('\n')}\`\`\``))
        }

        let commands = await this.client.comp("mongo").database.findOne({id:"commands"}).then(x=>x.commandsUsed);
        commands = Object.values(commands).reduce((a, b) => a + b).toLocaleString();


        templateEmbed
            .setDescription(`**RAM USAGE**: ${RamUsages}MB/${RamTotal}MB`)
            .setAuthor("Project Alpha's Statistics", this.client.user.displayAvatarURL())
            .setThumbnail(this.client.user.displayAvatarURL())
            .addField("Top 20 Guilds", `
\`\`\`fix
\n${this.client.guilds.cache.filter(x=>x.id != "264445053596991498").sort((a, b) => { if (b.available) { return b.members.cache.size - a.members.cache.size; } return -1; }).map(x=>`${x.name} - ${x.members.cache.size} Members`).slice(0, 20).join("\n")}\`\`\``)
            .addField("**Bot Statistics**", `
\`\`\`fix
• Uptime: ${this.client.func.prettyms(this.client.uptime)}
• Guilds: ${this.client.guilds.cache.size.toLocaleString()}
• Users: ${this.client.guilds.cache.filter(x=>x.available).map(x=>x.members.cache.size).reduce((a, b) => a + b).toLocaleString()}
• Channels: ${this.client.guilds.cache.filter(x=>x.available).map(x=>x.channels.cache.size).reduce((a, b) => a + b).toLocaleString()}
• Commands Ran: ${commands}\`\`\``)
            .addField("**Bot Information**", `
\`\`\`fix
• CPU: ${percentRAM.toFixed(2)}%
• Location: United States, New York
• Library: discord.js@^12.3.1
• Created By: Apollo#6000\`\`\``)
        message.channel.send(templateEmbed)

    }
}

module.exports = Stats;
