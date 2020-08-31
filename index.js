const { ClientStructure } = require("./src/structures/ClientStructure.js");
const { CommandLoader } = require("./src/structures/CommandLoader.js");
const config = require('./config.json');
const Logger = require("@ayana/logger");
const client = new ClientStructure(config.tokens.development);
const DBL = require("dblapi.js");   
CommandLoader.loadCommands(client);
CommandLoader.loadEvents(client);
client.start();

if (config.tokens.main == client.token) {
    const dbl = new DBL(config.tokens.DBL, client);
    dbl.on('posted', () => {
            Logger.get("DBL / top.gg").info(`Server Count Posted`);
    });
    
    dbl.on('error', e => {
        Logger.get("DBL / top.gg").info(`An error occured with DBL:\n${e}`);
    });

    String.prototype.getDBL = function() {
        return dbl;
    }
}

String.prototype.titleCase = function() {
    var splitStr = this.toLowerCase()
        .split(" ");
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] =
            splitStr[i].charAt(0)
            .toUpperCase() + splitStr[i].substring(1);
    }
    return splitStr.join(" ");
};