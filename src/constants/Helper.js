// This was copied from LeaPhant's sky.lea.moe
const constants = require('./Constants.js');
const config = require('../../config.json');
const lib = require("./Lib.js");
const { MessageEmbed } = require('discord.js');
module.exports = {
     renderLore: async (text) => {
        let output = "";
        let spansOpened = 0;

        const parts = text.split("§");

        if (parts.length == 1)
            return text;

        for (const part of parts) {
            const code = part.substring(0, 1);
            const content = part.substring(1);

            if (code in constants.minecraft_formatting) {
                const format = constants.minecraft_formatting[code];

                if (format.type == 'color') {
                    for (; spansOpened > 0; spansOpened--)
                        output += "</span>";

                    output += `<span style='${format.css}'>${content}`;

                    spansOpened++;
                } else if (format.type == 'format') {
                    output += `<span style='${format.css}'>${content}`;

                    spansOpened++;
                } else if (format.type == 'reset') {
                    for (; spansOpened > 0; spansOpened--)
                        output += "</span>";

                    output += content;
                }
            }
        }

        for (; spansOpened > 0; spansOpened--)
            output += "</span>";

        const specialColor = constants.minecraft_formatting['6'];

        for (const enchantment of constants.special_enchants)
            output = output.replace(enchantment, `<span style='${specialColor.css}'>${enchantment}</span>`);

        return output;
    },

    hasPath: (obj, ...keys) => {
        if(obj == null)
            return false;

        let loc = obj;

        for(let i = 0; i < keys.length; i++){
            loc = loc[getKey(keys[i])];

            if(loc === undefined)
                return false;
        }

        return true;
    },

    getPlayer: async (message, player_input, profile_input) => {
        let profileChecking;
        if (player_input.startsWith("https://sky.lea.moe/stats/") || player_input.startsWith("https://sky.shiiyu.moe/stats/")) {
            let parsing = player_input.split("/")
            player_input = parsing[4];
            profile_input = parsing[5] ? parsing[5] : ''
        }
        profileChecking = await require('node-fetch')(`https://api.hypixel.net/player?key=${config.tokens.hypixel}&name=${player_input.titleCase()}`)
            .then(x => x.json())
            .catch(() => {return message.channel.send("Error | Hypixel API is down, please try again later.")});
        if (!profileChecking.player) return message.channel.send(`Seems like the user \`${player_input}\` has **never** logged into hypixel.`);
        else profileChecking = profileChecking.player;
    
        if (!profileChecking.stats.SkyBlock) return message.channel.send(`Seems like that ${player_input} has **never** played Skyblock`);

        let profiles = [],
            savedProfiles = [];
        let arrayOfProfiles = Object.keys(profileChecking.stats.SkyBlock.profiles);
        arrayOfProfiles.forEach(x => {
            savedProfiles.push({ name: profileChecking.stats.SkyBlock.profiles[x].cute_name, id: profileChecking.stats.SkyBlock.profiles[x].profile_id });
            profiles.push({ name: profileChecking.stats.SkyBlock.profiles[x].cute_name, id: profileChecking.stats.SkyBlock.profiles[x].profile_id });
        });
        if (profiles.length == 0) return message.channel.send(`Seems like that ${player_input} has **never** played Skyblock`);
        if (!profile_input) profiles = profiles[0].id;
        if (profile_input) profiles = profiles.filter(x => x.name.toLowerCase() == profile_input.toLowerCase())[0];
        if (!profiles) return message.channel.send(`Looks like the profile \`${profile_input.titleCase()}\` does not exist for this user.`, new MessageEmbed().setColor("#6283d9").setDescription(`Available Profiles:\n${savedProfiles.map(x=>`[${PROFILE_EMOJIS[x.name]}] ${x.name}`).join('\n')}`))
        else if (profile_input && profiles) profiles = profiles.id;
        let skyblockData = await require('node-fetch')(`https://api.hypixel.net/skyblock/profile?key=${config.tokens.hypixel}&name=${profileChecking.displayname.titleCase()}&profile=${profiles.titleCase()}`)
            .then(x => x.json())
            .catch(() => {return message.channel.send("Error | Hypixel API is down, please try again later.")});
        if (!skyblockData.profile) return message.channel.send("There was an error when trying to fetch the users profile.");
        let profile = await skyblockData.profile.members[profileChecking.uuid];

        return { profileChecking, profile, profiles, skyblockData, uuid: profileChecking.uuid, player_name: profileChecking.displayname };
    }
}

function getKey(key){
    const intKey = new Number(key);

    if(!isNaN(intKey))
        return intKey;

    return key;
}