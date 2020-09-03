const config = require("../../config.json");
const objectPath = require("object-path");
const constants = require('./Constants.js');
const mcData = require("minecraft-data")("1.8.9");
const moment = require('moment');
const nbt = require('prismarine-nbt');
const util = require("util");
const { v4 } = require('uuid');
const Helper = require('./Helper.js');

// This is literally from LeaPhant, I just recoded it so it benefits the bot.

module.exports = {
    getItems: async (profile) => {
        if (!profile) return;
        const output = {};
    
        // Process inventories returned by API
        let armor = 'inv_armor' in profile ? await getItems2(profile.inv_armor.data) : [];
        let inventory = 'inv_contents' in profile ? await getItems2(profile.inv_contents.data) : [];
        let wardrobe_inventory = 'wardrobe_contents' in profile ? await getItems2(profile.wardrobe_contents.data) : [];
        let enderchest = 'ender_chest_contents' in profile ? await getItems2(profile.ender_chest_contents.data) : [];
        let talisman_bag = 'talisman_bag' in profile ? await getItems2(profile.talisman_bag.data) : [];
        let fishing_bag = 'fishing_bag' in profile ? await getItems2(profile.fishing_bag.data) : [];
        let quiver = 'quiver' in profile ? await getItems2(profile.quiver.data) : [];
        let potion_bag = 'potion_bag' in profile ? await getItems2(profile.potion_bag.data) : [];
        let candy_bag = 'candy_inventory_contents' in profile ? await getItems2(profile.candy_inventory_contents.data) : [];
    
        const wardrobeColumns = wardrobe_inventory.length / 4;
    
        let wardrobe = [];
    
        for (let i = 0; i < wardrobeColumns; i++) {
            let page = Math.floor(i / 9);
    
            let wardrobeSlot = [];
    
            for (let j = 0; j < 4; j++) {
                let index = (36 * page) + (i % 9) + (j * 9);
    
                if (getId(wardrobe_inventory[index])
                    .length > 0)
                    wardrobeSlot.push(wardrobe_inventory[index]);
                else
                    wardrobeSlot.push(null);
            }
    
            if (wardrobeSlot.filter(a => a !== null)
                .length > 0)
                wardrobe.push(wardrobeSlot);
        }
    
        output.armor = armor.filter(a => Object.keys(a)
            .length != 0);
        output.wardrobe = wardrobe;
        output.wardrobe_inventory = wardrobe_inventory;
        output.inventory = inventory
        output.enderchest = enderchest;
        output.talisman_bag = talisman_bag;
        output.fishing_bag = fishing_bag;
        output.quiver = quiver;
        output.potion_bag = potion_bag;
    
        const all_items = armor.concat(inventory, enderchest, talisman_bag, fishing_bag, quiver, potion_bag, wardrobe_inventory);
    
        for (const [index, item] of all_items.entries()) {
            item.item_index = index;
            item.itemId = v4('itemId');
    
            if ('containsItems' in item && Array.isArray(item.containsItems))
                item.containsItems.forEach(a => {
                    a.backpackIndex = item.item_index;
                    a.itemId = v4('itemId');
                });
        }
    
        // All items not in the inventory or accessory bag should be inactive so they don't contribute to the total stats
        enderchest = enderchest.map(a => Object.assign({ isInactive: true }, a));
    
        // Add candy bag contents as backpack contents to candy bag
        for (let item of all_items) {
            if (getId(item) == 'TRICK_OR_TREAT_BAG')
                item.containsItems = candy_bag;
        }
    
        const talismans = [];
    
        // Modify talismans on armor
        for (const talisman of armor.filter(a => a.type == 'accessory')) {
            const id = getId(talisman);
    
            if (id === "")
                continue;
    
            talisman.isUnique = true;
            talisman.isInactive = false;
    
            if (talismans.filter(a => !a.isInactive && getId(a) == id)
                .length > 0)
                talisman.isInactive = true;
    
            if (talismans.filter(a => a.tag.ExtraAttributes.id == id)
                .length > 0)
                talisman.isUnique = false;
        }
    
        // Add talismans from inventory
        for (const talisman of inventory.filter(a => a.type == 'accessory')) {
            const id = getId(talisman);
    
            if (id === "")
                continue;
    
            const insertTalisman = Object.assign({ isUnique: true, isInactive: false }, talisman);
    
            if (talismans.filter(a => !a.isInactive && getId(a) == id)
                .length > 0)
                insertTalisman.isInactive = true;
    
            if (talismans.filter(a => a.tag.ExtraAttributes.id == id)
                .length > 0)
                insertTalisman.isUnique = false;
    
            talismans.push(insertTalisman);
        }
    
        // Add talismans from accessory bag if not already in inventory
        for (const talisman of talisman_bag) {
            const id = getId(talisman);
    
            if (id === "")
                continue;
    
            const insertTalisman = Object.assign({ isUnique: true, isInactive: false }, talisman);
    
            if (talismans.filter(a => !a.isInactive && getId(a) == id)
                .length > 0)
                insertTalisman.isInactive = true;
    
            if (talismans.filter(a => a.tag.ExtraAttributes.id == id)
                .length > 0)
                insertTalisman.isUnique = false;
    
            talismans.push(insertTalisman);
        }
    
        // Add inactive talismans from enderchest and backpacks
        for (const item of inventory.concat(enderchest)) {
            let items = [item];
    
            if (item.type != 'accessory' && 'containsItems' in item && Array.isArray(item.containsItems))
                items = item.containsItems.slice(0);
    
            for (const talisman of items.filter(a => a.type == 'accessory')) {
                const id = talisman.tag.ExtraAttributes.id;
    
                const insertTalisman = Object.assign({ isUnique: true, isInactive: true }, talisman);
    
                if (talismans.filter(a => getId(a) == id)
                    .length > 0)
                    insertTalisman.isUnique = false;
    
                talismans.push(insertTalisman);
            }
        }
    
        // Don't account for lower tier versions of the same talisman
        for (const talisman of talismans.concat(armor)) {
            const id = getId(talisman);
    
            if (id.startsWith("CAMPFIRE_TALISMAN_")) {
                const tier = parseInt(id.split("_")
                    .pop());
    
                const maxTier = Math.max(...talismans.filter(a => getId(a)
                        .startsWith("CAMPFIRE_TALISMAN_"))
                    .map(a => getId(a)
                        .split("_")
                        .pop()));
    
                if (tier < maxTier) {
                    talisman.isUnique = false;
                    talisman.isInactive = true;
                }
            }
    
            if (id.startsWith("WEDDING_RING_")) {
                const tier = parseInt(id.split("_")
                    .pop());
    
                const maxTier = Math.max(...talismans.filter(a => getId(a)
                        .startsWith("WEDDING_RING_"))
                    .map(a => getId(a)
                        .split("_")
                        .pop()));
    
                if (tier < maxTier) {
                    talisman.isUnique = false;
                    talisman.isInactive = true;
                }
            }
    
            if (id in constants.talisman_upgrades) {
                const talismanUpgrades = constants.talisman_upgrades[id];
    
                if (talismans.filter(a => !a.isInactive && talismanUpgrades.includes(getId(a)))
                    .length > 0)
                    talisman.isInactive = true;
    
                if (talismans.filter(a => talismanUpgrades.includes(getId(a)))
                    .length > 0)
                    talisman.isUnique = false;
            }
    
            if (id in constants.talisman_duplicates) {
                const talismanDuplicates = constants.talisman_duplicates[id];
    
                if (talismans.filter(a => talismanDuplicates.includes(getId(a)))
                    .length > 0)
                    talisman.isUnique = false;
            }
        }
    
        // Add New Year Cake Bag health bonus (1 per unique cake)
        for (let talisman of talismans) {
            let id = talisman.tag.ExtraAttributes.id;
            let cakes = [];
    
            if (id == 'NEW_YEAR_CAKE_BAG' && objectPath.has(talisman, 'containsItems') && Array.isArray(talisman.containsItems)) {
                talisman.stats.health = 0;
    
                for (let item of talisman.containsItems) {
                    if (objectPath.has(item, 'tag.ExtraAttributes.new_years_cake') && !cakes.includes(item.tag.ExtraAttributes.new_years_cake)) {
                        talisman.stats.health++;
                        cakes.push(item.tag.ExtraAttributes.new_years_cake);
                    }
                }
            }
        }
    
        // Add base name without reforge
        for (const talisman of talismans) {
            talisman.base_name = talisman.display_name;
    
            if (objectPath.has(talisman, 'tag.ExtraAttributes.modifier')) {
    
                talisman.base_name = talisman.display_name ? talisman.display_name.split(" ")
                    .slice(1)
                    .join(" ") : talisman.tag.display.Name.slice(2)
                    .toLowerCase();
                talisman.reforge = talisman.tag.ExtraAttributes.modifier
            }
        }
    
        output.talismans = talismans;
        output.weapons = all_items.filter(a => a.type == 'sword' || a.type == 'bow');
        output.rods = all_items.filter(a => a.type == 'fishing rod');
    
        for (const item of all_items) {
            if (!Array.isArray(item.containsItems))
                continue;
    
            output.weapons.push(...item.containsItems.filter(a => a.type == 'sword' || a.type == 'bow'));
            output.rods.push(...item.containsItems.filter(a => a.type == 'fishing rod'));
        }
    
        // Check if inventory access disabled by user
        if (inventory.length == 0)
            output.no_inventory = true;
    
        // Sort talismans, weapons and rods by rarity
        output.weapons = output.weapons.sort((a, b) => {
            if (a.rarity == b.rarity) {
                if (b.inBackpack)
                    return -1;
    
                return a.item_index > b.item_index ? 1 : -1;
            }
    
            return rarity_order.indexOf(a.rarity) - rarity_order.indexOf(b.rarity)
        });
    
        output.rods = output.rods.sort((a, b) => {
            if (a.rarity == b.rarity) {
                if (b.inBackpack)
                    return -1;
    
                return a.item_index > b.item_index ? 1 : -1;
            }
    
            return rarity_order.indexOf(a.rarity) - rarity_order.indexOf(b.rarity)
        });
    
        const countsOfId = {};
    
        for (const weapon of output.weapons) {
            const id = getId(weapon);
    
            countsOfId[id] = (countsOfId[id] || 0) + 1;
    
            if (countsOfId[id] > 2)
                weapon.hidden = true;
        }
    
        output.talismans = output.talismans.sort((a, b) => {
            const rarityOrder = rarity_order.indexOf(a.rarity) - rarity_order.indexOf(b.rarity);
    
            if (rarityOrder == 0)
                return (a.isInactive === b.isInactive) ? 0 : a.isInactive ? 1 : -1;
    
            return rarityOrder;
        });
    
        let swords = output.weapons.filter(a => a.type == 'sword');
        let bows = output.weapons.filter(a => a.type == 'bow');
    
        let swordsInventory = swords.filter(a => a.backpackIndex === undefined);
        let bowsInventory = bows.filter(a => a.backpackIndex === undefined);
        let rodsInventory = output.rods.filter(a => a.backpackIndex === undefined);
    
        if (swords.length > 0)
            output.highest_rarity_sword = swordsInventory.filter(a => a.rarity == swordsInventory[0].rarity)
            .sort((a, b) => a.item_index - b.item_index)[0];
    
        if (bows.length > 0)
            output.highest_rarity_bow = bowsInventory.filter(a => a.rarity == bowsInventory[0].rarity)
            .sort((a, b) => a.item_index - b.item_index)[0];
    
        if (output.rods.length > 0)
            output.highest_rarity_rod = rodsInventory.filter(a => a.rarity == rodsInventory[0].rarity)
            .sort((a, b) => a.item_index - b.item_index)[0];
    
        if (armor.filter(a => Object.keys(a)
                .length > 2)
            .length == 1) {
            const armorPiece = armor.filter(a => Object.keys(a)
                .length > 1)[0];
    
            output.armor_set = armorPiece.display_name;
            output.armor_set_rarity = armorPiece.rarity;
        }
    
        if (armor.filter(a => Object.keys(a)
                .length > 2)
            .length == 4) {
    
            let output_name = "";
            let reforgeName;
    
            armor.forEach(armorPiece => {
                let name = armorPiece.tag.display.Name;
    
                if (objectPath.has(armorPiece, 'tag.ExtraAttributes.modifier'))
                    name = name.slice(2)
                    .toLowerCase();
    
                armorPiece.armor_name = name;
            });
    
            if (armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.modifier') &&
                    a.tag.ExtraAttributes.modifier == armor[0].tag.ExtraAttributes.modifier)
                .length == 4)
                reforgeName = armor[0].tag.ExtraAttributes.modifier;
    
            const isMonsterSet = armor
                .filter(a => ['SKELETON_HELMET', 'GUARDIAN_CHESTPLATE', 'CREEPER_LEGGINGS', 'SPIDER_BOOTS', 'TARANTULA_BOOTS'].includes(getId(a)))
                .length == 4;
    
            const isPerfectSet = armor
                .filter(a =>
                    getId(a)
                    .startsWith('PERFECT_')
                )
                .length == 4;
    
            if (armor.filter(a => a.armor_name.split(" ")[0] == armor[0].armor_name.split(" ")[0])
                .length == 4 ||
                isMonsterSet) {
                let base_name = armor[0].armor_name.split(" ");
                base_name.pop();
    
                output_name += base_name.join(" ");
    
                if (!output_name.endsWith("Armor") && !output_name.startsWith("Armor"))
                    output_name += " Armor";
    
                output.armor_set = output_name;
                output.armor_set_rarity = armor[0].rarity;
    
                if (isMonsterSet) {
                    output.armor_set_rarity = 'rare';
    
                    if (getId(armor[0]) == 'SPIDER_BOOTS')
                        output.armor_set = 'Monster Hunter Armor';
    
                    if (getId(armor[0]) == 'TARANTULA_BOOTS')
                        output.armor_set = 'Monster Raider Armor';
                }
    
                if (isPerfectSet) {
                    const sameTier = armor.filter(a => getId(a)
                            .split("_")
                            .pop() == getId(armor[0])
                            .split("_")
                            .pop())
                        .length == 4;
    
                    if (sameTier)
                        output.armor_set = 'Perfect Armor - Tier ' + getId(armor[0])
                        .split("_")
                        .pop();
                    else
                        output.armor_set = 'Perfect Armor';
                }
    
                if (reforgeName)
                    output.armor_set = reforgeName + " " + output.armor_set;
            }
        }
    
        return output;
    },
    getStats: async (profile, items, hypixelProfile) => {
        let output = {};
        output.stats = Object.assign({}, constants.base_stats);
    
        profile.fairy_souls_collected = profile.fairy_souls_collected && profile.fairy_souls_collected ? profile.fairy_souls_collected : 0
        if (isNaN(profile.fairy_souls_collected))
            profile.fairy_souls_collected = 0;
    
        if (profile.fairy_exchanges > 0) {
            let fairyBonus = getBonusStat(profile.fairy_exchanges * 5, 'fairy_souls', Math.max(...Object.keys(constants.bonus_stats.fairy_souls)), 5);
            output.fairy_bonus = Object.assign({}, fairyBonus);
    
            // Apply fairy soul bonus
            for (let stat in fairyBonus)
                output.stats[stat] += fairyBonus[stat];
        }

        output.dungeons = await getDungeons(profile, hypixelProfile);
    
        output.fairy_souls = { collected: profile.fairy_souls_collected, total: MAXSOULS }
    
        let skillLevels;
        let totalSkillXp = 0;
        let average_level = 0;
    
        if ('experience_skill_taming' in profile ||
            'experience_skill_farming' in profile ||
            'experience_skill_mining' in profile ||
            'experience_skill_combat' in profile ||
            'experience_skill_foraging' in profile ||
            'experience_skill_fishing' in profile ||
            'experience_skill_enchanting' in profile ||
            'experience_skill_alchemy' in profile ||
            'experience_skill_carpentry' in profile ||
            'experience_skill_runecrafting' in profile) {
            let average_level_no_progress = 0;
    
            skillLevels = {
                taming: getLevelByXp(profile.experience_skill_taming),
                farming: getLevelByXp(profile.experience_skill_farming),
                mining: getLevelByXp(profile.experience_skill_mining),
                combat: getLevelByXp(profile.experience_skill_combat),
                foraging: getLevelByXp(profile.experience_skill_foraging),
                fishing: getLevelByXp(profile.experience_skill_fishing),
                enchanting: getLevelByXp(profile.experience_skill_enchanting),
                alchemy: getLevelByXp(profile.experience_skill_alchemy),
                carpentry: getLevelByXp(profile.experience_skill_carpentry),
                runecrafting: getLevelByXp(profile.experience_skill_runecrafting, true),
            };
    
            for (let skill in skillLevels) {
                if (skill != 'runecrafting' && skill != 'carpentry') {
                    average_level += skillLevels[skill].level + skillLevels[skill].progress;
                    average_level_no_progress += skillLevels[skill].level;
    
                    totalSkillXp += skillLevels[skill].xp;
                }
            }
    
            output.average_level = (average_level / (Object.keys(skillLevels)
                .length - 2));
            output.average_level_no_progress = (average_level_no_progress / (Object.keys(skillLevels)
                .length - 2));
            output.total_skill_xp = totalSkillXp;
    
            output.levels = Object.assign({}, skillLevels);
    
        } else {
            skillLevels = {
                taming: -1,
                farming: hypixelProfile ? hypixelProfile.achievements.skyblock_harvester : 0,
                mining: hypixelProfile ? hypixelProfile.achievements.skyblock_excavator : 0,
                combat: hypixelProfile ? hypixelProfile.achievements.skyblock_combat :  0,
                foraging: hypixelProfile ? hypixelProfile.achievements.skyblock_gatherer :  0,
                fishing: hypixelProfile ? hypixelProfile.achievements.skyblock_angler : 0,
                enchanting: hypixelProfile ? hypixelProfile.achievements.skyblock_augmentation : 0,
                carpentry: -1,
                alchemy: hypixelProfile ? hypixelProfile.achievements.skyblock_concoctor : 0,
                runecrafting: -1
            };
    
            output.levels = {};
    
            let skillsAmount = 0;
    
            for (const skill in skillLevels) {
                output.levels[skill] = { level: skillLevels[skill], xp: getXpByLevel(skillLevels[skill]), progress: 0.05, maxLevel: 50, xpCurrent: 0, xpForNext: 0 };
    
                if (skillLevels[skill] < 0)
                    continue;
    
                skillsAmount++;
                average_level += skillLevels[skill];
    
                totalSkillXp += getXpByLevel(skillLevels[skill]);
            }
    
            output.average_level = (average_level / skillsAmount);
            output.average_level_no_progress = output.average_level;
            output.total_skill_xp = totalSkillXp;
        }
    
        output.skill_bonus = {};
    
        for (let skill in skillLevels) {
            if (skillLevels[skill].level == 0)
                continue;
    
            const skillBonus = getBonusStat(skillLevels[skill].level || skillLevels[skill], `${skill}_skill`, 50, 1);
    
            output.skill_bonus[skill] = Object.assign({}, skillBonus);
    
            for (const stat in skillBonus)
                output.stats[stat] += skillBonus[stat];
        }
    
        output.slayer_coins_spent = {};
    
        // Apply slayer bonuses
        if ('slayer_bosses' in profile) {
            output.slayer_bonus = {};
    
            let slayers = {};
    
            if (objectPath.has(profile, 'slayer_bosses')) {
                for (const slayerName in profile.slayer_bosses) {
                    const slayer = profile.slayer_bosses[slayerName];
    
                    slayers[slayerName] = {};
    
                    if (!objectPath.has(slayer, 'claimed_levels'))
                        continue;
    
                    slayers[slayerName].level = getSlayerLevel(slayer, slayerName);
    
                    slayers[slayerName].kills = {};
    
                    for (const property in slayer) {
                        slayers[slayerName][property] = slayer[property];
    
                        if (property.startsWith('boss_kills_tier_')) {
                            const tier = parseInt(property.replace('boss_kills_tier_', '')) + 1;
    
                            slayers[slayerName].kills[tier] = slayer[property];
    
                            output.slayer_coins_spent[slayerName] = (output.slayer_coins_spent[slayerName] || 0) + slayer[property] * constants.slayer_cost[tier];
                        }
                    }
                }
    
                for (const slayerName in output.slayer_coins_spent) {
                    output.slayer_coins_spent.total = (output.slayer_coins_spent.total || 0) + output.slayer_coins_spent[slayerName];
                }
    
                output.slayer_coins_spent.total = output.slayer_coins_spent.total || 0;
            }
    
            output.slayer_xp = 0;
    
            for (const slayer in slayers) {
                if (!objectPath.has(slayers[slayer], 'level.currentLevel'))
                    continue;
    
                const slayerBonus = getBonusStat(slayers[slayer].level.currentLevel, `${slayer}_slayer`, 9, 1);
    
                output.slayer_bonus[slayer] = Object.assign({}, slayerBonus);
    
                output.slayer_xp += slayers[slayer].xp || 0;
    
                for (let stat in slayerBonus)
                    output.stats[stat] += slayerBonus[stat];
            }
    
            output.slayers = Object.assign({}, slayers);
        }
    
        output.pets = await getPets(profile);
        output.petScore = await getPetScore(output.pets);
    
        const petScoreRequired = Object.keys(constants.pet_rewards)
            .sort((a, b) => parseInt(b) - parseInt(a));
    
        output.pet_bonus = {};
    
        for (const [index, score] of petScoreRequired.entries()) {
            if (parseInt(score) > output.petScore)
                continue;
    
            output.pet_score_bonus = Object.assign({}, constants.pet_rewards[score]);
    
            break;
        }
    
        for (const pet of output.pets) {
            if (!pet.active)
                continue;
    
            for (const stat in pet.stats)
                output.pet_bonus[stat] = (output.pet_bonus[stat] || 0) + pet.stats[stat];
        }
    
        if (items.talismans.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id == 'MELODY_HAIR')
            .length == 1)
            output.stats.intelligence += 26;
    
        output.base_stats = Object.assign({}, output.stats);
    
        for (const stat in output.pet_bonus)
            output.stats[stat] += output.pet_bonus[stat];
    
        // Apply Lapis Armor full set bonus of +60 HP
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('LAPIS_ARMOR_'))
            .length == 4)
            items.armor[0].stats.health = (items.armor[0].stats.health || 0) + 60;
    
        // Apply Emerald Armor full set bonus of +1 HP and +1 Defense per 3000 emeralds in collection with a maximum of 300
        if (objectPath.has(profile, 'collection.EMERALD') &&
            !isNaN(profile.collection.EMERALD) &&
            items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('EMERALD_ARMOR_'))
            .length == 4) {
            let emerald_bonus = Math.min(350, Math.floor(profile.collection.EMERALD / 3000));
    
            items.armor[0].stats.health += emerald_bonus;
            items.armor[0].stats.defense += emerald_bonus;
        }
    
        // Apply Fairy Armor full set bonus of +10 Speed
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('FAIRY_'))
            .length == 4)
            items.armor[0].stats.speed += 10;
    
        // Apply Speedster Armor full set bonus of +20 Speed
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('SPEEDSTER_'))
            .length == 4)
            items.armor[0].stats.speed += 20;
    
        // Apply Young Dragon Armor full set bonus of +70 Speed
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('YOUNG_DRAGON_'))
            .length == 4)
            items.armor[0].stats.speed += 70;
    
        // Apply basic armor stats
        for (const item of items.armor) {
            if (item.isInactive) {
                item.stats = {};
            }
    
            for (let stat in item.stats) {
                output.stats[stat] += item.stats[stat];
            }
        }

        output.stats.bonus_attack_speed = 0;
    
        // Apply stats of active talismans
        //console.log(items.talismans)
        //console.log(items.armor)
        items.talismans.filter(a => Object.keys(a)
                .length != 0 && !a.isInactive)
            .forEach(item => {
                for (let stat in item.stats) {
                    output.stats[stat] += item.stats[stat];
                    //console.log(`Stats added for ${stat}: ${output.stats[stat]} - +${item.stats[stat]}`);
                }
            });
    
        // Apply Mastiff Armor full set bonus of +50 HP per 1% Crit Damage
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('MASTIFF_'))
            .length == 4) {
            output.stats.health += 50 * output.stats.crit_damage;
            items.armor[0].stats.health += 50 * output.stats.crit_damage;
        }
    
        // Apply +5 Defense and +5 Strength of Day/Night Crystal only if both are owned as this is required for a permanent bonus
        if (items.talismans.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && !a.isInactive && ["DAY_CRYSTAL", "NIGHT_CRYSTAL"].includes(a.tag.ExtraAttributes.id))
            .length == 2) {
            output.stats.defense += 5;
            output.stats.strength += 5;
    
            const dayCrystal = items.talismans.filter(a => getId(a) == 'DAY_CRYSTAL')[0];
    
            dayCrystal.stats = { defense: 0, strength: 0 };
    
            dayCrystal.stats.defense = (dayCrystal.stats ? dayCrystal.stats.defense : 0) + 5;
            dayCrystal.stats.strength = (dayCrystal.stats ? dayCrystal.stats.strength : 0) + 5;
        }
    
        // Apply Obsidian Chestplate bonus of +1 Speed per 20 Obsidian in inventory
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id == ('OBSIDIAN_CHESTPLATE'))
            .length == 1) {
            let obsidian = 0;
    
            for (let item of items.inventory) {
                if (item.id == 49)
                    obsidian += item.Count;
            }
    
            output.stats.speed += Math.floor(obsidian / 20);
        }
    
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('CHEAP_TUXEDO_'))
            .length == 3)
            output.stats['health'] = 75;
    
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('FANCY_TUXEDO_'))
            .length == 3)
            output.stats['health'] = 150;
    
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('ELEGANT_TUXEDO_'))
            .length == 3)
            output.stats['health'] = 250;
    
        const superiorBonus = Object.assign({}, constants.stat_template);
    
        // Apply Superior Dragon Armor full set bonus of 5% stat increase
        if (items.armor.filter(a => objectPath.has(a, 'tag.ExtraAttributes.id') && a.tag.ExtraAttributes.id.startsWith('SUPERIOR_DRAGON_'))
            .length == 4) {
            for (const stat in output.stats) {
                superiorBonus[stat] = Math.floor(output.stats[stat] * 0.05);
            }
    
            for (const stat in superiorBonus) {
                output.stats[stat] += superiorBonus[stat];
    
                if (!(stat in items.armor[0].stats))
                    items.armor[0].stats[stat] = 0;
    
                items.armor[0].stats[stat] += superiorBonus[stat];
            }
        }
    
        // Stats shouldn't go into negative
        for (let stat in output.stats)
            output.stats[stat] = Math.max(0, Math.round(output.stats[stat]));
    
        return output;
    } // Function ends here
    
}


