const { Command } = require('../../structures/CommandStructure.js');
const { MessageEmbed } = require("discord.js");
const config = require("../../../config.json");
const lib = require("../../constants/Lib.js");
const objectPath = require("object-path");
const util = require("util")
const fetch = require("node-fetch");
const prettyms = require("pretty-ms");
const nbt = require('prismarine-nbt');
const { ENCHANTMENTS } = require('../../constants/Prices.js');
const { TALISMANS } = require('../../constants/Prices.js');
const Helper = require('../../constants/Helper.js');
const { rootCertificates } = require('tls');
class Networth extends Command {
    constructor(client) {
        super(client, {
            name: "networth",
            aliases: ["net", "nw", "calc", "calculate", "check"],
            usage: "alpha networth [ign]",
            description: "Check a players networth",
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
        
                let data = await Helper.getPlayer(message, args[0], args[1]);
                let profile = data.profile;
                let profiles = data.profiles;
                let skyblockData = data.skyblockData;
                let profileChecking = data.profileChecking;
                let items = await lib.getItems(profile);
                let stats = await lib.getStats(profile, items, profileChecking);

                // Transferring to Not Enough Updates "API"
                // https://moulberry.github.io/files/auc_avg_jsons/average_3day.json
                let api = await fetch("https://moulberry.github.io/files/auc_avg_jsons/average_3day.json").then(x => x.json());
                if (!api) return message.channel.send("An error occured when requesting form `https://moulberry.github.io/files/auc_avg_jsons/average_3day.json`");

                if (items.no_inventory) return message.channel.send(`Sorry, I couldn't calculate the networth of **${profileChecking.displayname} [\`${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}\`]** because their API is disabled.`)
                let tempMessage = await message.channel.send(`Calculating networth for **${profileChecking.displayname} [\`${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}\`]**`);

                let players_networth = 0;
        
                players_networth += Math.floor(profile.coin_purse);
                if (skyblockData.profile.banking) players_networth += Math.floor(skyblockData.profile.banking.balance);
        
                let database = {};

                Object.entries(api.bazaar).forEach(data => {
                    database[data[0]] = Math.floor(data[1].avg_buy);
                });

                Object.entries(api.item_data).forEach(data => {
                    database[data[0]] = Math.floor(data[1].price);
                });

                database["JUMBO_BACKPACK"] = 1000000;

                //console.log(require("util").inspect(database, { "depth": 1 }));

                const HOT_POTATO_BOOK = database["HOT_POTATO_BOOK"];
                const FUMING_POTATO_BOOK = database["FUMING_POTATO_BOOK"];
                const RECOMB = database["RECOMBOBULATOR_3000"];
        
                let pets = [], armor = [], enderchest = [], talismans = [], inventory = [];

                // Enderchest
                if (items.enderchest.length > 0) items.enderchest.forEach(async item => {
                    if (!item.tag || !item.tag.ExtraAttributes) return;
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    let item_id = item.tag.ExtraAttributes.id;
                    let item_price = database[item_id] || 0;
                    if (!item_price || item_price <= 0) return;

                    // Checking if the item is recombobulated.
                    let recombobulated = isRecombobulated(item);
                    if (recombobulated) item_price += RECOMB;

                    // Checking for Hot Potato Books
                    let { hot_potato_book, fuming_potato_book } = getHotPotato(item);
                    item_price += hot_potato_book * HOT_POTATO_BOOK;
                    item_price += fuming_potato_book * FUMING_POTATO_BOOK;

                    // Checking for enchantments
                    item_price += getEnchantments(item) || 0;

                    // Backpack Checking
                    item_price += await checkBackpack(item, item_name, database) || 0;

                    players_networth += item_price || 0;
                    enderchest.push({ name: item_name, price: item_price * item.Count || 0, isRecomb: isRecombobulated(item), count: item.Count });
                });

                // Inventory
                if (items.inventory.length > 0) items.inventory.forEach(async item => {
                    if (!item.tag || !item.tag.ExtraAttributes) return;
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;

                    // Blacklisted Item
                    if (item_name.includes("SkyBlock Menu")) return;

                    let item_id = item.tag.ExtraAttributes.id;
                    let item_price = item_name.includes("Midas") ? parseInt(item.tag.ExtraAttributes.winning_bid) : parseInt(database[item_id]);
                    if (!item_price || item_price <= 0) return;

                    // Checking if the item is recombobulated.
                    let recombobulated = isRecombobulated(item);
                    if (recombobulated) item_price += RECOMB;

                    // Checking for Hot Potato Books
                    let books = getHotPotato(item);
                    item_price += books.hot_potato_book * HOT_POTATO_BOOK;
                    item_price += books.fuming_potato_book * FUMING_POTATO_BOOK;

                    // Checking for enchantments
                    item_price += getEnchantments(item) || 0;

                    // Backpack Checking
                    item_price += await checkBackpack(item, item_name, database) || 0;

                    players_networth += item_price || 0;
                    inventory.push({ name: item_name, price: item_price * item.Count || 0, isRecomb: isRecombobulated(item), count: item.Count });
                });

                // Armor
                if (items.armor.length > 0) items.armor.forEach(async item => {
                    if (!item.tag || !item.tag.ExtraAttributes) return;
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    let item_id = item.tag.ExtraAttributes.id;
                    let item_price = parseInt(database[item_id]);
                    if (!item_price || item_price <= 0) return;

                    // Checking if the item is recombobulated.
                    let recombobulated = isRecombobulated(item);
                    if (recombobulated) item_price += RECOMB;

                    // Checking for Hot Potato Books
                    let books = getHotPotato(item);
                    item_price += books.hot_potato_book * HOT_POTATO_BOOK;
                    item_price += books.fuming_potato_book * FUMING_POTATO_BOOK;

                    // Checking for enchantments
                    item_price += getEnchantments(item) || 0;

                    // Backpack Checking
                    item_price += await checkBackpack(item, item_name, database) || 0;

                    players_networth += item_price || 0;
                    armor.push({ name: item_name, price: item_price * item.Count || 0, isRecomb: isRecombobulated(item), count: item.Count });
                });

                // Wardrobe
                if (items.wardrobe.length > 0) items.wardrobe.forEach(async item => {
                    if (!item.tag || !item.tag.ExtraAttributes) return;
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    let item_id = item.tag.ExtraAttributes.id;
                    let item_price = parseInt(database[item_id]);
                    if (!item_price || item_price <= 0) return;

                    // Checking if the item is recombobulated.
                    let recombobulated = isRecombobulated(item);
                    if (recombobulated) item_price += RECOMB;

                    // Checking for Hot Potato Books
                    let books = getHotPotato(item);
                    item_price += books.hot_potato_book * HOT_POTATO_BOOK;
                    item_price += books.fuming_potato_book * FUMING_POTATO_BOOK;

                    // Checking for enchantments
                    item_price += getEnchantments(item) || 0;

                    // Backpack Checking
                    item_price += await checkBackpack(item, item_name, database) || 0;

                    players_networth += item_price || 0;
                    wardrobe.push({ name: item_name, price: item_price * item.Count || 0, isRecomb: isRecombobulated(item), count: item.Count });
                });
        
                // Pushing talismans to the talismans array.
                if (items.talismans.length > 0) items.talismans.forEach(async item => {
                    if (!item.tag || !item.tag.ExtraAttributes) return;
                    let item_name = item.tag.display.Name ? item.tag.display.Name.replace(/§[0-9a-zA-Z]/g, '').trim() : null;
                    let item_id = item.tag.ExtraAttributes.id;
        
                    // Checking if the item is recombobulated.
                    let recombobulated = isRecombobulated(item);
                    if (recombobulated) players_networth += RECOMB;

                    if (database[item_id]) {
                        players_networth += database[item_id];
                        talismans.push({ name: item_name.replace(/\�\�\�/g, '').replace(/\�\�\�/g, ''), price: await database[item_id] || 0, count: 1, isRecomb: isRecombobulated(item) })
                    } else if (item_id) {
                        if (item_id.match(/\_[0-9]/g) && item_id.match(/\_[0-9]/g).length > 0) {
                            let name = item_id.split("_");
                            if (!TALISMANS[`${name[0]}_${name[1]}`][name[2]]) return;
                            players_networth += TALISMANS[`${name[0]}_${name[1]}`][name[2]];
                            talismans.push({ name: item_name.replace(/\�\�\�/g, '').replace(/\�\�\�/g, ''), price: await TALISMANS[`${name[0]}_${name[1]}`][name[2]] || 0, count: 1, isRecomb: isRecombobulated(item) })
                        } else {
                            if (!TALISMANS[item_id]) return;
                            players_networth += TALISMANS[item_id];
                            talismans.push({ name: item_name.replace(/\�\�\�/g, '').replace(/\�\�\�/g, ''), price: await TALISMANS[item_id] || 0, count: 1, isRecomb: isRecombobulated(item) })
                        }
                    }
                });

                // Pets
                if (stats.pets.length > 0) stats.pets.forEach(async pet => {
                    if (!pet.display_name) return;
                    let item_price = await database[`${pet.type};${pet.tier == "LEGENDARY" ? "4" : pet.tier == "EPIC" ? "3" : pet.tier == "RARE" ? "2" : pet.tier == "UNCOMMON" ? "1" : "0"}`];
                    if (!item_price || item_price <= 0) return;
                    
                    if (pet.heldItem) {
                        let pet_item = await fetch(`https://api.slothpixel.me/api/skyblock/auctions/${pet.heldItem}?key=${config.tokens.slothpixel}`).then(x => x.json())
                            .then(x => x.json())
                            .catch(() => { return });
                        
                        if (pet_item) item_price += !pet_item.standard_deviation || pet_item.standard_deviation == 0 ? pet_item.average_price : pet_item.standard_deviation;
                    }

                    players_networth += item_price || 0;
                    pets.push({ name: `[${pet.level.level == 100 ? "**Lvl 100**" : `Lvl ${pet.level.level}`}] ${pet.rarity.titleCase()} ${pet.display_name}`, price: item_price || 0 });
                });

                // Cookie Price
                let cookie = await fetch("https://sky.lea.moe/api/v2/bazaar").then(x=>x.json()).then(x=>x.BOOSTER_COOKIE.price);

                // coins / cookie * 2.75
                setTimeout(async function () {            
                    let inventoryList = inventory.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} ${x.isRecomb ? "**[R]**" : ""} - $${x.price.toLocaleString()} (**$${((x.price / cookie) * 2.75).toFixed(2)}**)`).join('\n'),
                    talismansList = talismans.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} ${x.isRecomb ? "**[R]**" : ""} - $${x.price.toLocaleString()} (**$${((x.price / cookie) * 2.75).toFixed(2)}**)`).join('\n'),
                    petsList = pets.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} - $${x.price.toLocaleString()} (**$${((x.price / cookie) * 2.75).toFixed(2)}**)`).join('\n'),
                    armorList = armor.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} ${x.isRecomb ? "**[R]**" : ""} - $${x.price.toLocaleString()} (**$${((x.price / cookie) * 2.75).toFixed(2)}**)`).join('\n'),
                    enderList = enderchest.map(x=>`${x.count > 1 ? `**[x${x.count}]** ` : ""}${x.name} ${x.isRecomb ? "**[R]**" : ""} - $${x.price.toLocaleString()} (**$${((x.price / cookie) * 2.75).toFixed(2)}**)`).join('\n')

                    if (armorList.length > 1024) armorList = armorList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (inventoryList.length > 1024) inventoryList = inventoryList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (talismansList.length > 1024) talismansList = talismansList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (petsList.length > 1024) petsList = petsList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";
                    if (enderList.length > 1024) enderList = enderList.slice(0, 1000).split("\n").reverse().slice(1).reverse().join("\n").trim() + "\n***and many more..***";

                    templateEmbed
                        .setAuthor(`Networth Calculator for\n${profileChecking.displayname} [${PROFILE_EMOJIS[profileChecking.stats.SkyBlock.profiles[profiles].cute_name]} ${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}]`, `https://mc-heads.net/avatar/${profileChecking.displayname}`, `https://sky.shiiyu.moe/stats/${profileChecking.displayname}/${profileChecking.stats.SkyBlock.profiles[profiles].cute_name}`)
                        .setThumbnail(`https://crafatar.com/avatars/${profileChecking.uuid.replace(/-/g, "")}?size=128&overlay`)
                        .setDescription(`
${await client.getEmoji('coin', 'string')} Purse: $${Math.floor(profile.coin_purse).toLocaleString()}
${await client.getEmoji('bank', 'string')} Bank: ${!skyblockData.profile.banking ? "Bank API is **disabled**" : `$${Math.floor(skyblockData.profile.banking.balance).toLocaleString()}` }
${await client.getEmoji('maddoxbatphone', 'string')} Slayers: $${stats.slayer_coins_spent.total ? stats.slayer_coins_spent.total.toLocaleString() : 0}
${await client.getEmoji('magnify', 'string')} Networth: ${players_networth ? `$${players_networth.toLocaleString()}` : "Error when calculating your networth"}`)
                    if (inventory.length > 0) templateEmbed.addField(`Inventory ($${inventory.map(x=>x.price).reduce((a, b) => a + b).toLocaleString()}) (**$${(inventory.map(x=>x.price).reduce((a, b) => (a + b) / cookie) * 2.75).toFixed(2)}**)`, inventoryList);
                    if (armor.length > 0) templateEmbed.addField(`Armor ($${armor.map(x=>x.price).reduce((a, b) => a + b).toLocaleString()}) (**$${(armor.map(x=>x.price).reduce((a, b) => (a + b) / cookie) * 2.75).toFixed(2)}**)`, armorList);
                    if (talismans.length > 0) templateEmbed.addField(`Talismans ($${talismans.map(x=>x.price).reduce((a, b) => a + b).toLocaleString()}) (**$${(talismans.map(x=>x.price).reduce((a, b) => (a + b) / cookie) * 2.75).toFixed(2)}**)`, talismansList);
                    if (enderchest.length > 0) templateEmbed.addField(`Enderchest ($${enderchest.map(x=>x.price).reduce((a, b) => a + b).toLocaleString()}) (**$${(enderchest.map(x=>x.price).reduce((a, b) => (a + b) / cookie) * 2.75).toFixed(2)}**)`, enderList);
                    if (pets.length > 0) templateEmbed.addField(`Pets ($${pets.map(x=>x.price).reduce((a, b) => a + b).toLocaleString()}) (**$${(pets.map(x=>x.price).reduce((a, b) => (a + b) / cookie) * 2.75).toFixed(2)}**)`, petsList);
                    tempMessage.delete().catch(() => { return });
                    message.channel.send(templateEmbed)
                }, 5000)
                
    }
}

