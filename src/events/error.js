const { MessageEmbed } = require('discord.js');
const config = require('../../config.json');
const Logger = require("@ayana/logger");
module.exports = class {
    static async run(client, error) {
        Logger.get("error").info(error);
    }
}