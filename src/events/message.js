const Logger = require("@ayana/logger");
const { MessageEmbed } = require("discord.js");
const prettyms = require("pretty-ms");
const ms = require('ms');
const ms2 = require('parse-ms');
const config = require('../../config.json');
const doMsg = async (client, message) => {
    if (message.author.bot || !message.guild) return;
    let prefix = client.token == config.tokens.main || client.token == config.tokens.backup ? "alpha " : "alp ";
    
    if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;
    const { content, flags } = parseFlags(message.content);
    message.content = content;
    message.flags = flags;
    let args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
    let templateEmbed = new MessageEmbed()
        .setColor(client.settings.color)

    const commandWebhook = await client.fetchWebhook('722994513492050010', config.tokens.command_webhook)
    const embedCommand = new MessageEmbed()
        .setColor(client.settings.color)

    // Contributors can only use the bot if its in development.
    if (client.token == config.tokens.development && !message.member.roles.cache.has("717291908031971428")) return;

    if (message.guild) {
        // Cooldown Checker
        if (!cmd) return;
        if (client.settings.disabledCommands.includes(cmd.name) || client.settings.disabledCommands.includes(cmd.aliases))
            return message.channel.send(`**Sorry this command is temporarily disabled**\n\nJoin our support server for updates: https://discord.gg/PJy6YF4`)
        const check = client.storage.cooldown.get(message.author.id + message.guild.id + cmd.name);
        let cooldown = cmd.cooldown;
        if (check && cooldown - (Date.now() - check) > 0) {
            const p = ms2(cooldown - (Date.now() - check));
            return message.channel.send(`Uh Oh, looks like you're in **cooldown**\nYou can use this command in ${p.hours ? `**${p.hours} hours ${p.minutes} minutes and ${p.seconds} seconds**` : p.minutes ? `**${p.minutes} minutes** and **${p.seconds} seconds**` : `**${p.seconds} seconds**`}`);
        }
        if (!cmd || cmd.devOnly && !config.devs.includes(message.author.id)) return;

        if (!config.devs.includes(message.author.id) && !message.member.permissions.has(cmd.userPermission)) return message.channel.send(templateEmbed.setDescription(`Missing Permissions: \`${cmd.userPermission}\``));
        else if (!config.devs.includes(message.author.id) && !message.guild.me.permissions.has(cmd.userPermission)) return message.channel.send(templateEmbed.setDescription(`Missing Permissions: \`${cmd.userPermission}\``))

        embedCommand
            .setAuthor(`${message.author.tag} • ${config.tokens.development == client.token ? "Development" : "Main"}`, message.author.displayAvatarURL())
            .setThumbnail(message.guild.iconURL())
            .setDescription(`
**User**: ${message.author.tag} [\`${message.author.id}\`]
**Guild**: ${message.guild.name} [\`${message.guild.id}\`]
**Channel**: ${message.channel.name} [\`${message.channel.id}\`]
\`\`\`fix
${message.content}
\`\`\``)
            .setTimestamp()
            .setFooter(`${cmd.name.titleCase()}`)
        if (commandWebhook) commandWebhook.send(embedCommand);

        update(client, cmd.name);

        if (client.settings.custom) message.channel.send(client.settings.custom);
        else if (Math.random() > .5 && cmd.autoTip && !client.settings.stream) message.channel.send(config.tips[Math.floor(Math.random() * config.tips.length)].replace("{discord}", await client.getEmoji('discord', 'string')).replace("{pj}", await client.getEmoji('projectalpha', 'string')).replace("{patreon}", await client.getEmoji('patreon', 'string')));
        cmd.exec(message, args, templateEmbed, prefix);
        if (!config.devs.includes(message.author.id)) client.storage.cooldown.set(message.author.id + message.guild.id + cmd.name, Date.now());
    }
};


module.exports = class message {
    static async run(client, message) {
        try { doMsg(client, message); } catch (e) {}
    }
};

const update = async (client, name) => {
    let database = await client.comp('mongo').database.findOne({ id: "commands" });
    database = database.commandsUsed;

    if (!database[name]) database[name] = 0;
    database[name] += 1;
    client.comp('mongo').database.updateOne({ id: "commands" }, { $set: { commandsUsed: database} });
}

const parseFlags = (str) => {
    let flags = {},
        value;

    const withQuotes = /\s--(\S{2,})=("[^"]+"|'[^']+')/gi;

    while (value = withQuotes.exec(str)) flags[value[1]] = value[2].slice(1, -1);
    str = str.replace(withQuotes, '');

    const withoutQuotes = /\s-([^\s=]{2,})(?:=(\S+))?/gi;
    str = str.replace(withoutQuotes, '');

    const shortReg = /\s-(\S+)/gi;

    while (value = shortReg.exec(str))
        for (value of value[1]) flags[value] = true;
    str = str.replace(shortReg, '');

    return {
        flags,
        content: str,
    };
};