function isRecombobulated(item) {
    if(Helper.hasPath(item, 'tag', 'ExtraAttributes', 'rarity_upgrades')){
        const { rarity_upgrades } = item.tag.ExtraAttributes;

        if(rarity_upgrades > 0)
            return true;
    }
    return false;
}

function getEnchantments(item) {
    let enchants = ENCHANTMENTS;
    let enchantments = [];
    let cost = 0;
    if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.enchantments) enchantments = Object.entries(item.tag.ExtraAttributes.enchantments);
    if (enchantments.length > 0) enchantments.forEach(async x => {
        let roman = romanize(x[1]);
        if (enchants[x[0].titleCase().replace(/ /g, "_")]) cost += enchants[x[0].toUpperCase().replace(/ /g, "_")] ? enchants[x[0].toUpperCase().replace(/ /g, "_")][roman] : 0;
    });
    return cost || 0;
}

function romanize(num) {
    if (!+num)
        return false;
    var digits = String(+num)
        .split(""),
        key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
         "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
         "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1)
        .join("M") + roman;
};

function getHotPotato(item) {
    let hot_potato_book = 0
    let fuming_potato_book = 0

    if (item.tag.ExtraAttributes && item.tag.ExtraAttributes.hot_potato_count) {
        if (item.tag.ExtraAttributes.hot_potato_count > 10) {
            fuming_potato_book = item.tag.ExtraAttributes.hot_potato_count - 10;
        }
        hot_potato_book = item.tag.ExtraAttributes.hot_potato_count;
    }
    return { hot_potato_book, fuming_potato_book };
}

