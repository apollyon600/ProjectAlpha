const { MessageEmbed } = require('discord.js');
const config = require('../../config.json');
module.exports = class {
    static async run(client, member) {
        
        if (config.tokens.main == client.token) {
            // This is for the main server.
            let channel = member.guild.channels.cache.get("718780892579102750");
            if (channel) channel.setName(`User Count: ${member.guild.memberCount}`);
        }

    }
}