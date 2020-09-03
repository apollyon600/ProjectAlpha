const { MessageEmbed } = require('discord.js');
const config = require('../../config.json');
const Logger = require("@ayana/logger");

module.exports = class {
    static async run(client) {
        Logger.get("ClientReady")
            .info(`Project Alpha [${config.tokens.development == client.token ? "DEVELOPMENT" : config.tokens.backup == client.token ? "BACKUP" : "MAIN"}] is now online.`);

        client.user.setActivity(config.statuses[Math.floor(Math.random() * config.statuses.length)].replace(/{guild}/g, client.guilds.cache.size), { type: "WATCHING" })
        setInterval(function() { client.user.setActivity(config.statuses[Math.floor(Math.random() * config.statuses.length)].replace(/{guild}/g, client.guilds.cache.size), { type: "WATCHING" }) }, 120000);

        if (config.tokens.main == client.token) {
            setInterval(() => { 
                "".getDBL().postStats(client.guilds.cache.size + 1000, 1, 1);
            }, 1800000);
        }
    }
};