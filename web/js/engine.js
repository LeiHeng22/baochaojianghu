(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BcjhEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PEOPLE = 4;
  var OPEN_PEOPLE = 3;
  var TIME_SLOT = 4;

  var VEG_AREAS = [
    { name: '森林', group: 'veg', key: 'veg', label: '菜', capacity: 32 },
    { name: '菜地', group: 'veg', key: 'veg', label: '菜', capacity: 30 },
    { name: '池塘', group: 'veg', key: 'fish', label: '鱼', capacity: 29 },
    { name: '作坊', group: 'veg', key: 'creation', label: '面', capacity: 26 },
    { name: '菜棚', group: 'veg', key: 'veg', label: '菜', capacity: 25 },
    { name: '牧场', group: 'veg', key: 'meat', label: '肉', capacity: 25 },
    { name: '鸡舍', group: 'veg', key: 'meat', label: '肉', capacity: 24 },
    { name: '猪圈', group: 'veg', key: 'meat', label: '肉', capacity: 18 }
  ];

  var JADE_AREAS = [
    { name: '藏心亭', group: 'jade', keys: ['meat', 'veg'], label: '肉+菜' },
    { name: '朝阴山', group: 'jade', keys: ['meat', 'creation'], label: '肉+面' },
    { name: '北冥城', group: 'jade', keys: ['fish', 'creation'], label: '鱼+面' },
    { name: '清空谷', group: 'jade', keys: ['meat', 'fish'], label: '肉+鱼' },
    { name: '还寒洞', group: 'jade', keys: ['veg', 'creation'], label: '菜+面' },
    { name: '永昼宫', group: 'jade', keys: ['veg', 'fish'], label: '菜+鱼' }
  ];

  var JADE_TIERS = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240];

  var COND_AREAS = [
    { name: '樊正阁', group: 'cond', technique: '蒸', defaultName: '鱼露', flavor: 'tasty', flavorLabel: '鲜' },
    { name: '庖丁阁', group: 'cond', technique: '切', defaultName: '山楂', flavor: 'sour', flavorLabel: '酸' },
    { name: '膳祖阁', group: 'cond', technique: '炸', defaultName: '蜂蜜', flavor: 'sweet', flavorLabel: '甜' },
    { name: '易牙阁', group: 'cond', technique: '烤', defaultName: '丁香', flavor: 'bitter', flavorLabel: '苦' },
    { name: '彭铿阁', group: 'cond', technique: '煮', defaultName: '泡椒', flavor: 'spicy', flavorLabel: '辣' },
    { name: '伊尹阁', group: 'cond', technique: '炒', defaultName: '盐', flavor: 'salty', flavorLabel: '咸' }
  ];

  var GATHER_TYPES = { Meat: 'meat', Fish: 'fish', Vegetable: 'veg', Creation: 'creation' };
  var FLAVOR_TYPES = { Sweet: 'sweet', Sour: 'sour', Spicy: 'spicy', Salty: 'salty', Bitter: 'bitter', Tasty: 'tasty' };
  var MATERIAL_GAIN_TYPES = {
    Material_Gain: 'base',
    Material_Meat: 'meat',
    Material_Fish: 'fish',
    Material_Vegetable: 'veg',
    Material_Creation: 'creation'
  };
  var TECH_TYPES = { Stirfry: '炒', Boil: '煮', Knife: '切', Fry: '炸', Bake: '烤', Steam: '蒸' };

  function toInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function skillMapOf(data) {
    var map = {};
    (data.skills || []).forEach(function (s) {
      map[Number(s.skillId)] = s;
    });
    return map;
  }

  function effectsOfSkill(skillMap, skillId) {
    var skill = skillMap[Number(skillId)];
    return skill && Array.isArray(skill.effect) ? skill.effect : [];
  }

  function descOfSkill(skillMap, skillId) {
    var skill = skillMap[Number(skillId)];
    return skill ? String(skill.desc || '') : '';
  }

  function applyEffects(target, effects) {
    (effects || []).forEach(function (effect) {
      if (!effect) {
        return;
      }
      var type = String(effect.type || '');
      var value = toInt(effect.value, 0);
      if (GATHER_TYPES[type]) {
        target.gather[GATHER_TYPES[type]] += value;
      } else if (FLAVOR_TYPES[type]) {
        target.flavor[FLAVOR_TYPES[type]] += value;
      } else if (MATERIAL_GAIN_TYPES[type]) {
        target.gain[MATERIAL_GAIN_TYPES[type]] += value;
      }
    });
  }

  function parseCrit(desc) {
    var text = String(desc || '');
    var re = /(\d+)%概率额外获得(-?\d+)%(?:的)?素材/g;
    var chance = 0;
    var material = 0;
    var match;
    while ((match = re.exec(text)) !== null) {
      chance += toInt(match[1], 0);
      material += toInt(match[2], 0);
    }
    return { chance: chance, material: material };
  }

  function parseAuraGather(desc) {
    var text = String(desc || '');
    var bonus = emptyBonus();
    var multi = text.match(/场上所有厨师(肉|鱼|菜|面)和(肉|鱼|菜|面)各\+(\d+)/);
    var single = text.match(/场上所有厨师(肉|鱼|菜|面)(?:类采集|采集)?\+(\d+)/);
    var map = { 肉: 'meat', 鱼: 'fish', 菜: 'veg', 面: 'creation' };
    if (multi) {
      bonus[map[multi[1]]] += toInt(multi[3], 0);
      bonus[map[multi[2]]] += toInt(multi[3], 0);
    } else if (single) {
      bonus[map[single[1]]] += toInt(single[2], 0);
    }
    return bonus;
  }

  function emptyBonus() {
    return { meat: 0, fish: 0, veg: 0, creation: 0 };
  }

  function addBonus(a, b) {
    return {
      meat: a.meat + b.meat,
      fish: a.fish + b.fish,
      veg: a.veg + b.veg,
      creation: a.creation + b.creation
    };
  }

  function effectCondition(effect) {
    return String((effect && effect.condition) || 'Self');
  }

  function buildChef(raw, user, data, skillMap) {
    var chefId = Number(raw.chefId);
    var diskLv = toInt((user.chefDiskLv || {})[chefId], 1);
    var amberIds = (user.chefAmber || {})[chefId] || [];
    var equipId = (user.chefEquip || {})[chefId];
    var selfIds = (user.userUltimate && user.userUltimate.Self && user.userUltimate.Self.id) || [];
    var partialIds = (user.userUltimate && user.userUltimate.Partial && user.userUltimate.Partial.id) || [];
    var selfSet = {};
    var partialSet = {};
    selfIds.forEach(function (id) { selfSet[id] = true; });
    partialIds.forEach(function (id) { partialSet[id] = true; });

    var target = {
      gather: {
        meat: toInt(raw.meat, 0),
        fish: toInt(raw.fish, 0),
        veg: toInt(raw.veg, 0),
        creation: toInt(raw.creation, 0)
      },
      flavor: {
        sweet: toInt(raw.sweet, 0),
        sour: toInt(raw.sour, 0),
        spicy: toInt(raw.spicy, 0),
        salty: toInt(raw.salty, 0),
        bitter: toInt(raw.bitter, 0),
        tasty: toInt(raw.tasty, 0)
      },
      gain: { base: 0, meat: 0, fish: 0, veg: 0, creation: 0 },
      critChance: 0,
      critMaterial: 0
    };

    var personalDesc = descOfSkill(skillMap, raw.skill);
    var personalEffects = effectsOfSkill(skillMap, raw.skill);
    applyEffects(target, personalEffects);
    var personalCrit = parseCrit(personalDesc);
    target.critChance += personalCrit.chance;
    target.critMaterial += personalCrit.material;

    var ultimateSkillId = (raw.ultimateSkillList || [])[0];
    var ultimateKey = ultimateSkillId ? chefId + ',' + ultimateSkillId : '';
    var ultimateDesc = descOfSkill(skillMap, ultimateSkillId);
    var ultimateEffects = effectsOfSkill(skillMap, ultimateSkillId);
    var isSelfUlt = !!selfSet[ultimateKey];
    var isPartialUlt = !!partialSet[ultimateKey];
    if (isSelfUlt) {
      applyEffects(target, ultimateEffects);
      var ultCrit = parseCrit(ultimateDesc);
      target.critChance += ultCrit.chance;
      target.critMaterial += ultCrit.material;
    }

    var amberNames = [];
    amberIds.forEach(function (amberId) {
      var id = toInt(amberId, 0);
      if (!id) {
        return;
      }
      var amber = (data.ambers || []).find(function (a) { return Number(a.amberId) === id; });
      if (!amber) {
        return;
      }
      amberNames.push(amber.name);
      var levelIndex = Math.max(0, diskLv - 1);
      (amber.skill || []).forEach(function (sid) {
        var skill = skillMap[Number(sid)];
        if (!skill) {
          return;
        }
        var scaled = (skill.effect || []).map(function (effect) {
          var copy = {};
          Object.keys(effect).forEach(function (k) { copy[k] = effect[k]; });
          copy.value = toInt(effect.value, 0) + levelIndex * toInt(amber.amplification, 0);
          return copy;
        });
        applyEffects(target, scaled);
      });
    });

    var equipName = '';
    var equipDesc = '';
    if (equipId) {
      var equip = (data.equips || []).find(function (e) { return Number(e.equipId) === Number(equipId); });
      if (equip) {
        equipName = equip.name;
        var descs = [];
        (equip.skill || []).forEach(function (sid) {
          applyEffects(target, effectsOfSkill(skillMap, sid));
          var desc = descOfSkill(skillMap, sid);
          if (desc) {
            descs.push(desc);
          }
          var eqCrit = parseCrit(desc);
          target.critChance += eqCrit.chance;
          target.critMaterial += eqCrit.material;
        });
        equipDesc = descs.join('；');
      }
    }

    var auraBonus = isPartialUlt ? parseAuraGather(ultimateDesc) : emptyBonus();

    return {
      id: chefId,
      galleryId: raw.galleryId || String(chefId),
      name: raw.name,
      rarity: toInt(raw.rarity, 0),
      origin: String(raw.origin || '').replace(/<br\s*\/?>/gi, ' / '),
      skillDesc: personalDesc,
      personalEffects: personalEffects,
      ultimateDesc: ultimateDesc,
      ultimateEffects: ultimateEffects,
      isSelfUlt: isSelfUlt,
      isPartialUlt: isPartialUlt,
      auraBonus: auraBonus,
      gather: target.gather,
      flavor: target.flavor,
      gain: target.gain,
      critChance: target.critChance,
      critMaterial: target.critMaterial,
      cook: {
        stirfry: toInt(raw.stirfry, 0),
        boil: toInt(raw.boil, 0),
        knife: toInt(raw.knife, 0),
        fry: toInt(raw.fry, 0),
        bake: toInt(raw.bake, 0),
        steam: toInt(raw.steam, 0)
      },
      diskLv: diskLv,
      amberNames: amberNames,
      equipName: equipName,
      equipDesc: equipDesc,
      tags: raw.tags || []
    };
  }

  function expectation(chef, typeKey) {
    var gain = chef.gain.base + (chef.gain[typeKey] || 0);
    return gain + (chef.critChance / 100) * chef.critMaterial;
  }

  function buildOwnedChefs(data, user) {
    var skillMap = skillMapOf(data);
    var chefGot = user.chefGot || {};
    return (data.chefs || [])
      .filter(function (c) { return chefGot[c.chefId] === true; })
      .map(function (c) { return buildChef(c, user, data, skillMap); })
      .sort(function (a, b) { return b.rarity - a.rarity || a.id - b.id; });
  }

  function teamAuraBonus(chefs) {
    return chefs.reduce(function (sum, chef) {
      return addBonus(sum, (chef && chef.auraBonus) || emptyBonus());
    }, emptyBonus());
  }

  function chefPoints(chef, key, aura) {
    return toInt(chef.gather[key], 0) + toInt(aura[key], 0);
  }

  function teamPoints(chefs, key) {
    var aura = teamAuraBonus(chefs);
    return chefs.reduce(function (sum, chef) {
      return sum + chefPoints(chef, key, aura);
    }, 0);
  }

  function teamDualPoints(chefs, keys) {
    return keys.reduce(function (sum, key) { return sum + teamPoints(chefs, key); }, 0);
  }

  function teamGain(chefs, typeKey) {
    if (!chefs.length) {
      return 0;
    }
    var total = chefs.reduce(function (sum, chef) { return sum + expectation(chef, typeKey); }, 0);
    return Math.round((total / chefs.length) * 10) / 10;
  }

  function percentQty(value, gain) {
    return Math.ceil((value * (100 + Number(gain))) / 100);
  }

  function gardenYield(map, chefs) {
    var area = VEG_AREAS.find(function (x) { return x.name === map.name; });
    var points = teamPoints(chefs, area.key);
    var gain = teamGain(chefs, area.key);
    var materials = (map.materials || []).map(function (m) {
      var unlocked = points >= toInt(m.skill, 0);
      var qty = (m.quantity && m.quantity[TIME_SLOT]) || [0, 0];
      return {
        name: m.name,
        skill: m.skill,
        unlocked: unlocked,
        min: unlocked ? percentQty(qty[0], gain) : 0,
        max: unlocked ? percentQty(qty[1], gain) : 0
      };
    });
    return { points: points, gain: gain, materials: materials, capacity: area.capacity, label: area.label };
  }

  function jadeTier(points) {
    var reached = 0;
    JADE_TIERS.forEach(function (tier) {
      if (points >= tier) {
        reached = tier;
      }
    });
    return reached;
  }

  function previewGather(area, chefs, data) {
    var filled = chefs.filter(Boolean);
    if (area.group === 'veg') {
      var map = (data.maps || []).find(function (m) { return m.name === area.name; });
      var result = gardenYield(map, filled);
      return {
        kind: 'veg',
        title: area.name,
        points: result.points,
        need: result.capacity,
        gain: result.gain,
        label: result.label,
        materials: result.materials,
        ok: result.points >= result.capacity
      };
    }
    if (area.group === 'jade') {
      var points = teamDualPoints(filled, area.keys);
      var tier = jadeTier(points);
      return {
        kind: 'jade',
        title: area.name,
        label: area.label,
        points: points,
        tier: tier,
        ok: points >= 60
      };
    }
    var total = filled.reduce(function (sum, c) { return sum + toInt(c.flavor[area.flavor], 0); }, 0);
    return {
      kind: 'cond',
      title: area.name,
      label: area.defaultName + ' / ' + area.flavorLabel,
      points: total,
      need: 1080,
      ok: total >= 1080
    };
  }

  function topTwoGatherKeys(chef) {
    return ['meat', 'fish', 'veg', 'creation']
      .map(function (key) { return { key: key, value: chef.gather[key] }; })
      .sort(function (a, b) { return b.value - a.value; })
      .slice(0, 2)
      .map(function (x) { return x.key; })
      .sort();
  }

  function combinations(list, k) {
    var result = [];
    function walk(start, acc) {
      if (acc.length === k) {
        result.push(acc.slice());
        return;
      }
      for (var i = start; i < list.length; i++) {
        acc.push(list[i]);
        walk(i + 1, acc);
        acc.pop();
      }
    }
    if (list.length <= k) {
      return [list.slice()];
    }
    walk(0, []);
    return result;
  }

  function pickGardenTeam(chefs, area) {
    var scored = chefs.map(function (chef) {
      var aura = chef.auraBonus[area.key] || 0;
      return { chef: chef, raw: chef.gather[area.key] + PEOPLE * aura, exp: expectation(chef, area.key) };
    });
    var byExp = scored.filter(function (x) { return x.exp > 0; }).sort(function (a, b) { return b.exp - a.exp || b.raw - a.raw; });
    var byRaw = scored.slice().sort(function (a, b) { return b.raw - a.raw || b.exp - a.exp; });
    var poolMap = {};
    byExp.slice(0, 12).forEach(function (x) { poolMap[x.chef.id] = x; });
    byRaw.slice(0, 16).forEach(function (x) { poolMap[x.chef.id] = x; });
    var auraFirst = scored.find(function (x) { return (x.chef.auraBonus[area.key] || 0) > 0; });
    if (auraFirst) {
      poolMap[auraFirst.chef.id] = auraFirst;
    }
    var pool = Object.keys(poolMap).map(function (id) { return poolMap[id]; });
    var best = null;
    combinations(pool, Math.min(PEOPLE, pool.length)).forEach(function (items) {
      var team = items.map(function (x) { return x.chef; });
      var points = teamPoints(team, area.key);
      var exp = teamGain(team, area.key);
      var meet = points >= area.capacity;
      var current = { meet: meet, exp: exp, points: points, team: team };
      if (!best) {
        best = current;
        return;
      }
      if (meet !== best.meet) {
        if (meet) {
          best = current;
        }
        return;
      }
      if (meet) {
        if (exp > best.exp || (exp === best.exp && points < best.points)) {
          best = current;
        }
        return;
      }
      if (points > best.points || (points === best.points && exp > best.exp)) {
        best = current;
      }
    });
    return best && best.team.length ? best.team : byRaw.slice(0, PEOPLE).map(function (x) { return x.chef; });
  }

  function pickJadeTeam(chefs, area) {
    var required = area.keys.slice().sort();
    var matched = chefs.filter(function (chef) {
      var top = topTwoGatherKeys(chef);
      return top[0] === required[0] && top[1] === required[1];
    });
    var filler = chefs.slice().sort(function (a, b) {
      return (b.gather[area.keys[0]] + b.gather[area.keys[1]]) - (a.gather[area.keys[0]] + a.gather[area.keys[1]]);
    });
    var pool = matched.length >= PEOPLE
      ? matched
      : matched.concat(filler.filter(function (c) {
        return !matched.some(function (m) { return m.id === c.id; });
      }));
    return pool.map(function (chef) {
      var aura = (chef.auraBonus[area.keys[0]] || 0) + (chef.auraBonus[area.keys[1]] || 0);
      var raw = chef.gather[area.keys[0]] + chef.gather[area.keys[1]];
      return { chef: chef, score: raw + PEOPLE * aura, raw: raw };
    }).sort(function (a, b) {
      return b.score - a.score || b.raw - a.raw || b.chef.rarity - a.chef.rarity;
    }).slice(0, PEOPLE).map(function (x) { return x.chef; });
  }

  function pickCondTeam(chefs, area) {
    return chefs.slice().sort(function (a, b) {
      var av = a.flavor[area.flavor] || 0;
      var bv = b.flavor[area.flavor] || 0;
      return bv !== av ? bv - av : b.rarity - a.rarity;
    }).slice(0, PEOPLE);
  }

  function pickTeam(area, chefs) {
    if (area.group === 'veg') {
      return pickGardenTeam(chefs, area);
    }
    if (area.group === 'jade') {
      return pickJadeTeam(chefs, area);
    }
    return pickCondTeam(chefs, area);
  }

  function findArea(name) {
    return VEG_AREAS.concat(JADE_AREAS, COND_AREAS).find(function (a) { return a.name === name; }) || null;
  }

  function signed(value, suffix) {
    suffix = suffix || '';
    if (value > 0) {
      return '+' + value + suffix;
    }
    if (value < 0) {
      return String(value) + suffix;
    }
    return '0' + suffix;
  }

  function summarizeEffects(effects, conditionFilter) {
    var tech = {};
    var openTime = 0;
    var gold = 0;
    var guest = 0;
    var lines = [];
    Object.keys(TECH_TYPES).forEach(function (k) { tech[k] = 0; });
    (effects || []).forEach(function (effect) {
      if (!effect) {
        return;
      }
      if (conditionFilter && effectCondition(effect) !== conditionFilter && !(conditionFilter === 'Partial' && effectCondition(effect) === 'Partial')) {
        if (!(conditionFilter === 'Next' && effectCondition(effect) === 'Next')) {
          if (conditionFilter !== 'Any') {
            return;
          }
        }
      }
      var type = String(effect.type || '');
      var value = toInt(effect.value, 0);
      if (TECH_TYPES[type]) {
        tech[type] += value;
      } else if (type === 'OpenTime') {
        openTime += value;
      } else if (type === 'Gold_Gain') {
        gold += value;
      } else if (type === 'GuestApearRate') {
        guest += value;
      }
    });
    Object.keys(TECH_TYPES).forEach(function (k) {
      if (tech[k]) {
        lines.push(TECH_TYPES[k] + signed(tech[k]));
      }
    });
    if (openTime) {
      lines.push('开业时间' + signed(openTime, '%'));
    }
    if (gold) {
      lines.push('金币' + signed(gold, '%'));
    }
    if (guest) {
      lines.push('稀客' + signed(guest, '%'));
    }
    return { tech: tech, openTime: openTime, gold: gold, guest: guest, lines: lines };
  }

  function analyzeOpenTeam(chefs) {
    var slots = [chefs[0] || null, chefs[1] || null, chefs[2] || null];
    var auras = [];
    var nextBuffs = [null, null, null];
    var selfBuffs = [];
    var total = { tech: {}, openTime: 0, gold: 0, guest: 0, lines: [] };
    Object.keys(TECH_TYPES).forEach(function (k) { total.tech[k] = 0; });

    slots.forEach(function (chef, index) {
      if (!chef) {
        return;
      }
      if (chef.isPartialUlt && chef.ultimateDesc) {
        auras.push({ name: chef.name, desc: chef.ultimateDesc });
        var partial = summarizeEffects(chef.ultimateEffects, 'Partial');
        Object.keys(TECH_TYPES).forEach(function (k) { total.tech[k] += partial.tech[k]; });
        total.openTime += partial.openTime;
        total.gold += partial.gold;
        total.guest += partial.guest;
      }
      if (chef.isSelfUlt && chef.ultimateDesc) {
        selfBuffs.push({ name: chef.name, desc: chef.ultimateDesc });
        var selfSum = summarizeEffects(chef.ultimateEffects, 'Self');
        total.openTime += selfSum.openTime;
        total.gold += selfSum.gold;
        total.guest += selfSum.guest;
      }
      var personalOpen = summarizeEffects(chef.personalEffects, 'Any');
      total.openTime += personalOpen.openTime;
      total.gold += personalOpen.gold;
      total.guest += personalOpen.guest;
      var nextEffects = (chef.ultimateEffects || []).filter(function (e) { return effectCondition(e) === 'Next'; });
      if (chef.isPartialUlt && nextEffects.length && index < 2) {
        nextBuffs[index + 1] = chef.name + ' → ' + (slots[index + 1] ? slots[index + 1].name : '空位') + '：' + chef.ultimateDesc;
      }
    });

    Object.keys(TECH_TYPES).forEach(function (k) {
      if (total.tech[k]) {
        total.lines.push('全场' + TECH_TYPES[k] + signed(total.tech[k]));
      }
    });
    if (total.openTime) {
      total.lines.push('开业时间' + signed(total.openTime, '%'));
    }
    if (total.gold) {
      total.lines.push('金币' + signed(total.gold, '%'));
    }
    if (total.guest) {
      total.lines.push('稀客' + signed(total.guest, '%'));
    }

    return {
      slots: slots,
      auras: auras,
      selfBuffs: selfBuffs,
      nextBuffs: nextBuffs.filter(Boolean),
      total: total
    };
  }

  function isOpenChef(chef) {
    var text = (chef.skillDesc || '') + (chef.ultimateDesc || '');
    return /开业|金币|稀有客人|江湖帖/.test(text) || chef.isPartialUlt;
  }

  function yesMap(arr, key) {
    var result = {};
    (arr || []).forEach(function (item) {
      if (!item || item.id == null) {
        return;
      }
      result[item.id] = item[key] === '是';
    });
    return result;
  }

  function countTrue(map) {
    return Object.keys(map || {}).filter(function (k) { return map[k]; }).length;
  }

  function mergeGot(localMap, officialMap) {
    var next = {};
    Object.keys(localMap || {}).forEach(function (k) {
      if (localMap[k]) {
        next[k] = true;
      }
    });
    Object.keys(officialMap || {}).forEach(function (k) {
      if (officialMap[k]) {
        next[k] = true;
      }
    });
    return next;
  }

  function chefUltimateMeta(raw, skillMap) {
    var sid = raw.ultimateSkillList && raw.ultimateSkillList.length
      ? raw.ultimateSkillList[0]
      : raw.ultimateSkill;
    if (sid && typeof sid === 'object') {
      sid = sid.skillId;
    }
    var skill = skillMap[Number(sid)];
    if (!skill) {
      return null;
    }
    var conditions = [];
    (skill.effect || []).forEach(function (effect) {
      if (effect && effect.condition && conditions.indexOf(effect.condition) < 0) {
        conditions.push(effect.condition);
      }
    });
    return {
      skillId: skill.skillId,
      desc: String(skill.desc || ''),
      effect: skill.effect || [],
      condition: conditions[0] || ''
    };
  }

  function buildUltimateFromChefUlt(data, chefUlt, decoBuff) {
    var skillMap = skillMapOf(data);
    var allUltimate = { Partial: { id: [], row: [] }, Self: { id: [], row: [] } };
    var skillObj = { Stirfry: 0, Boil: 0, Knife: 0, Fry: 0, Bake: 0, Steam: 0 };
    var globalObj = { Male: 0, Female: 0, All: 0 };
    var priceObj = { PriceBuff_1: 0, PriceBuff_2: 0, PriceBuff_3: 0, PriceBuff_4: 0, PriceBuff_5: 0 };
    var limitObj = { MaxLimit_1: 0, MaxLimit_2: 0, MaxLimit_3: 0, MaxLimit_4: 0, MaxLimit_5: 0 };

    (data.chefs || []).forEach(function (item) {
      if (!chefUlt[item.chefId]) {
        return;
      }
      var meta = chefUltimateMeta(item, skillMap);
      if (!meta) {
        return;
      }
      var id = item.chefId + ',' + meta.skillId;
      if (meta.condition === 'Partial' || meta.condition === 'Next') {
        allUltimate.Partial.id.push(id);
        allUltimate.Partial.row.push({
          id: id,
          name: item.name,
          subName: meta.desc,
          effect: meta.effect
        });
      }
      if (meta.condition === 'Self') {
        var selfEffect = meta.effect.filter(function (eff) {
          return eff.type !== 'Material_Gain' && eff.type !== 'GuestDropCount';
        });
        if (selfEffect.length) {
          allUltimate.Self.id.push(id);
          allUltimate.Self.row.push({
            id: id,
            name: item.name,
            subName: meta.desc,
            effect: selfEffect
          });
        }
      }
      if (meta.desc.indexOf('全技法') < 0) {
        meta.effect.forEach(function (effect) {
          Object.keys(skillObj).forEach(function (key) {
            if (effect.condition === 'Global' && !effect.tag && effect.type === key) {
              skillObj[key] += toInt(effect.value, 0);
            }
          });
          for (var i = 1; i < 6; i++) {
            if (effect.type === 'UseAll' && Number(effect.rarity) === i) {
              priceObj['PriceBuff_' + i] += toInt(effect.value, 0);
            }
            if (effect.type === 'MaxEquipLimit' && Number(effect.rarity) === i && effect.condition === 'Global') {
              limitObj['MaxLimit_' + i] += toInt(effect.value, 0);
            }
          }
        });
      }
      if (meta.desc.indexOf('全技法') > -1 && meta.effect[0] && meta.effect[0].condition === 'Global') {
        var first = meta.effect[0];
        var value = toInt(first.value, 0);
        if (Number(first.tag) === 1) {
          globalObj.Male += value;
        } else if (Number(first.tag) === 2) {
          globalObj.Female += value;
        } else {
          globalObj.All += value;
        }
      }
    });

    return Object.assign({ decoBuff: toInt(decoBuff, 0) }, allUltimate, skillObj, globalObj, priceObj, limitObj);
  }

  function applyOfficialArchive(user, archive, data) {
    user = user || {};
    archive = archive || {};
    var officialGot = yesMap(archive.chefs, 'got');
    var officialUlt = yesMap(archive.chefs, 'ult');
    var officialRep = yesMap(archive.recipes, 'got');
    var next = {};
    Object.keys(user).forEach(function (key) {
      next[key] = user[key];
    });
    next.chefGot = mergeGot(user.chefGot, officialGot);
    next.repGot = mergeGot(user.repGot, officialRep);
    var chefUlt = {};
    Object.keys(user.chefUlt || {}).forEach(function (key) {
      chefUlt[key] = user.chefUlt[key];
    });
    Object.keys(officialUlt).forEach(function (key) {
      chefUlt[key] = officialUlt[key];
    });
    next.chefUlt = chefUlt;
    next.userUltimate = buildUltimateFromChefUlt(data, chefUlt, archive.decorationEffect);
    if (user.userUltimate) {
      ['Stirfry', 'Boil', 'Knife', 'Fry', 'Bake', 'Steam', 'Male', 'Female', 'All',
        'MaxLimit_1', 'MaxLimit_2', 'MaxLimit_3', 'MaxLimit_4', 'MaxLimit_5',
        'PriceBuff_1', 'PriceBuff_2', 'PriceBuff_3', 'PriceBuff_4', 'PriceBuff_5'].forEach(function (key) {
        var oldVal = toInt(user.userUltimate[key], 0);
        var newVal = toInt(next.userUltimate[key], 0);
        if (oldVal > newVal) {
          next.userUltimate[key] = oldVal;
        }
      });
    }
    return {
      user: next,
      stats: {
        officialChefs: countTrue(officialGot),
        officialUlt: countTrue(officialUlt),
        ownedChefs: countTrue(next.chefGot),
        ownedRecipes: countTrue(next.repGot)
      }
    };
  }

  return {
    PEOPLE: PEOPLE,
    OPEN_PEOPLE: OPEN_PEOPLE,
    VEG_AREAS: VEG_AREAS,
    JADE_AREAS: JADE_AREAS,
    COND_AREAS: COND_AREAS,
    ALL_AREAS: VEG_AREAS.concat(JADE_AREAS, COND_AREAS),
    TECH_TYPES: TECH_TYPES,
    toInt: toInt,
    expectation: expectation,
    buildOwnedChefs: buildOwnedChefs,
    previewGather: previewGather,
    pickTeam: pickTeam,
    findArea: findArea,
    analyzeOpenTeam: analyzeOpenTeam,
    isOpenChef: isOpenChef,
    teamPoints: teamPoints,
    teamDualPoints: teamDualPoints,
    applyOfficialArchive: applyOfficialArchive,
    buildUltimateFromChefUlt: buildUltimateFromChefUlt
  };
});
