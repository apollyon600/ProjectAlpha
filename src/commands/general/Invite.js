const { Command } = require('../../structures/CommandStructure.js');
const { MessageEmbed } = require('discord.js');
class Invite extends Command {
    constructor(client) {
        super(client, {
            name: "invite",
            aliases: ['links', 'support'],
            description: "Resources of Project Alpha.",
            usage: "alpha invite",
            category: "General",
            cooldown: 1000
        });
    }
    async exec(message, args, templateEmbed) {
        message.channel.send(
            templateEmbed
                .setThumbnail(this.client.user.displayAvatarURL())
            .setDescription(`
**Invite Project Alpha**:
<https://discord.com/oauth2/authorize?client_id=656739867404795934&scope=bot&permissions=388160>

**Support Server**:
<https://discord.gg/PJy6YF4>

**Website**:
<https://projectalpha.cc/>

**Top.gg**
<https://top.gg/bots/656739867404795934>

**Github**
https://github.com/apollyon600/ProjectAlpha`));
    }
}

module.exports = Invite;
 