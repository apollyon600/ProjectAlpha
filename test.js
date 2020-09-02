const config = require('./config.json');
const { Client } = require("discord.js");
const client = new Client();

client.on("ready", () => {
    console.log("[LOGGING] THE BOT IS ONLINE")
});

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.on("debug", (e) => console.info(e));

client.on("message", msg => {
    if (msg.content == 'start') msg.channel.send("YES")
})

client.login(config.tokens.development).catch(console.error);