const MAXSOULS = 209;
const parseNbt = util.promisify(nbt.parse);
const rarity_order = ['special', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
const petTiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

async function getBackpackContents(arraybuf) {
    let buf = Buffer.from(arraybuf);

    let data = await parseNbt(buf);
    data = nbt.simplify(data);

    let items = data.i;

    for (const [index, item] of items.entries()) {
        item.isInactive = true;
        item.inBackpack = true;
        item.item_index = index;
    }

    return items;
}

function splitWithTail(string, delimiter, count) {
    let parts = string.split(delimiter);
    let tail = parts.slice(count)
        .join(delimiter);
    let result = parts.slice(0, count);
    result.push(tail);

    return result;
}

// Process items returned by API
async function getItems2(base64) {
    // API stores data as base64 encoded gzipped Minecraft NBT data
    let buf = await Buffer.from(base64, 'base64');

    let data = await parseNbt(buf);
    data = await nbt.simplify(data);

    let items = data.i;

    // Check backpack contents and add them to the list of items
    for (const [index, item] of items.entries()) {
        if (objectPath.has(item, 'tag.display.Name') && (item.tag.display.Name.endsWith('Backpack') || item.tag.display.Name.endsWith('New Year Cake Bag'))) {

            let keys = Object.keys(item.tag.ExtraAttributes);

            let backpackData;

            keys.forEach(key => {
                if (key.endsWith('backpack_data') || key == 'new_year_cake_bag_data')
                    backpackData = item.tag.ExtraAttributes[key];
            });

            if (!Array.isArray(backpackData))
                continue;

            let backpackContents = await getBackpackContents(backpackData);

            backpackContents.forEach(backpackItem => {
                backpackItem.backpackIndex = index;
            });

            item.containsItems = [];

            items.push(...backpackContents);
        }
    }

    let index = 0;

    for (let item of items) {

        let lore_raw;

        // Set HTML lore to be displayed on the website
        if (objectPath.has(item, 'tag.display.Lore')) {
            lore_raw = item.tag.display.Lore;

            item.lore = '';

            for (const [index, line] of lore_raw.entries()) {
                if (index == 0 && line == '')
                    continue;

                item.lore += Helper.renderLore(line);

                if (index + 1 < lore_raw.length)
                    item.lore += '<br>';
            }

            let hasAnvilUses = false;

            if (objectPath.has(item, 'tag.ExtraAttributes.anvil_uses')) {
                let { anvil_uses, timestamp } = item.tag.ExtraAttributes;

                let hot_potato_count = 0;

                if ('hot_potato_count' in item.tag.ExtraAttributes)
                    ({ hot_potato_count } = item.tag.ExtraAttributes);

                anvil_uses -= hot_potato_count;

                if (anvil_uses > 0 && lore_raw) {
                    hasAnvilUses = true;
                }
            }

            if (objectPath.has(item, 'tag.ExtraAttributes.timestamp')) {
                item.lore += "<br>";

                const timestamp = item.tag.ExtraAttributes.timestamp;
                let obtainmentDate;

                if (!isNaN(timestamp))
                    obtainmentDate = moment(parseInt(timestamp));
                else if (timestamp.includes("AM") || timestamp.includes("PM"))
                    obtainmentDate = moment(timestamp, "M/D/YY h:mm A");
                else
                    obtainmentDate = moment(timestamp, "D/M/YY HH:mm");

                if (!obtainmentDate.isValid())
                    obtainmentDate = moment(timestamp, "M/D/YY HH:mm");
            }
        }

        let lore = lore_raw ? lore_raw.map(a => a = getRawLore(a)) : [];

        let rarity, item_type;

        if (lore.length > 0) {
            // Get item type (like "bow") and rarity (like "legendary") from last line of lore
            let rarity_type = lore[lore.length - 1];

            rarity_type = splitWithTail(rarity_type, " ", 1);

            rarity = rarity_type[0];

            if (rarity_type.length > 1)
                item_type = rarity_type[1].trim();

            item.rarity = rarity.toLowerCase();

            if (item_type)
                item.type = item_type.toLowerCase();

            item.stats = {};

            // Get item stats from lore
            lore.forEach(line => {
                let split = line.split(":");

                if (split.length < 2)
                    return;

                const statType = split[0];
                const statValue = parseFloat(split[1].trim()
                    .replace(/,/g, ''));

                switch (statType) {
                    case 'Damage':
                        item.stats.damage = statValue;
                        break;
                    case 'Health':
                        item.stats.health = statValue;
                        break;
                    case 'Defense':
                        item.stats.defense = statValue;
                        break;
                    case 'Strength':
                        item.stats.strength = statValue;
                        break;
                    case 'Speed':
                        item.stats.speed = statValue;
                        break;
                    case 'Crit Chance':
                        item.stats.crit_chance = statValue;
                        break;
                    case 'Crit Damage':
                        item.stats.crit_damage = statValue;
                        break;
                    case 'Bonus Attack Speed':
                        item.stats.bonus_attack_speed = statValue;
                        break;
                    case 'Intelligence':
                        item.stats.intelligence = statValue;
                        break;
                    case 'Sea Creature Chance':
                        item.stats.sea_creature_chance = statValue;
                        break;
                    case 'Magic Find':
                        item.stats.magic_find = statValue;
                        break;
                    case 'Pet Luck':
                        item.stats.pet_luck = statValue;
                        break;
                }
            });

            // Apply Speed Talisman speed bonuses
            if (getId(item) == 'SPEED_TALISMAN')
                item.stats.speed = 1;

            if (getId(item) == 'SPEED_RING')
                item.stats.speed = 3;

            if (getId(item) == 'SPEED_ARTIFACT')
                item.stats.speed = 5;
        }

        // Workaround for detecting item types if another language is set by the player on Hypixel
        if (objectPath.has(item, 'tag.ExtraAttributes.id') && item.tag.ExtraAttributes.id != 'ENCHANTED_BOOK' &&
            !constants.item_types.includes(item.type)) {
            if (objectPath.has(item, 'tag.ExtraAttributes.enchantments')) {
                if ('sharpness' in item.tag.ExtraAttributes.enchantments ||
                    'crticial' in item.tag.ExtraAttributes.enchantments ||
                    'ender_slayer' in item.tag.ExtraAttributes.enchantments ||
                    'execute' in item.tag.ExtraAttributes.enchantments ||
                    'first_strike' in item.tag.ExtraAttributes.enchantments ||
                    'giant_killer' in item.tag.ExtraAttributes.enchantments ||
                    'lethality' in item.tag.ExtraAttributes.enchantments ||
                    'life_steal' in item.tag.ExtraAttributes.enchantments ||
                    'looting' in item.tag.ExtraAttributes.enchantments ||
                    'luck' in item.tag.ExtraAttributes.enchantments ||
                    'scavenger' in item.tag.ExtraAttributes.enchantments ||
                    'vampirism' in item.tag.ExtraAttributes.enchantments ||
                    'bane_of_arthropods' in item.tag.ExtraAttributes.enchantments ||
                    'smite' in item.tag.ExtraAttributes.enchantments)
                    item.type = 'sword';

                if ('power' in item.tag.ExtraAttributes.enchantments ||
                    'aiming' in item.tag.ExtraAttributes.enchantments ||
                    'infinite_quiver' in item.tag.ExtraAttributes.enchantments ||
                    'power' in item.tag.ExtraAttributes.enchantments ||
                    'snipe' in item.tag.ExtraAttributes.enchantments ||
                    'punch' in item.tag.ExtraAttributes.enchantments ||
                    'flame' in item.tag.ExtraAttributes.enchantments ||
                    'piercing' in item.tag.ExtraAttributes.enchantments)
                    item.type = 'bow';

                if ('angler' in item.tag.ExtraAttributes.enchantments ||
                    'blessing' in item.tag.ExtraAttributes.enchantments ||
                    'caster' in item.tag.ExtraAttributes.enchantments ||
                    'frail' in item.tag.ExtraAttributes.enchantments ||
                    'luck_of_the_sea' in item.tag.ExtraAttributes.enchantments ||
                    'lure' in item.tag.ExtraAttributes.enchantments ||
                    'magnet' in item.tag.ExtraAttributes.enchantments)
                    item.type = 'fishing rod';
            }
        }

        if (!objectPath.has(item, 'display_name') && objectPath.has(item, 'id')) {
            let vanillaItem = mcData.items[item.id];

            if (vanillaItem && objectPath.has(vanillaItem, 'displayName'))
                item.display_name = vanillaItem.displayName;
        }
    }

    for (let item of items) {
        if (item.inBackpack) {
            items[item.backpackIndex].containsItems.push(Object.assign({}, item));
        }
    }

    items = items.filter(a => !a.inBackpack);
    return items;
}

function getSlayerLevel(slayer, slayerName) {
    let { xp, claimed_levels } = slayer;

    let currentLevel = 0;
    let progress = 0;
    let xpForNext = 0;

    const maxLevel = Math.max(...Object.keys(constants.slayer_xp[slayerName]));

    for (const level_name in claimed_levels) {
        const level = parseInt(level_name.split("_")
            .pop());

        if (level > currentLevel)
            currentLevel = level;
    }

    if (currentLevel < maxLevel) {
        const nextLevel = constants.slayer_xp[slayerName][currentLevel + 1];

        progress = xp / nextLevel;
        xpForNext = nextLevel;
    } else {
        progress = 1;
    }

    return { currentLevel, xp, maxLevel, progress, xpForNext };
}

function getPetLevel(pet) {
    const rarityOffset = constants.pet_rarity_offset[pet.rarity];
    const levels = constants.pet_levels.slice(rarityOffset, rarityOffset + 99);

    const xpMaxLevel = levels.reduce((a, b) => a + b, 0)
    let xpTotal = 0;
    let level = 1;

    let xpForNext = Infinity;

    for (let i = 0; i < 100; i++) {
        xpTotal += levels[i];

        if (xpTotal > pet.exp) {
            xpTotal -= levels[i];
            break;
        } else {
            level++;
        }
    }

    let xpCurrent = Math.floor(pet.exp - xpTotal);
    let progress;

    if (level < 100) {
        xpForNext = Math.ceil(levels[level - 1]);
        progress = Math.max(0, Math.min(xpCurrent / xpForNext, 1));
    } else {
        level = 100;
        xpCurrent = pet.exp - levels[99];
        xpForNext = 0;
        progress = 1;
    }

    return {
        level,
        xpCurrent,
        xpForNext,
        progress,
        xpMaxLevel
    };
}

async function getPetScore(pets) {
    const highestRarity = {};

    for (const pet of pets)
        if (!(pet.type in highestRarity) ||
            constants.pet_value[pet.rarity] > highestRarity[pet.type])
            highestRarity[pet.type] = constants.pet_value[pet.rarity];

    return Object.values(highestRarity)
        .reduce((a, b) => a + b, 0);
}

async function getPets(profile) {
    let output = [];

    if (!objectPath.has(profile, 'pets'))
        return output;

    for (const pet of profile.pets) {
        if (!('tier' in pet))
            continue;

        pet.rarity = pet.tier.toLowerCase();

        if (pet.heldItem == 'PET_ITEM_TIER_BOOST')
            pet.rarity = petTiers[Math.min(petTiers.length - 1, petTiers.indexOf(pet.rarity) + 1)];

        pet.level = getPetLevel(pet);
        pet.stats = {};

        const petData = constants.pet_data[pet.type] || {
            type: '???',
            emoji: '❓',
            head: '/head/bc8ea1f51f253ff5142ca11ae45193a4ad8c3ab5e9c6eec8ba7a4fcb7bac40'
        };

        pet.texture_path = petData.head;

        let lore = [
                    `§8${petData.type.titleCase()} Pet`,
                ];

        lore.push('');

        if (pet.level.level < 100) {
            lore.push(
                `§7Progress to Level ${pet.level.level + 1}: §e${(pet.level.progress * 100).toFixed(1)}%`
            );

            let levelBar = '';

            for (let i = 0; i < 20; i++) {
                if (pet.level.progress > i / 20)
                    levelBar += '§2';
                else
                    levelBar += '§f';
                levelBar += '-';
            }

            levelBar += `No`;

            lore.push(levelBar);
        } else {
            lore.push(
                '§bMAX LEVEL'
            );
        }

        pet.lore = '';

        lore.forEach((line, index) => {
            pet.lore += line;

            if (index + 1 <= lore.length)
                pet.lore += '<br>';
        });

        pet.display_name = pet.type.replace(/\_/g, ' ')
            .titleCase();
        pet.emoji = petData.emoji;

        output.push(pet);
    }

    output = output.sort((a, b) => {
        if (a.active === b.active)
            if (a.rarity == b.rarity) {
                if (a.type == b.type) {
                    return a.level.level > b.level.level ? -1 : 1;
                } else {
                    let maxPetA = output
                        .filter(x => x.type == a.type && x.rarity == a.rarity)
                        .sort((x, y) => y.level.level - x.level.level);

                    maxPetA = maxPetA.length > 0 ? maxPetA[0].level.level : null;

                    let maxPetB = output
                        .filter(x => x.type == b.type && x.rarity == b.rarity)
                        .sort((x, y) => y.level.level - x.level.level);

                    maxPetB = maxPetB.length > 0 ? maxPetB[0].level.level : null;

                    if (maxPetA && maxPetB && maxPetA == maxPetB)
                        return a.type < b.type ? -1 : 1;
                    else
                        return maxPetA > maxPetB ? -1 : 1;
                }
            } else {
                return rarity_order.indexOf(a.rarity) > rarity_order.indexOf(b.rarity) ? 1 : -1;
            }

        return a.active ? -1 : 1
    });

    return output;
}

function getRawLore(text) {
    let output = "";
    let parts = text.split("§");

    for (const [index, part] of parts.entries())
        output += part.substr(Math.min(index, 1));

    return output;
}

function getBonusStat(level, skill, max, incremention) {
    let skill_stats = constants.bonus_stats[skill];
    let steps = Object.keys(skill_stats)
        .sort((a, b) => Number(a) - Number(b))
        .map(a => Number(a));

    let bonus = Object.assign({}, constants.stat_template);

    for (let x = steps[0]; x <= max; x += incremention) {
        if (level < x)
            break;

        let skill_step = steps.slice()
            .reverse()
            .find(a => a <= x);

        let skill_bonus = skill_stats[skill_step];

        for (let skill in skill_bonus)
            bonus[skill] += skill_bonus[skill];
    }

    return bonus;
}

function getLevelByXp(xp, runecrafting) {
    let xp_table = runecrafting ? constants.runecrafting_xp : constants.leveling_xp;

    if (isNaN(xp)) {
        return {
            xp: 0,
            level: 0,
            xpCurrent: 0,
            xpForNext: xp_table[1],
            progress: 0
        };
    }

    let xpTotal = 0;
    let level = 0;

    let xpForNext = Infinity;

    let maxLevel = Object.keys(xp_table)
        .sort((a, b) => Number(a) - Number(b))
        .map(a => Number(a))
        .pop();

    for (let x = 1; x <= maxLevel; x++) {
        xpTotal += xp_table[x];

        if (xpTotal > xp) {
            xpTotal -= xp_table[x];
            break;
        } else {
            level = x;
        }
    }

    let xpCurrent = Math.floor(xp - xpTotal);

    if (level < maxLevel)
        xpForNext = Math.ceil(xp_table[level + 1]);

    let progress = Math.max(0, Math.min(xpCurrent / xpForNext, 1));

    return {
        xp,
        level,
        maxLevel,
        xpCurrent,
        xpForNext,
        progress
    };
}

function getXpByLevel(level, runecrafting) {
    let xp_table = runecrafting ? constants.runecrafting_xp : constants.leveling_xp;

    if (isNaN(level))
        return 0;

    let xpTotal = 0;

    let maxLevel = Object.keys(xp_table)
        .sort((a, b) => Number(a) - Number(b))
        .map(a => Number(a))
        .pop();

    for (let x = 1; x <= level; x++)
        xpTotal += xp_table[x];

    return xpTotal;
}

function getId(item) {
    if (objectPath.has(item, 'tag.ExtraAttributes.id'))
        return item.tag.ExtraAttributes.id;
    return "";
}

async function getDungeons(userProfile, hypixelProfile) {
    const output = {};

    let tasks = userProfile.tutorial;

    output.entrance = userProfile.visited_zones.includes('dungeon');
    if (!output.entrance) return output;

    output.collected_essence = tasks.includes('essence_collected_message');

    const collection_data = constants.boss_collections;
    let collections = {};
    for (i in tasks) {
        if (!tasks[i].startsWith("boss_collection_claimed")) continue;
        let task = tasks[i].split("_").splice(3);

        if (!Object.keys(collection_data).includes(task[0])) continue;
        let boss = collection_data[task[0]];
        let item = boss.rewards[task.splice(1).join('_')];

        if (item == null || boss == null) continue;
        if (!collections[task[0]]) collections[task[0]] = {
            name: boss.name,
            texture: boss.texture,
            tier: 0,
            killed: 0,
            claimed: []
        };

        collections[task[0]].claimed.push(item.name);
        if (collections[task[0]].tier < item.tier) {
            collections[task[0]].tier = item.tier;
            collections[task[0]].killed = item.required;
        } 
    }

    if (Object.keys(collections).length === 0) 
        output.unlocked_collections = false;
    else output.unlocked_collections = true;

    output.boss_collections = collections;

    output.secrets_found = hypixelProfile ? hypixelProfile.achievements.skyblock_treasure_hunter : 0;

    return output;
}