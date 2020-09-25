class Command {
    constructor(client, options) {
      this.client = client;
      this.name = options.name || null;
      this.description = options.description || null;
      this.aliases = options.aliases || [];
      this.category = options.category || "Uncategorized";
      this.cooldown = options.cooldown || 1000;
      this.devOnly = options.devOnly || false;
      this.needsAPI = options.needsAPI || false;
      this.autoTip = options.autoTip || false;
      this.userPermission = options.userPermission || "SEND_MESSAGES";
      this.botPermission = options.botPermission || "SEND_MESSAGES"
      this.usage = options.usage || `alpha ${options.name ? options.name : "??"}`
    }
  }
  
  module.exports = { Command };