const processBackpack = backpack => {
    const promise = new Promise((resolve, reject) => {
      const buffer = Buffer.from(backpack);
  
      nbt.parse(buffer, (e, d) => {
        resolve(d.value.i.value.value);
      });
    });
    return promise;
}

async function checkBackpack(item, item_name, database) {
    let price = 0;
    if (item_name.endsWith("Backpack")) {
        if (!item.tag) return;
        
            let data = null;
            if (objectPath.has(item, "tag.ExtraAttributes.greater_backpack_data")) data = await processBackpack(item.tag.ExtraAttributes.greater_backpack_data);
            else if (objectPath.has(item, "tag.ExtraAttributes.medium_backpack_data")) data = await processBackpack(item.tag.ExtraAttributes.medium_backpack_data);
            else if (objectPath.has(item, "tag.ExtraAttributes.small_backpack_data")) data = await processBackpack(item.tag.ExtraAttributes.small_backpack_data);
            if (!data) return;
            
            data.forEach(x => {
                if (!x.tag || !x.tag.value || !x.tag.value.ExtraAttributes || !x.tag.value.ExtraAttributes.value || !x.tag.value.ExtraAttributes.value.id || !x.tag.value.ExtraAttributes.value.id.value) return;
                let id = x.tag.value.ExtraAttributes.value.id.value ? x.tag.value.ExtraAttributes.value.id.value.replace(/§[0-9a-zA-Z]/g, '').trim() : "UNKNOWN";
                price += database[id] || 0;
            });
        }
    return price || 0;
}

module.exports = Networth;