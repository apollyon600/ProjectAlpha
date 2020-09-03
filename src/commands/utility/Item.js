const { Command } = require('../../structures/CommandStructure.js');
const { RichEmbed } = require('discord.js');
const config = require("../../../config.json");
const lib = require("../../constants/Lib.js");
const fetch = require('node-fetch');
class Item extends Command {
    constructor(client) {
        super(client, {
            name: "item",
            aliases: ['items'],
            description: "View an item's information.",
            category: "Utility",
            needsAPI: true,
            autoTip: true,
            cooldown: 5000
        });
    }
    async exec(message, args, templateEmbed) {

        if (!args.join(' ')) return message.channel.send("Invalid Arguments to search an items price: `alpha price [itemname]`")

        let items_id = await fetch("https://auctions.craftlink.xyz/api/items/all")
            .then(res => res.json())
            .catch(() => { return message.channel.send(`GET request for \`https://auctions.craftlink.xyz/api/items/all\` failed, API is down?`); });
        items_id = items_id.data;
        
        let deletedMessage = await message.channel.send(`Fetching the information for the item: \`${args.join(' ')}\``);

        let item_array = Object.values(items_id), estimated = null;
        item_array = item_array.filter(x=>x.name.toLowerCase().includes(args.join(" ").toLowerCase()));

        let index = Math.floor(Math.random() * item_array.length);

        if (!item_array.length > 0) return deletedMessage.edit(`Sorry, the item you searched: \`${args.join(" ")}\` cannot be found.`)
        if (item_array.length > 1) estimated = item_array[index].name;

        if (estimated) deletedMessage.edit(`Couldn't find an exact match for: \`${args.join(' ')}\`, using our AI searcher to find an estimated item.`);

        let item_data = await fetch(`https://auctions.craftlink.xyz/api/items/${item_array[index]._id}/quickStats`)
            .then(res => res.json())
            .catch(() => { return message.channel.send(`GET request for \`https://auctions.craftlink.xyz/api/items/${item_array[index]._id}/quickStats\` failed, API is down?`)})

        item_data = item_data.data;

        sendPrice(item_data, estimated);

        function sendPrice(item_data, estimated) {
            deletedMessage.delete();
            try {
            return message.channel.send(
                templateEmbed
                    .setThumbnail(`https://sky.lea.moe/item/${item_data.tag}` || 'https://vignette.wikia.nocookie.net/hypixel-skyblock/images/b/bc/Null_Block.png/revision/latest?cb=20200110153845')
                    .setAuthor(`Item Price for ${item_data.name}`, `https://sky.lea.moe/item/${item_data.tag}` || 'https://vignette.wikia.nocookie.net/hypixel-skyblock/images/b/bc/Null_Block.png/revision/latest?cb=20200110153845')
                    .setDescription(estimated ? `Did you mean **${estimated}**?` : "")
                    .addField("<:utility:749839780518297702>  Information", `
                    **Name**: ${item_data.name}
                    **Price**: $${Math.floor(item_data.deviation).toLocaleString() || Math.floor(item_data.average).toLocaleString()}`)
                    .addFields([
                        { 
                            name: "<:utility:749839780518297702>  Monthly Statistics", value: `
**Monthly Median**: ${item_data.month.monthMedian ? `$${item_data.month.monthMedian.toLocaleString()}` : "N/A"}
**Monthly Average**: ${item_data.month.monthAverage ? `$${item_data.month.monthAverage.toLocaleString()}` : "N/A"}
**Monthly Deviation**: ${item_data.month.monthDeviation ? `$${item_data.month.monthDeviation.toLocaleString()}` : "N/A"}
**Monthly Mode**: ${item_data.month.monthMode ? `$${item_data.month.monthMode.toLocaleString()}` : "N/A"}
**Monthly Volume**: ${item_data.month.monthVolume ? `$${item_data.month.monthVolume.toLocaleString()}` : "N/A"}`, inline: true
                        },
                        {
                            name: "<:utility:749839780518297702>  Weekly Statistics", value: `
**Weekly Median**: ${item_data.week.weekMedian ? `$${item_data.week.weekMedian.toLocaleString()}` : "N/A"}
**Weekly Average**: ${item_data.week.weekAverage ? `$${item_data.week.weekAverage.toLocaleString()}` : "N/A"}
**Weekly Deviation**: ${item_data.week.weekDeviation ? `$${item_data.week.weekDeviation.toLocaleString()}` : "N/A"}
**Weekly Mode**: ${item_data.week.weekMode ? `$${item_data.week.weekMode.toLocaleString()}` : "N/A"}
**Weekly Volume**: ${item_data.week.weekVolume ? `$${item_data.week.weekVolume.toLocaleString()}` : "N/A"}`, inline: true
                        },
                        {
                            name: "⠀", value: "⠀", inline: true
                        },
                        {
                            name: "<:utility:749839780518297702>  Daily Statistics", value: `
**Daily Median**: ${item_data.day.dayMedian ? `$${item_data.month.dayMedian.toLocaleString()}` : "N/A"}
**Daily Average**: ${item_data.day.dayAverage ? `$${item_data.month.dayAverage.toLocaleString()}` : "N/A"}
**Daily Deviation**: ${item_data.day.dayDeviation ? `$${item_data.month.dayDeviation.toLocaleString()}` : "N/A"}
**Daily Mode**: ${item_data.day.dayMode ? `$${item_data.month.dayMode.toLocaleString()}` : "N/A"}
**Daily Volume**: ${item_data.day.dayVolume ? `$${item_data.month.dayVolume.toLocaleString()}` : "N/A"}`, inline: true
                        },
                        {
                            name: "<:utility:749839780518297702>  Lifetime Statistics", value: `
                            **Average Quantity**: ${item_data.averagQuantity ? `$${item_data.averagQuantity.toLocaleString()}` : "N/A"}
                            **Total Sales**: ${item_data.totalSales ? `$${item_data.totalSales.toLocaleString()}` : "N/A"}
                            **Total Bids**: ${item_data.totalBids ? `$${item_data.totalBids.toLocaleString()}` : "N/A"}
                            **Average Bids**: ${item_data.averageBids ? `$${item_data.averageBids.toLocaleString()}` : "N/A"}
                            **Median**: ${item_data.median ? `$${item_data.median.toLocaleString()}` : "N/A"}
                            **Average**: ${item_data.average ? `$${item_data.average.toLocaleString()}` : "N/A"}
                            **Deviation**: ${item_data.deviation ? `$${item_data.deviation.toLocaleString()}` : "N/A"}
                            **Mode**: ${item_data.mode ? `$${item_data.mode.toLocaleString()}` : "N/A"}`, inline: true
                        },
                        {
                            name: "⠀", value: "⠀", inline: true
                        }
                    ])
            )
                } catch (e) {
                    message.channel.send(templateEmbed.setDescription("An unknown error has occured when trying to fetch the rest of the item information."));
                }
        }
    }
}

module.exports = Item;