const { Command } = require('../../structures/CommandStructure.js');
class Help extends Command {
    constructor(client) {
        super(client, {
            name: "help",
            aliases: ["cmds", "command", "commands"],
            description: "View commands of Project Alpha",
            usage: "alpha help",
            category: "General",
            autoTip: true,
            cooldown: 1000
        });
    }
    async exec(message, args, templateEmbed) {
      
            templateEmbed
                .setTitle("Project Alpha's Commands")
                .setDescription("To execute a command use `alpha [command]`\n\nInvite Project Alpha: <https://projectalpha.cc/invite>\nJoin our Server: <https://projectalpha.cc/discord>");

        this.client.commands.forEach(command => {
            if (command.category.toLowerCase().includes("owner")) return;
            templateEmbed.addField(`\`${command.name}\` **[aliases: ${command.aliases.join(", ")}]**`, `
${command.description}
Usage: ${command.usage}`);
        });

        message.channel.send(templateEmbed)

    }
}

module.exports = Help;
