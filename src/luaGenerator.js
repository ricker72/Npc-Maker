// luaGenerator.js
// Genera scripts Lua 100% compatibles con el formato real de Canary
// (basado en npcType:register, NpcHandler, KeywordHandler, etc.)

const sanitizeName = (name) => (name || 'unnamed_npc').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

const escapeLua = (str = '') => String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export function generateNpcLua(npc) {
  const {
    name, health, maxHealth, walkInterval, walkRadius, speed, floorChange,
    outfit, messages, shop, keywords
  } = npc;

  let s = '';
  s += `local npcName = "${escapeLua(name)}"\n\n`;
  s += `local npcType = Game.createNpcType(npcName)\n`;
  s += `local npcConfig = {}\n\n`;

  s += `npcConfig.name = npcName\n`;
  s += `npcConfig.description = npcName\n\n`;

  s += `npcConfig.health = ${health}\n`;
  s += `npcConfig.maxHealth = ${maxHealth}\n`;
  s += `npcConfig.walkInterval = ${walkInterval}\n`;
  s += `npcConfig.walkRadius = ${walkRadius}\n`;
  if (speed) {
    s += `npcConfig.speed = ${speed}\n`;
  }
  s += `\n`;

  s += `npcConfig.outfit = {\n`;
  s += `\tlookType = ${outfit.lookType},\n`;
  s += `\tlookHead = ${outfit.lookHead},\n`;
  s += `\tlookBody = ${outfit.lookBody},\n`;
  s += `\tlookLegs = ${outfit.lookLegs},\n`;
  s += `\tlookFeet = ${outfit.lookFeet},\n`;
  s += `\tlookAddons = ${outfit.lookAddons},\n`;
  if (outfit.lookMount && outfit.lookMount > 0) {
    s += `\tlookMount = ${outfit.lookMount},\n`;
  }
  s += `}\n\n`;

  s += `npcConfig.flags = {\n`;
  s += `\tfloorchange = ${floorChange ? 'true' : 'false'},\n`;
  s += `}\n\n`;

  // Shop
  const hasShop = shop?.items?.length > 0;
  if (hasShop) {
    s += `-- Npc shop\n`;
    s += `npcConfig.shop = {\n`;
    const lines = shop.items.map((item) => {
      let entry = `\t{ itemName = "${escapeLua(item.name)}", clientId = ${item.id}`;
      if (item.buy !== '' && item.buy !== null && item.buy !== undefined) entry += `, buy = ${item.buy}`;
      if (item.sell !== '' && item.sell !== null && item.sell !== undefined) entry += `, sell = ${item.sell}`;
      if (item.count && item.count > 1) entry += `, count = ${item.count}`;
      entry += ' }';
      return entry;
    });
    s += lines.join(',\n') + '\n';
    s += `}\n\n`;
  }

  s += `-- Create keywordHandler and npcHandler\n`;
  s += `local keywordHandler = KeywordHandler:new()\n`;
  s += `local npcHandler = NpcHandler:new(keywordHandler)\n\n`;

  s += `-- onThink\n`;
  s += `npcType.onThink = function(npc, interval)\n\tnpcHandler:onThink(npc, interval)\nend\n\n`;
  s += `-- onAppear\n`;
  s += `npcType.onAppear = function(npc, creature)\n\tnpcHandler:onAppear(npc, creature)\nend\n\n`;
  s += `-- onDisappear\n`;
  s += `npcType.onDisappear = function(npc, creature)\n\tnpcHandler:onDisappear(npc, creature)\nend\n\n`;
  s += `-- onMove\n`;
  s += `npcType.onMove = function(npc, creature, fromPosition, toPosition)\n\tnpcHandler:onMove(npc, creature, fromPosition, toPosition)\nend\n\n`;
  s += `-- onSay\n`;
  s += `npcType.onSay = function(npc, creature, type, message)\n\tnpcHandler:onSay(npc, creature, type, message)\nend\n\n`;
  s += `-- onPlayerCloseChannel\n`;
  s += `npcType.onCloseChannel = function(npc, player)\n\tnpcHandler:onCloseChannel(npc, player)\nend\n\n`;

  if (hasShop) {
    s += `-- On buy npc shop message\n`;
    s += `npcType.onBuyItem = function(npc, player, itemId, subType, amount, ignore, inBackpacks, totalCost)\n\tnpc:sellItem(player, itemId, amount, subType, 0, ignore, inBackpacks)\nend\n\n`;
    s += `-- On sell npc shop message\n`;
    s += `npcType.onSellItem = function(npc, player, itemId, subtype, amount, ignore, name, totalCost)\n\tplayer:sendTextMessage(MESSAGE_TRADE, string.format("${escapeLua(messages.sell)}", amount, name, totalCost))\nend\n\n`;
    s += `-- On check npc shop message (look item)\n`;
    s += `npcType.onCheckItem = function(npc, player, clientId, subType) end\n\n`;
  }

  const hasKeywords = keywords?.length > 0;

  if (hasKeywords) {
    s += `-- Custom keywords\n`;
    keywords.forEach((kw, idx) => {
      s += `local node${idx + 1} = keywordHandler:addKeyword({ "${escapeLua(kw.keyword)}" }, StdModule.say, {\n`;
      s += `\tnpcHandler = npcHandler,\n`;
      s += `\tonlyFocus = true,\n`;
      s += `\ttext = "${escapeLua(kw.response)}",\n`;
      s += `})\n\n`;
    });
  }

  s += `-- Function called by the callback "npcHandler:setCallback(CALLBACK_GREET, greetCallback)"\n`;
  s += `local function greetCallback(npc, player)\n`;
  s += `\tnpcHandler:setMessage(MESSAGE_GREET, "${escapeLua(messages.greet)}")\n`;
  s += `\treturn true\n`;
  s += `end\n\n`;

  if (hasKeywords) {
    s += `-- On creature say callback\n`;
    s += `local function creatureSayCallback(npc, player, type, msg)\n`;
    s += `\tlocal playerId = player:getId()\n`;
    s += `\tif not npcHandler:checkInteraction(npc, player) then\n\t\treturn false\n\tend\n\n`;
    keywords.forEach((kw, idx) => {
      const cond = idx === 0 ? 'if' : 'elseif';
      s += `\t${cond} MsgContains(msg, "${escapeLua(kw.keyword)}") then\n`;
      s += `\t\tnpcHandler:say("${escapeLua(kw.response)}", npc, player)\n`;
    });
    s += `\tend\n`;
    s += `\treturn true\n`;
    s += `end\n\n`;
  }

  s += `-- Set callbacks\n`;
  s += `npcHandler:setCallback(CALLBACK_GREET, greetCallback)\n`;
  if (hasKeywords) {
    s += `npcHandler:setCallback(CALLBACK_MESSAGE_DEFAULT, creatureSayCallback)\n`;
  }
  s += `\n`;

  s += `-- Messages\n`;
  s += `npcHandler:setMessage(MESSAGE_FAREWELL, "${escapeLua(messages.farewell)}")\n`;
  s += `npcHandler:setMessage(MESSAGE_WALKAWAY, "${escapeLua(messages.walkaway)}")\n\n`;

  s += `npcHandler:addModule(FocusModule:new(), npcConfig.name, true, true, true)\n\n`;

  s += `-- Register npc\n`;
  s += `npcType:register(npcConfig)\n`;

  return s;
}

export function getNpcFileName(name) {
  return `${sanitizeName(name)}.lua`;
}

// URL del API público usado por npc-maker para renderizar el sprite del outfit
export function buildOutfitImageUrl(outfit) {
  const { lookType, lookHead, lookBody, lookLegs, lookFeet, lookAddons, lookMount } = outfit;
  const base = 'https://outfit-images-oracle.ots.me/latest_walk/animoutfit.php';
  const mount = lookMount || 0;
  return `${base}?id=${lookType}&addons=${lookAddons}&head=${lookHead}&body=${lookBody}&legs=${lookLegs}&feet=${lookFeet}&mount=${mount}&direction=3`;
}
