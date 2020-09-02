const { RichEmbed } = require('discord.js');
const config = require('../../config.json');
const Logger = require("@ayana/logger");
module.exports = class {
    static async run(client, guild) {

        let default_link = "https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png";
        // Just to check if the bot is in developer mode
        if (config.tokens.main == client.token) {        
        let guildJoinEmbed = new RichEmbed()
            .setColor("GREEN")
            .setThumbnail(guild.iconURL || default_link)
            .setAuthor(`Guild Added | ${guild.name}`, guild.iconURL || default_link)
            .setDescription(`
Project Alpha is now in \`${client.guilds.size}\` guilds!
            
**Owner**: ${guild.owner ? guild.owner.user.tag : "Couldn't fetch user"} [\`${guild.ownerID}\`]`)
            .addField(`Channels [${guild.channels.size}]`, `
- Text: ${guild.channels.filter(x=>x.type == 'text').size}
- Voice: ${guild.channels.filter(x=>x.type == 'voice').size}
- Categories: ${guild.channels.filter(x=>x.type == 'category').size}`, true)
            .addField(`Members [${guild.members.size}]`, `
- Humans: ${guild.members.filter(x=>!x.user.bot).size}
- Bots: ${guild.members.filter(x=>x.user.bot).size}`, true)

        client.channels.get('716968419307683870').createWebhook('Guild Added', guild.iconURL)
            .then(webhook => webhook.send(guildJoinEmbed).then(()=>setTimeout(function() { webhook.delete() }, 5000)))
            .catch(() => { return });

        let channel = client.channels.get("718780922056540201");
        if (channel) channel.setName(`Guilds: ${client.guilds.size}`);
        }
    }
}