const { walk } = require("walk");
const { resolve } = require("path");

class CommandLoader {
  static loadCommands(client) {
    const walker = walk("./src/commands");
    walker.on("file", (root, stats, next) => {
      if (!stats.name.endsWith(".js")) return next();
      const Command = require(`${resolve(root)}/${stats.name}`);
      const command = new Command(client);
      if (!command.exec) return next();
      command.aliases.forEach(a => client.aliases.set(a, command.name));
      client.commands.set(command.name, command);
      next();
    });
    walker.on("errors", error => {
      console.log(error);
    });
  }

  static loadEvents(client) {
    const eventwalker = walk("./src/events");
    eventwalker.on("file", (root, stats, next) => {
      const Event = require("../events/" + stats.name);
      client.on(stats.name.split(".")[0], (...args) =>
        Event.run(client, ...args)
      );
      next();
    });
    eventwalker.on("errors", error => {
      console.log(error);
    });
  }
}

module.exports = { CommandLoader };