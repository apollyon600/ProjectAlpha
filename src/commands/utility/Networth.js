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
const Helper = require('../../constants/Helper.js');
class Networth extends Command {
    constructor(client) {
        super(client, {
            name: "networth",
            aliases: ["nw", "calculate"],
            description: "View a players networth, see if they are qualified or lying about something.",
            category: "Utility",
            needsAPI: true,
            autoTip: true,
            cooldown: 10000
        });
    }
    async exec(message, args, templateEmbed) {

        let PROFILE_EMOJIS = config.PROFILE_EMOJIS;
        let client = this.client;
            
                if (!args[0]) return message.channel.send("Invalid arguments to calculate a players networth: `alpha networth [IGN] [Profile]`");

                const processBackpack = backpack => {
                    const promise = new Promise((resolve, reject) => {
                      const buffer = Buffer.from(backpack);
                  
                      nbt.parse(buffer, (e, d) => {
                        resolve(d.value.i.value.value);
                      });
                    });
                  
                    return promise;
                }
        
                if (args[0] == "update" && config.devs.includes(message.author.id)) {
                    
                    let update_embed = new RichEmbed()
                        .setColor(this.client.settings.color)

                    try {
                        let queue = [],
                        database = await this.client.comp("mongo").prices.findOne(),
                        failed = 0,
                        success = 0,
                        total = 0,
                        logs = [];
                    
                    start();
                    let msg = await message.channel.send(update_embed.setColor("GREEN").setDescription(`Starting to initiate the update function for database renewal.`));
        
                    async function queueAll() {
                        const items = await fetch("https://auctions.craftlink.xyz/api/items/all")
                        .then(res => res.json())
                        .catch(e => { console.log("GET request for \`https://auctions.craftlink.xyz/api/items/all\` failed, API is down?")});
                        if (!items || items && !items.success) return console.log("GET request for \`https://auctions.craftlink.xyz/api/items/all\` failed, API is down?");
        
                        queue = items.data;
                        total = items.data.length;
                    };
        
                    async function getData(id) {
                        let data = await fetch(`https://auctions.craftlink.xyz/api/items/${id}/quickStats`)
                        .then(res => res.json())
                        .catch(() => { console.log(`GET request for \`https://auctions.craftlink.xyz/api/items/${id}/quickStats\` failed, API is down?`)});
                        if (!data || data && !data.success) {
                            failed++;
                            console.log("GET request for \`https://auctions.craftlink.xyz/api/items/all\` failed, API is down?"); 
                            return null;
                        } else {
                            data = data.data;
                            logs.push(`Repriced ${data.name} for $${Math.round(data.deviation || data.average)}`)
                            return { name: data.name, price: Math.round(data.deviation || data.average) };
                        }
                    }
                      
                    async function getNext() {
                        success++;
                        if (!queue.length) return;
                        const data = queue.pop();
                        let fetched = await getData(data._id);
                        if (fetched) {
                            database[fetched.name] = fetched.price;
                            if (success % 25 == 0 || queue.length == success) {       
                                msg.edit(update_embed.setDescription(`      
**Renewed ${total - queue.length}/${total} items/blocks to the database!**
**Success**: ${success} | **Failed**: ${failed}
**Estimated Time**: ${prettyms(1000 * queue.length, { verbose: true })}

**Logs**:
\`\`\`diff\n${logs.reverse().slice(0, 25).join('\n')}\`\`\``));
                                client.comp('mongo').prices.updateOne({ id: "prices" }, { $set: { db: database }});
                            }
                            // console.log(`Added ${fetched.name} to the database - $${fetched.price} | ${queue.length} Items Left`)
                            getNext();
                        }
                    }
                      
                    async function start() {
                        await queueAll();
                        getNext()
                    }
                    return;
                    } catch (e) {
                        update_embed.edit(new RichEmbed().setColor("RED").setTitle("An unknown error has occured").setDescription(`\`\`\`js\n${e}\`\`\``))
                    }
                }
        
                let data = await Helper.getPlayer(message, args[0], args[1]);
                let profile = data.profile;
                let profiles = data.profiles;
                let skyblockData = data.skyblockData;
                let profileChecking = data.profileChecking;
                let items = await lib.getItems(profile);
                let stats = await lib.getStats(profile, items, profileChecking);

                if (items.no_inventory) return message.channel.send(`Sorry, I couldn't calculate the networth of **${profileChecking.displayname} [\`${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}\`]** because their API is disabled.`)
        
                let tempMessage = await message.channel.send(`Calculating networth for **${profileChecking.displayname} [\`${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}\`]**`);

                let rank = await client.fetchRank(profileChecking);
                let rankTitle = await client.convertRank(profileChecking);
                let players_networth = 0;
        
                players_networth += Math.floor(profile.coin_purse);
                if (skyblockData.profile.banking) players_networth += Math.floor(skyblockData.profile.banking.balance);
        
                let database = await this.client.comp("mongo").prices.findOne();
                database = database.db;
        
                const HOT_POTATO_BOOK = database['Hot Potato Book'];
        
                let pets = [], armor = [], enderchest = [], talismans = [], inventory = [];
        
                // Enderchest inventory to the enderchest array.
                if (items.enderchest.length > 0) items.enderchest.forEach(async item => {
                    if (!item.tag) return;
        
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    if (!item_name) return;
                    let item_price = database[item_name];
                    if (!item_price) return;
        
                    if (item.rarity == 'common' || item.rarity == 'COMMON') return;
        
                    // Processing Backpack
                    if (item_name.endsWith("Backpack")) {
                        if (!item.tag) return;
                        if (objectPath.has(item, 'tag.ExtraAttributes.greater_backpack_data')) {
                            let data = await processBackpack(item.tag.ExtraAttributes.greater_backpack_data)
                            
                            data.forEach(x => {
                                if (!x.tag || !x.tag.value || !x.tag.value.display || !x.tag.value.display.value || !x.tag.value.display.value.Name || !x.tag.value.display.value.Name.value) return;
                                let item_name = x.tag.value.display.value.Name.value ? x.tag.value.display.value.Name.value.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                                if (!item_name) return;

                                // console.log(item_name);
        
                                let array = x.tag.value.display.value.Lore.value.value.map(x=>x.replace(/§[0-9a-zA-Z]/g, '').trim());
                                array = array.filter(x=>x.startsWith("COMMON"))[0];
                                if (array) return;
        
                                if (database[item_name]) {
                                    item_price += database[item_name] * x.Count.value;
                                }
                            });
                        } else if (objectPath.has(item, 'tag.ExtraAttributes.medium_backpack_data')) {
                            let data = await processBackpack(item.tag.ExtraAttributes.medium_backpack_data)
                            
                            data.forEach(x => {
                                if (!x.tag || !x.tag.value || !x.tag.value.display || !x.tag.value.display.value || !x.tag.value.display.value.Name || !x.tag.value.display.value.Name.value) return;
                                let item_name = x.tag.value.display.value.Name.value ? x.tag.value.display.value.Name.value.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                                if (!item_name) return;
        
                                let array = x.tag.value.display.value.Lore.value.value.map(x=>x.replace(/§[0-9a-zA-Z]/g, '').trim());
                                array = array.filter(x=>x.startsWith("COMMON"))[0];
                                if (array) return;
        
                                if (database[item_name]) {
                                    item_price += database[item_name] * x.Count.value;
                                }
                            });
                        } else if (objectPath.has(item, 'tag.ExtraAttributes.small_backpack_data')) {
                            let data = await processBackpack(item.tag.ExtraAttributes.small_backpack_data)
                            
                            data.forEach(x => {
                                if (!x.tag || !x.tag.value || !x.tag.value.display || !x.tag.value.display.value || !x.tag.value.display.value.Name || !x.tag.value.display.value.Name.value) return;
                                let item_name = x.tag.value.display.value.Name.value ? x.tag.value.display.value.Name.value.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                                if (!item_name) return;
        
                                let array = x.tag.value.display.value.Lore.value.value.map(x=>x.replace(/§[0-9a-zA-Z]/g, '').trim());
                                array = array.filter(x=>x.startsWith("COMMON"))[0];
                                if (array) return;
        
                                if (database[item_name]) {
                                    item_price += database[item_name] * x.Count.value;
                                }
                            });
                        }
                    }
        
                    // Hot Potato
                    if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.hot_potato_count) item_price += HOT_POTATO_BOOK * item.tag.ExtraAttributes.hot_potato_count;
        
                    // Enchantments
                    let enchantments = [];
                    if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
                    if (enchantments.length > 0) enchantments.forEach(async x => {
                        let roman = this.client.romanize(x[1]);
                        if (!roman) return;
                        else if (ENCHANTMENTS[x[0].titleCase().replace(/ /g, "_")]) item_price += ENCHANTMENTS[x[0].toUpperCase().replace(/ /g, "_")][roman];
                    });
                    players_networth += item_price * item.Count;
                    enderchest.push({ name: item_name, cost: item_price * item.Count || 0, count: item.Count });
                });
        
