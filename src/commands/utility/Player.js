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
            aliases: ["players", "plr"],
            description: "View a skyblock players profile.",
            category: "Utility",
            needsAPI: true,
            autoTip: true,
            cooldown: 10000
        });
    }
    async exec(message, args, templateEmbed) {

        let PROFILE_EMOJIS = config.PROFILE_EMOJIS;
        if (!args[0]) return message.channel.send("Invalid arguments to search a players stats: `alpha player [IGN] [Profile]`");

        let data = await Helper.getPlayer(message, args[0], args[1]);
        let profile = data.profile;
        let profiles = data.profiles;
        let skyblockData = data.skyblockData;
        let profileChecking = data.profileChecking;
        let items = await lib.getItems(profile);
        let stats = await lib.getStats(profile, items, profileChecking);

        if (items.no_inventory) return message.channel.send(`Sorry, I couldn't fetch the profile of **${data.player_name} [\`${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}\`]** because their API is disabled.`)

        let tempMessage = await message.channel.send(`Fetching the profile of **${data.player_name} [\`${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}\`]**`);
        // Variable Declaring
        let page = 1;

        // Guild Finding

        let guild_data = await require("node-fetch")(`https://api.hypixel.net/guild?key=${config.tokens.hypixel}&player=${data.uuid}`).then(res => res.json());
        guild_data = guild_data.guild;

        let playedSlayers = false,
            playedZombie = false,
            playedSpider = false,
            playedSven = false
        if (!stats.slayers.zombie.level.xp && !stats.slayers.wolf.level.xp && !stats.slayers.spider.level.xp) playedSlayers = false;
        else playedSlayers = true;

        if (stats.slayers.zombie.level.xp) playedZombie = true;
        if (stats.slayers.spider.level.xp) playedSpider = true;
        if (stats.slayers.wolf.level.xp) playedSven = true;

        let pets = [], armor = [], enderchest = [], talismans = [], inventory = [];

        if (stats.pets.length > 0) stats.pets.forEach(async pet => {
            if (!pet.display_name) return;

            let petItem = "";
            if (pet.heldItem) {
                petItem = pet.heldItem;
            }

            pets.push({ name: `[${pet.level.level == 100 ? "**Lvl 100**" : `Lvl ${pet.level.level}`}] ${pet.rarity.titleCase()} ${pet.display_name}`, count: 1, lore: petItem, rarity: pet.rarity.titleCase() || "" });
        });
        

        if (items.armor.length > 0) items.armor.forEach(async item => {
            if (!item.tag) return;
            let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
            if (!item_name) return;

            if (item.rarity == 'common' || item.rarity == 'COMMON') return;

            // Enchantments
            let enchantments = [];
            let enchantlore = [];
            if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
            if (enchantments.length > 0) enchantments.forEach(async x => {
                let roman = this.client.romanize(x[1]);
                if (!roman) return;
                else enchantlore.push(x[0].split("_").map(x=>`${x.titleCase()}`).join(' ') + " " + roman);
            });
            
            let isRecomb = false;

            if(Helper.hasPath(item, 'tag', 'ExtraAttributes', 'rarity_upgrades')){
                const { rarity_upgrades } = item.tag.ExtraAttributes;

                if(rarity_upgrades > 0)
                    isRecomb = true;
            }
            
            armor.push({ name: item_name, count: item.Count, lore: enchantlore, isRecomb, rarity: item.rarity.titleCase() || "" });
        });

        if (items.wardrobe_inventory.length > 0) items.wardrobe_inventory.forEach(async item => {
            if (!item.tag) return;
            let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
            if (!item_name) return;

            if (item.rarity == 'common' || item.rarity == 'COMMON') return;

            // Enchantments
            let enchantments = [];
            let enchantlore = [];
            if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
            if (enchantments.length > 0) enchantments.forEach(async x => {
                let roman = this.client.romanize(x[1]);
                if (!roman) return;
                else enchantlore.push(x[0].split("_").map(x=>`${x.titleCase()}`).join(' ') + " " + roman);
            });

            let isRecomb = false;

            if(Helper.hasPath(item, 'tag', 'ExtraAttributes', 'rarity_upgrades')){
                const { rarity_upgrades } = item.tag.ExtraAttributes;

                if(rarity_upgrades > 0)
                    isRecomb = true;
            }
            
            armor.push({ name: item_name, count: item.Count, lore: enchantlore, isRecomb, rarity: item.rarity.titleCase() || "" });
        });

        if (items.inventory.length > 0) items.inventory.forEach(async item => {
            if (!item.tag) return;
            let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
            if (!item_name) return;

            if (item.rarity == 'common' || item.rarity == 'COMMON') return;

            // Enchantments
            let enchantments = [];
            let enchantlore = [];
            if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
            if (enchantments.length > 0) enchantments.forEach(async x => {
                let roman = this.client.romanize(x[1]);
                if (!roman) return;
                else enchantlore.push(x[0].split("_").map(x=>`${x.titleCase()}`).join(' ') + " " + roman);
            });
            
            let isRecomb = false;

            if(Helper.hasPath(item, 'tag', 'ExtraAttributes', 'rarity_upgrades')){
                const { rarity_upgrades } = item.tag.ExtraAttributes;

                if(rarity_upgrades > 0)
                    isRecomb = true;
            }

            inventory.push({ name: item_name, count: item.Count, lore: enchantlore, isRecomb });
        });

        if (items.talismans.length > 0) items.talismans.forEach(async item => {
            if (!item.tag) return;
            let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
            if (!item_name) return;

            if (item.rarity == 'common' || item.rarity == 'COMMON') return;

            // Enchantments
            let enchantments = [];
            let enchantlore = [];
            if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
            if (enchantments.length > 0) enchantments.forEach(async x => {
                let roman = this.client.romanize(x[1]);
                if (!roman) return;
                else enchantlore.push(x[0].split("_").map(x=>`${x.titleCase()}`).join(' ') + " " + roman);
            });
            
            let isRecomb = false;

            if(Helper.hasPath(item, 'tag', 'ExtraAttributes', 'rarity_upgrades')){
                const { rarity_upgrades } = item.tag.ExtraAttributes;

                if(rarity_upgrades > 0)
                    isRecomb = true;
            }

            talismans.push({ name: item_name, count: item.Count, lore: enchantlore, isRecomb, rarity: item.rarity.titleCase() || "" });
        });
        
        if (items.enderchest.length > 0) items.enderchest.forEach(async item => {
            if (!item.tag) return;
            let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
            if (!item_name) return;

            if (item.rarity == 'common' || item.rarity == 'COMMON') return;

            // Enchantments
            let enchantments = [];
            let enchantlore = [];
            if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
            if (enchantments.length > 0) enchantments.forEach(async x => {
                let roman = this.client.romanize(x[1]);
                if (!roman) return;
                else enchantlore.push(x[0].split("_").map(x=>`${x.titleCase()}`).join(' ') + " " + roman);
            });

            let isRecomb = false;

            if(Helper.hasPath(item, 'tag', 'ExtraAttributes', 'rarity_upgrades')){
                const { rarity_upgrades } = item.tag.ExtraAttributes;

                if(rarity_upgrades > 0)
                    isRecomb = true;
            }

            enderchest.push({ name: item_name, count: item.Count, lore: enchantlore, isRecomb, rarity: item.rarity.titleCase() || "" });
        });
        
        let page1 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)
            .addField("**Stats**", `
${await this.client.getEmoji('health', 'string')} Health: ${stats.stats.health.toLocaleString() || "???"}
${await this.client.getEmoji('health', 'string')} Effective Health: ${Math.floor(stats.stats.health*(stats.stats.defense/100+1)).toLocaleString() || "???"}
${await this.client.getEmoji('defense', 'string')} Defense: ${stats.stats.defense.toLocaleString() || "???"}
${await this.client.getEmoji('strength', 'string')} Strength: ${stats.stats.strength.toLocaleString() || "???"}
${await this.client.getEmoji('speed', 'string')} Speed: ${stats.stats.speed.toLocaleString() || "???"}
${await this.client.getEmoji('critchance', 'string')} Crit Chance: ${stats.stats.crit_chance.toLocaleString() || "???"}
${await this.client.getEmoji('critdamage', 'string')} Crit Damage: ${stats.stats.crit_damage.toLocaleString() || "???"}
${await this.client.getEmoji('attackspeed', 'string')} Attack Speed: ${stats.stats.bonus_attack_speed || "???"}
${await this.client.getEmoji('intelligence', 'string')} Intelligence: ${stats.stats.intelligence.toLocaleString() || "???"}
${await this.client.getEmoji('seacreature', 'string')} Sea Creature Chance: ${`${stats.stats.sea_creature_chance.toLocaleString()}%` || "???"}
${await this.client.getEmoji('magicfind', 'string')} Magic Find: ${stats.stats.magic_find.toLocaleString() || "???"}
${await this.client.getEmoji('petluck', 'string')} Pet Luck: ${stats.stats.pet_luck.toLocaleString() || "???"}`)
.addField("Misc", `
${await this.client.getEmoji('fairysoul', 'string')} Fairy Souls Collected: ${profile.fairy_souls_collected || 0} / 209
${await this.client.getEmoji('coin', 'string')} Purse: ${Math.floor(profile.coin_purse).toLocaleString()}
${skyblockData.profile.banking ? `${await this.client.getEmoji('bank', 'string')} Bank: ${Math.floor(skyblockData.profile.banking.balance).toLocaleString()}` : ''}`)
            .addField("Slayers", `
${!playedSlayers ? `\`\`\`diff\n- ${data.player_name} has never played slayers\`\`\`` : `　- **Total Slayer XP**: ${stats.slayer_xp.toLocaleString()} XP
　- **Total Coins Spent**: ${stats.slayer_coins_spent.total.toLocaleString()} Coins

${playedZombie ? `${await this.client.getEmoji('revenant', 'string')} Revenant Horror **${stats.slayers.zombie.level.currentLevel}**:  \`${stats.slayers.zombie.level.xp.toLocaleString()} XP\` / \`${stats.slayers.zombie.level.xpForNext == 0 ? "MAXED" : stats.slayers.zombie.level.xpForNext.toLocaleString()} XP\` **(${(stats.slayers.zombie.level.progress * 100).toFixed(0) > 100 ? `100%` : `${(stats.slayers.zombie.level.progress * 100).toFixed(0)}%`})**` : `${profileChecking.displayname} has never played revenant slayers.`}
${playedSpider ? `${await this.client.getEmoji('tarantula', 'string')} Tarantula BroodFather **${stats.slayers.spider.level.currentLevel}**:  \`${stats.slayers.spider.level.xp.toLocaleString()} XP\` / \`${stats.slayers.spider.level.xpForNext == 0 ? "MAXED" : stats.slayers.spider.level.xpForNext.toLocaleString()} XP\` **(${(stats.slayers.spider.level.progress * 100).toFixed(0) > 100 ? `100%` : `${(stats.slayers.spider.level.progress * 100).toFixed(0)}%`})**` : `${profileChecking.displayname} has never played tarantula slayers.`}
${playedSven ? `${await this.client.getEmoji('sven', 'string')} Sven Packmaster **${stats.slayers.wolf.level.currentLevel}**:  \`${stats.slayers.wolf.level.xp.toLocaleString()} XP\` / \`${stats.slayers.wolf.level.xpForNext == 0 ? "MAXED" : stats.slayers.wolf.level.xpForNext.toLocaleString()} XP\` **(${(stats.slayers.wolf.level.progress * 100).toFixed(0) > 100 ? `100%` : `${(stats.slayers.wolf.level.progress * 100).toFixed(0)}%`})**` : `${profileChecking.displayname} has never played sven slayers.`}`}`)

        let page2 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)
            .setDescription(`Average Skill Level: ${stats.average_level.toFixed(2).toLocaleString()}
${stats.levels.taming.level == -1 ? `*Skills from achievements across all profiles.\n[Enable Skills API](https://sky.lea.moe/resources/video/enable_api.webm) for accurate data.*\n` : ""}`)

            let skills = ["Taming", "Mining", "Foraging", "Enchanting", "Carpentry", "Farming", "Combat", "Fishing", "Alchemy", "Runecrafting"];
            for (let i = 0; i < skills.length; i++) {
                page2.addField(
                    `${await this.client.getEmoji(skills[i].toLowerCase(), 'string')}   ${stats.levels[skills[i].toLowerCase()].level == -1 ? `${skills[i]} **0**` : `${skills[i]} **${stats.levels[skills[i].toLowerCase()].level}**`}`,
                    `\`${stats.levels[skills[i].toLowerCase()].xpCurrent.toLocaleString()} XP\` / \`${stats.levels[skills[i].toLowerCase()].xpForNext == Infinity ? 'MAXED' : stats.levels[skills[i].toLowerCase()].xpForNext.toLocaleString()} XP\` **(${stats.levels[skills[i].toLowerCase()].xpForNext == Infinity ? "100" : (stats.levels[skills[i].toLowerCase()].progress * 100).toFixed(0)}%)**\n${await getBar(stats.levels[skills[i].toLowerCase()].xpCurrent, stats.levels[skills[i].toLowerCase()].xpForNext)}`,
                    false
                )
                // if ([1, 3, 5, 7, 9, 11].includes(i)) page2.addBlankField()
            }

        let page3 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)

        let page4 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)

        let page5 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)

        let page6 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)

        let page7 = new RichEmbed()
            .setColor(this.client.settings.color)
            .setThumbnail(`https://mc-heads.net/avatar/${data.player_name}`)

        let invstring = `${inventory.map(x=>x.lore.length > 0 ? `[${x.count > 1 ? `**x${x.count}** ` : ""}${x.name}](https://projectalpha.cc "${x.lore.join(",\n")}\n${x.isRecomb ? "(Recombobulated)": ""}")` : `${x.count > 1 ? `**x${x.count}** ` : ""}${x.rarity ? x.rarity : ""} ${x.name}`).join("\n")}`,
            armorstring = `${armor.map(x=>x.lore.length > 0 ? `[${x.count > 1 ? `**x${x.count}** ` : ""}${x.name}](https://projectalpha.cc "${x.lore.join(",\n")}\n${x.isRecomb ? "(Recombobulated)": ""}")` : `${x.count > 1 ? `**x${x.count}** ` : ""}${x.rarity} ${x.name}`).join("\n")}`,
            enderstring = `${enderchest.map(x=>x.lore.length > 0 ? `[${x.count > 1 ? `**x${x.count}** ` : ""}${x.name}](https://projectalpha.cc "${x.lore.join(",\n")}\n${x.isRecomb ? "(Recombobulated)": ""}")` : `${x.count > 1 ? `**x${x.count}** ` : ""}${x.rarity} ${x.name}`).join("\n")}`,
            talisstring = `${talismans.map(x=>x.lore.length > 0 ? `[${x.count > 1 ? `**x${x.count}** ` : ""}${x.name}](https://projectalpha.cc "${x.lore.join(",\n")}\n${x.isRecomb ? "(Recombobulated)": ""}")` : `${x.count > 1 ? `**x${x.count}** ` : ""}${x.rarity} ${x.name}`).join("\n")}`,
            petstring = `${pets.map(x=>x.lore.length > 0 ? `[${x.count > 1 ? `**x${x.count}** ` : ""}${x.name}](https://projectalpha.cc "Held Item: ${x.lore}")` : `${x.count > 1 ? `**x${x.count}** ` : ""}${x.name}`).join("\n")}`

            if (invstring.length > 2000) {
                let arr = split(invstring);
                if (arr.length > 1) {
                    for (let i = 0; i < arr.length; i++) {
                        page3.addField(`Page ${i + 1}`, arr[i]);
                    }
                }
            } else page3.setDescription(invstring)

            if (armorstring.length > 2000) {
                let arr = split(armorstring);
                if (arr.length > 1) {
                    for (let i = 0; i < arr.length; i++) {
                        page4.addField(`Page ${i + 1}`, arr[i])
                    }
                }
            } else page4.setDescription(armorstring)
            
            if (enderstring.length > 2000) {
                let arr = split(enderstring);
                if (arr.length > 1) {
                    for (let i = 0; i < arr.length; i++) {
                        page5.addField(`Page ${i + 1}`, arr[i])
                    }
                }
            } else page5.setDescription(enderstring)

            if (talisstring.length > 2000) {
                let arr = split(talisstring);
                if (arr.length > 1) {
                    for (let i = 0; i < arr.length; i++) {
                        page6.addField(`Page ${i + 1}`, arr[i])
                    }
                }
            } else page6.setDescription(talisstring)

            if (petstring.length > 2000) {
                let arr = split(petstring);
                if (arr.length > 1) {
                    for (let i = 0; i < arr.length; i++) {
                        page7.addField(`Page ${i + 1}`, arr[i])
                    }
                }
            } else page7.setDescription(petstring)
        
        let pages = [ { title: "Player Statistics", embed: page1 }, { title: "Player Skills", embed: page2}, { title: "Inventory", embed: page3 }, { title: "Armor", embed: page4 }, { title: "Ender Chest", embed: page5 }, { title: "Accessories", embed: page6 }, { title: "Pets", embed: page7 } ];
        tempMessage.delete()
        let msg = await message.channel.send(page1.setTitle(data.player_name + ` | Player Statistics`).setFooter(`React below to scroll pages\nPage 1/${pages.length}`, message.author.displayAvatarURL))

        // console.log(pages)
        msg.react("⏪").then(() => msg.react("⏩").then(() => msg.react("⏸️")));

        const forwardFilter = (reaction, user) => reaction.emoji.name == "⏩" && user.id == message.author.id;
        const backwardFilter = (reaction, user) => reaction.emoji.name == "⏪" && user.id == message.author.id;
        const pauseFilter = (reaction, user) => reaction.emoji.name == "⏸️" && user.id == message.author.id;

        const forward = msg.createReactionCollector(forwardFilter, { time: 120000 });
        const backward = msg.createReactionCollector(backwardFilter, { time: 120000 });
        const pause = msg.createReactionCollector(pauseFilter, { time: 120000 });

        forward.on("collect", r => {
            if (page == pages.length) {
                page = 1;
                if (msg.reactions.get("⏩")) msg.reactions.get("⏩").remove(message.author)
                return msg.edit(page1.setTitle(`${data.player_name} | ${pages[0].title}`).setFooter(`React below to scroll pages\nPage 1/${pages.length}`, message.author.displayAvatarURL));
            }
            page++;
            msg.edit(pages[page-1].embed.setTitle(`${data.player_name} | ${pages[page-1].title}`).setFooter(`React below to scroll pages\nPage ${page}/${pages.length}`, message.author.displayAvatarURL));
            if (msg.reactions.get("⏩")) msg.reactions.get("⏩").remove(message.author)
        });

        backward.on("collect", r => {
            if (page == 1) {
                page = pages.length;
                if (msg.reactions.get("⏪")) msg.reactions.get("⏪").remove(message.author)
                return msg.edit(pages[pages.length - 1].embed.setTitle(`${data.player_name} | ${pages[pages.length - 1].title}`).setFooter(`React below to scroll pages\nPage ${pages.length}/${pages.length}`, message.author.displayAvatarURL));
            }
            page--;
            msg.edit(pages[page-1].embed.setTitle(`${data.player_name} | ${pages[page-1].title}`).setFooter(`React below to scroll pages\nPage ${page}/${pages.length}`, message.author.displayAvatarURL));
            if (msg.reactions.get("⏪")) msg.reactions.get("⏪").remove(message.author)
        });

        backward.on("end", r => {
            msg.edit(pages[page-1].embed.setFooter("Session Ended at").setTimestamp())
            if (msg.reactions.get("⏪")) msg.reactions.get("⏪").removeAll()
            if (msg.reactions.get("⏩")) msg.reactions.get("⏩").removeAll()
        });

        pause.on("collect", r => {
            msg.edit(templateEmbed.setFooter("Session Force Ended at").setTimestamp());
        })

        async function getBar(current, max) {
            if (max == Infinity) return "<:goldbar1:750188483624304700><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar2:750188483217457266><:goldbar3:750188483641081867>";

            let progress = Math.floor((current / max) * 100);
            let bluebar1 = "<:bluebar1:750192448503808042>",
                bluebar2 = "<:bluebar2:750192448755728484>",
                bluebar3 = "<:bluebar3:750192448600408069>",
                bluebar4 = "<:bluebar4:750192448751534123>",
                graybar1 = "<:graybar1:750188483628236810>",
                graybar2 = "<:graybar2:750188483695345757>",
                graybar3 = "<:graybar3:750188483624173608>";
            

            var progressbar = "";
            for (let i = 0; i < Math.floor(progress / 10); i++) progressbar += " " + bluebar2;
            if (progress != 100) progressbar += " " + bluebar4;
            for (let i = 0; i < 9 - Math.floor(progress / 10); i++) progressbar += " " + graybar2;
    
            let array = progressbar.split(" ");
            for (let i = 1; i < array.length; i++) {
                if (i == 1 && array[i] == bluebar4) array[i] = graybar1;
                else if (i == 1 && array[i] == bluebar2) array[i] = bluebar1;
                else if (i == array.length - 1 && array[i] == bluebar2) array[i] = bluebar3;
                else if (i == array.length - 1 && array[i] == graybar2) array[i] = graybar3;
                else if (i == array.length - 1 && array[i] == bluebar4) array[i] = bluebar3
            }

            progressbar = array.join("");
            return progressbar;
        }

        function split(string) {
            let arr = string.split("\")\n");
            let chars = 0;
            let array = [];
            let stringed = "";
            for (let i = 0; i < arr.length; i++) {
                
                if (chars + arr[i].length > 800 || chars > 800) {
                    array.push(stringed);
                    stringed = "";
                    chars = 0;

                    stringed += arr[i] + "\")\n";
                    chars += arr[i].length;
                } else {
                    chars += arr[i].length;
                    stringed += arr[i] + "\")\n";
                }
            }
            return array;
        }
    }
}

module.exports = Player;