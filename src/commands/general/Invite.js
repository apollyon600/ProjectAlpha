const { Command } = require('../../structures/CommandStructure.js');
const { RichEmbed } = require('discord.js');
class Invite extends Command {
    constructor(client) {
        super(client, {
            name: "invite",
            aliases: ['links', 'support'],
            description: "Invite Link for Project Alpha.",
            category: "General",
            cooldown: 1000
        });
    }
    async exec(message, args, templateEmbed) {
        message.channel.send(templateEmbed.setDescription(`
**Invite Project Alpha**:
<https://discord.com/oauth2/authorize?client_id=656739867404795934&scope=bot&permissions=388160>

**Support Server**:
<https://discord.gg/PJy6YF4>

**Webiste**:
<https://projectalpha.cc/>

**Top.gg**
<https://top.gg/bots/656739867404795934>`));
    }
}

module.exports = Invite;
 