const { Command } = require('../../structures/CommandStructure.js');
const { RichEmbed } = require("discord.js");
const config = require("../../../config.json");
const lib = require("../../constants/Lib.js");
const objectPath = require("object-path");
const util = require("util")
const fetch = require("node-fetch");
const prettyms = require("pretty-ms");
const nbt = require('prismarine-nbt');
const { ranks } = require('../../constants/Constants.js');
const { ENCHANTMENTS } = require('../../constants/Prices.js');
const { TALISMANS } = require('../../constants/Prices.js');
const Helper = require("../../constants/Helper.js");
class Player extends Command {
    constructor(client) {
        super(client, {
            name: "player",
            aliases: ["players"],
            description: "View a skyblock players profile.",
            category: "Utility",
            needsAPI: true,
            autoTip: true,
            cooldown: 10000
        });
    }
    async exec(message, args, templateEmbed) {

        if (!args[0]) return message.channel.send("Invalid arguments to search a players stats: `alpha player [IGN] [Profile]`");

        let data = await Helper.getPlayer(message, args[0], args[1]);
        let items = data.items;
        let stats = data.stats;
        let profileChecking = data.playerData;

        // Guild Finding

        console.log(data)

        let guild_id = require("node-fetch")(`https://api.hypixel.net/findGuild?key=${config.tokens.hypixel}&byUuid=${profileChecking.uuid}`).then(res => res.json());
        console.log(guild_id);
        let guild_data = require("node-fetch")(`https://api.hypixel.net/guild?key=${config.tokens.hypixel}&id=${guild_id}`).then(res => res.json());

    }
}
module.exports = Player;   