                // Wardrobe inventory to the wardrobe array.
                if (items.wardrobe_inventory.length > 0) items.wardrobe_inventory.forEach(async item => {
                    if (!item.tag) return;
        
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    if (!item_name) return;
                    let item_price = database[item_name];
                    if (!item_price) return;
        
                    // Hot Potato
                    if (item.tag.ExtraAttributes.hot_potato_count) item_price += HOT_POTATO_BOOK * item.tag.ExtraAttributes.hot_potato_count;
        
                    // Enchantments
                    let enchantments = [];
                    if (item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
                    if (enchantments.length > 0) enchantments.forEach(async x => {
                        let roman = this.client.romanize(x[1]);
                        if (roman && ENCHANTMENTS[x[0].titleCase().replace(/ /g, "_")]) item_price += ENCHANTMENTS[x[0].toUpperCase().replace(/ /g, "_")][roman];
                    });
        
                    players_networth += item_price * item.Count;
                    armor.push({ name: item_name, cost: item_price * item.Count || 0, uniqueID: item.itemId, count: 1 });
                });
        
                // Armor inventory to the armor array.
                if (items.armor.length > 0) items.armor.forEach(async item => {
                    if (!item.tag) return;
        
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    if (!item_name) return;
                    let item_price = database[item_name];
                    if (!item_price) return;
        
                    // Hot Potato
                    if (item.tag.ExtraAttributes.hot_potato_count) item_price += HOT_POTATO_BOOK * item.tag.ExtraAttributes.hot_potato_count;
        
                    // Enchantments
                    let enchantments = [];
                    if (item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
                    if (enchantments.length > 0) enchantments.forEach(async x => {
                        let roman = this.client.romanize(x[1]);
                        if (roman && ENCHANTMENTS[x[0].titleCase().replace(/ /g, "_")]) item_price += ENCHANTMENTS[x[0].toUpperCase().replace(/ /g, "_")][roman];
                    });
        
                    players_networth += item_price * item.Count;
                    armor.push({ name: item_name, cost: item_price * item.Count || 0, uniqueID: item.itemId, count: 1 });
                });
        
                // Pushing inventory to the inventory array.
                // Backpack included
                if (items.inventory.length > 0) items.inventory.forEach(async item => {
                    if (!item.tag) return;
                    
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    if (!item_name) return;
                    let item_price = database[item_name];
                    if (!item_price) return;
        
                    if (item.rarity == 'common' || item.rarity == 'COMMON') return;
        
                    // Processing Backpack
                    if (item_name.endsWith("Backpack")) {
                        if (!item.tag) return;
                        if (objectPath.has(item, 'tag.ExtraAttributes.greater_backpack_data')) {
                            let data = await processBackpack(item.tag.ExtraAttributes.greater_backpack_data)
                            
                            data.forEach(x => {
                                if (!x.tag || !x.tag.value || !x.tag.value.display || !x.tag.value.display.value || !x.tag.value.display.value.Name || !x.tag.value.display.value.Name.value) return;
                                let item_name = x.tag.value.display.value.Name.value ? x.tag.value.display.value.Name.value.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                                if (!item_name) return;
        
                                let array = x.tag.value.display.value.Lore.value.value.map(x=>x.replace(/§[0-9a-zA-Z]/g, '').trim());
                                array = array.filter(x=>x.startsWith("COMMON"))[0];
                                if (array) return;
        
                                if (database[item_name]) {
                                    item_price += database[item_name] * x.Count.value;
                                }
                            });
                        } else if (objectPath.has(item, 'tag.ExtraAttributes.medium_backpack_data')) {
                            let data = await processBackpack(item.tag.ExtraAttributes.medium_backpack_data)
                            
                            data.forEach(x => {
                                if (!x.tag || !x.tag.value || !x.tag.value.display || !x.tag.value.display.value || !x.tag.value.display.value.Name || !x.tag.value.display.value.Name.value) return;
                                let item_name = x.tag.value.display.value.Name.value ? x.tag.value.display.value.Name.value.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                                if (!item_name) return;
        
                                let array = x.tag.value.display.value.Lore.value.value.map(x=>x.replace(/§[0-9a-zA-Z]/g, '').trim());
                                array = array.filter(x=>x.startsWith("COMMON"))[0];
                                if (array) return;
        
                                if (database[item_name]) {
                                    item_price += database[item_name] * x.Count.value;
                                }
                            });
                        } else if (objectPath.has(item, 'tag.ExtraAttributes.small_backpack_data')) {
                            let data = await processBackpack(item.tag.ExtraAttributes.small_backpack_data)
                            
                            data.forEach(x => {
                                if (!x.tag || !x.tag.value || !x.tag.value.display || !x.tag.value.display.value || !x.tag.value.display.value.Name || !x.tag.value.display.value.Name.value) return;
                                let item_name = x.tag.value.display.value.Name.value ? x.tag.value.display.value.Name.value.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                                if (!item_name) return;
        
                                let array = x.tag.value.display.value.Lore.value.value.map(x=>x.replace(/§[0-9a-zA-Z]/g, '').trim());
                                array = array.filter(x=>x.startsWith("COMMON"))[0];
                                if (array) return;
        
                                if (database[item_name]) {
                                    item_price += database[item_name] * x.Count.value;
                                }
                            });
                        }
                    }
        
                    // Hot Potato
                    if (item.tag.ExtraAttributes.hot_potato_count) item_price += HOT_POTATO_BOOK * item.tag.ExtraAttributes.hot_potato_count;
        
                    // Enchantments
                    let enchantments = [];
                    if (item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
                    if (enchantments.length > 0) enchantments.forEach(async x => {
                        let roman = this.client.romanize(x[1]);
                        if (!roman) return;
                        else if (ENCHANTMENTS[x[0].titleCase().replace(/ /g, "_")]) item_price += ENCHANTMENTS[x[0].toUpperCase().replace(/ /g, "_")][roman];
                    });
        
                    if (item_name.toUpperCase().replace(/ +/g, '_').replace(/\'/, '').endsWith("MIDAS_SWORD")) {
                        players_networth += item.tag.ExtraAttributes.winning_bid || 0;
                        item_price += item.tag.ExtraAttributes.winning_bid || 0;
                        inventory.push({ name: item_name, cost: item_price || 0, count: 1 });
                    } else if (database[item_name]) {
                        players_networth += item_price * item.Count || 0;
                        inventory.push({ name: item_name, cost: item_price * item.Count || 0, count: item.Count });
                    } else return;
                });
        
                // Pushing talismans to the talismans array.
                if (items.talismans.length > 0) items.talismans.forEach(async item => {
                    if (!item.tag) return;
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    if (!item_name) return;
                    
                    let talisman_id = item.tag.ExtraAttributes ? item.tag.ExtraAttributes.id : null;
        
                    if (database[item_name]) {
                        players_networth += database[item_name];
                        talismans.push({ name: item_name.replace(/\�\�\�/g, '').replace(/\�\�\�/g, ''), cost: await database[item_name] || 0, count: 1 })
                    } else if (talisman_id) {
                        if (talisman_id.match(/\_[0-9]/g) && talisman_id.match(/\_[0-9]/g).length > 0) {
                            let name = talisman_id.split("_");
                            if (!TALISMANS[`${name[0]}_${name[1]}`][name[2]]) return;
                            players_networth += TALISMANS[`${name[0]}_${name[1]}`][name[2]];
                            talismans.push({ name: item_name.replace(/\�\�\�/g, '').replace(/\�\�\�/g, ''), cost: await TALISMANS[`${name[0]}_${name[1]}`][name[2]] || 0, count: 1 })
                        } else {
                            if (!TALISMANS[talisman_id]) return;
                            players_networth += TALISMANS[talisman_id];
                            talismans.push({ name: item_name.replace(/\�\�\�/g, '').replace(/\�\�\�/g, ''), cost: await TALISMANS[talisman_id] || 0, count: 1 })
                        }
                        
                    } else return;
                });
                
                // console.log(stats.dungeons)
        
                // Pushing pets to the pets array.
                if (stats.pets.length > 0) stats.pets.forEach(async pet => {
                    if (!pet.display_name) return;
                    let item_price = await database[`[Lvl ${pet.level.level}] ${pet.display_name}`];
                    if (!item_price) return;
        
                    if (pet.heldItem) {
                        let pet_item = await fetch(`https://api.slothpixel.me/api/skyblock/auctions/${pet.heldItem}?key=${config.tokens.slothpixel}`).then(x => x.json())
                            .then(x => x.json())
                            .catch(() => { return });
                        
                        if (pet_item) item_price += !pet_item.standard_deviation || pet_item.standard_deviation == 0 ? pet_item.average_price : pet_item.standard_deviation;
                    }
        
                    players_networth += item_price;
                    pets.push({ name: `[${pet.level.level == 100 ? "**Lvl 100**" : `Lvl ${pet.level.level}`}] ${pet.rarity.titleCase()} ${pet.display_name}`, cost: item_price || 0 });
                });
        
                setTimeout(async function () {            
                    let inventoryList = inventory.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} - $${x.cost.toLocaleString()}`).join('\n'),
                    talismansList = talismans.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} - $${x.cost.toLocaleString()}`).join('\n'),
                    petsList = pets.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} - $${x.cost.toLocaleString()}`).join('\n'),
                    armorList = armor.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} - $${x.cost.toLocaleString()}`).join('\n'),
                    enderList = enderchest.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} - $${x.cost.toLocaleString()}`).join('\n')

                    if (armorList.length > 1024) armorList = armorList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (inventoryList.length > 1024) inventoryList = inventoryList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (talismansList.length > 1024) talismansList = talismansList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (petsList.length > 1024) petsList = petsList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (enderList.length > 1024) enderList = enderList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";

                    templateEmbed
                        .setAuthor(`Networth Calculator for\n${profileChecking.displayname} ${rankTitle ? `[${rankTitle}] ` : ""}[${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}]`, `https://mc-heads.net/avatar/${profileChecking.displayname}`, `https://sky.shiiyu.moe/stats/${profileChecking.displayname}/${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}`)
                        .setThumbnail(`https://mc-heads.net/avatar/${profileChecking.displayname}`)
                        .setDescription(`
${await client.getEmoji('coin', 'string')} Purse: $${Math.floor(profile.coin_purse).toLocaleString()}
${await client.getEmoji('bank', 'string')} Bank: ${!skyblockData.profile.banking ? "Bank API is **disabled**" : `$${Math.floor(skyblockData.profile.banking.balance).toLocaleString()}` }
${await client.getEmoji('maddoxbatphone', 'string')} Slayers: $${stats.slayer_coins_spent.total ? stats.slayer_coins_spent.total.toLocaleString() : 0}
${await client.getEmoji('magnify', 'string')} Networth: ${players_networth ? `$${players_networth.toLocaleString()}` : "Error when calculating your networth"}`)
                        .setFooter(stats.slayer_coins_spent.total && stats.slayer_coins_spent.total > 10000000 ? "" : "")
                    if (inventory.length > 0) templateEmbed.addField(`Inventory ($${inventory.map(x=>x.cost).reduce((a, b) => a + b).toLocaleString()})`, inventoryList);
                    if (armor.length > 0) templateEmbed.addField(`Armor ($${armor.map(x=>x.cost).reduce((a, b) => a + b).toLocaleString()})`, armorList);
                    if (talismans.length > 0) templateEmbed.addField(`Talismans ($${talismans.map(x=>x.cost).reduce((a, b) => a + b).toLocaleString()})`, talismansList);
                    if (enderchest.length > 0) templateEmbed.addField(`Enderchest ($${enderchest.map(x=>x.cost).reduce((a, b) => a + b).toLocaleString()})`, enderList);
                    if (pets.length > 0) templateEmbed.addField(`Pets ($${pets.map(x=>x.cost).reduce((a, b) => a + b).toLocaleString()})`, petsList);
                    tempMessage.delete().catch(() => { return });
                    message.channel.send(templateEmbed).catch(() => { return });
                }, 5000)

    }
}
module.exports = Networth;   