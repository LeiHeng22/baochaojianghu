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
  var IMAGE_BASE = 'https://h5.baochaojianghu.com/images/';
  var AMBER_COLORS = [
    { type: 1, color: '红', origin: '太初赤玉' },
    { type: 2, color: '绿', origin: '太初碧玉' },
    { type: 3, color: '蓝', origin: '太初青玉' }
  ];

  function imageUrl(kind, galleryId) {
    if (!galleryId && galleryId !== 0) {
      return '';
    }
    var id = String(galleryId);
    while (id.length < 3) {
      id = '0' + id;
    }
    return IMAGE_BASE + kind + '/' + id + '.png';
  }

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
    var amberEffects = [];
    var amberSlots = AMBER_COLORS.map(function (color, index) {
      var id = toInt(amberIds[index], 0);
      var slot = {
        type: color.type,
        color: color.color,
        origin: color.origin,
        id: id,
        name: '',
        desc: '',
        img: '',
        galleryId: ''
      };
      if (!id) {
        return slot;
      }
      var amber = (data.ambers || []).find(function (a) { return Number(a.amberId) === id; });
      if (!amber) {
        return slot;
      }
      slot.name = amber.name;
      slot.galleryId = amber.galleryId;
      slot.img = imageUrl('amber', amber.galleryId);
      amberNames.push(amber.name);
      var levelIndex = Math.max(0, diskLv - 1);
      var descs = [];
      (amber.skill || []).forEach(function (sid) {
        var skill = skillMap[Number(sid)];
        if (!skill) {
          return;
        }
        var scaled = (skill.effect || []).map(function (effect) {
          var copy = {};
          Object.keys(effect).forEach(function (k) { copy[k] = effect[k]; });
          copy.value = toInt(effect.value, 0) + levelIndex * toInt(amber.amplification, 0);
          amberEffects.push(copy);
          return copy;
        });
        applyEffects(target, scaled);
        if (skill.desc) {
          descs.push(String(skill.desc).replace(/_/g, String(toInt(skill.effect && skill.effect[0] && skill.effect[0].value, 0) + levelIndex * toInt(amber.amplification, 0))));
        }
      });
      slot.desc = descs.join('；') || String(amber.desc || '');
      return slot;
    });

    var equipName = '';
    var equipDesc = '';
    var equipEffects = [];
    var equipImg = '';
    var equipGalleryId = '';
    if (equipId) {
      var equip = (data.equips || []).find(function (e) { return Number(e.equipId) === Number(equipId); });
      if (equip) {
        equipName = equip.name;
        equipGalleryId = equip.galleryId;
        equipImg = imageUrl('equip', equip.galleryId);
        var descs = [];
        (equip.skill || []).forEach(function (sid) {
          var effects = effectsOfSkill(skillMap, sid);
          equipEffects = equipEffects.concat(effects);
          applyEffects(target, effects);
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
      amberSlots: amberSlots,
      amberEffects: amberEffects,
      equipId: equipId ? Number(equipId) : 0,
      equipName: equipName,
      equipDesc: equipDesc,
      equipEffects: equipEffects,
      equipImg: equipImg,
      equipGalleryId: equipGalleryId,
      img: imageUrl('chef', raw.galleryId || chefId),
      tags: raw.tags || []
    };
  }

  function guestRateFromEffects(effects) {
    var appear = 0;
    var antique = 0;
    (effects || []).forEach(function (effect) {
      if (!effect) {
        return;
      }
      if (effect.type === 'GuestApearRate') {
        appear += toInt(effect.value, 0);
      }
      if (effect.type === 'GuestAntiqueDropRate') {
        antique += toInt(effect.value, 0);
      }
    });
    return { appear: appear, antique: antique };
  }

  function chefGuestScore(chef) {
    var personal = guestRateFromEffects(chef.personalEffects);
    var ult = { appear: 0, antique: 0 };
    if (chef.isPartialUlt || chef.isSelfUlt) {
      ult = guestRateFromEffects(chef.ultimateEffects);
    }
    var extra = guestRateFromEffects((chef.equipEffects || []).concat(chef.amberEffects || []));
    return {
      appear: personal.appear + ult.appear + extra.appear,
      antique: personal.antique + ult.antique + extra.antique
    };
  }

  function pickGoldRuneChefs(chefs, count) {
    return (chefs || []).slice().sort(function (a, b) {
      var as = chefGuestScore(a).appear;
      var bs = chefGuestScore(b).appear;
      if (bs !== as) {
        return bs - as;
      }
      return (b.rarity || 0) - (a.rarity || 0);
    }).slice(0, count || 3);
  }

  function skillIdsGuestAppear(skillMap, skillIds) {
    var appear = 0;
    (skillIds || []).forEach(function (sid) {
      appear += guestRateFromEffects(effectsOfSkill(skillMap, sid)).appear;
    });
    return appear;
  }

  function expectation(chef, typeKey) {
    var gain = chef.gain.base + (chef.gain[typeKey] || 0);
    return gain + (chef.critChance / 100) * chef.critMaterial;
  }

  function buildAllChefs(data, user) {
    var skillMap = skillMapOf(data);
    var chefGot = (user && user.chefGot) || {};
    return (data.chefs || []).map(function (c) {
      var chef = buildChef(c, user || {}, data, skillMap);
      chef.got = chefGot[c.chefId] === true;
      return chef;
    }).sort(function (a, b) { return b.rarity - a.rarity || a.id - b.id; });
  }

  function buildOwnedChefs(data, user) {
    return buildAllChefs(data, user).filter(function (c) { return c.got; });
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

  function padTeamIds(team) {
    var ids = (team || []).map(function (c) { return c && c.id ? c.id : null; });
    while (ids.length < PEOPLE) {
      ids.push(null);
    }
    return ids.slice(0, PEOPLE);
  }

  function assignAllGather(chefs, data) {
    var used = {};
    function remain() {
      return (chefs || []).filter(function (c) { return c && !used[c.id]; });
    }
    function take(team) {
      (team || []).forEach(function (c) {
        if (c && c.id) {
          used[c.id] = true;
        }
      });
      return padTeamIds(team);
    }
    var result = {};
    VEG_AREAS.forEach(function (area) {
      result[area.name] = take(pickGardenTeam(remain(), area));
    });
    JADE_AREAS.forEach(function (area) {
      result[area.name] = take(pickJadeTeam(remain(), area));
    });
    COND_AREAS.forEach(function (area) {
      result[area.name] = take(pickCondTeam(remain(), area));
    });
    return result;
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
      var extra = summarizeEffects((chef.equipEffects || []).concat(chef.amberEffects || []), 'Any');
      total.openTime += extra.openTime;
      total.gold += extra.gold;
      total.guest += extra.guest;
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

  function emptyUserUltimate(decoBuff) {
    return {
      decoBuff: toInt(decoBuff, 0),
      Stirfry: 0,
      Boil: 0,
      Knife: 0,
      Fry: 0,
      Bake: 0,
      Steam: 0,
      Male: 0,
      Female: 0,
      All: 0,
      MaxLimit_1: 0,
      MaxLimit_2: 0,
      MaxLimit_3: 0,
      MaxLimit_4: 0,
      MaxLimit_5: 0,
      PriceBuff_1: 0,
      PriceBuff_2: 0,
      PriceBuff_3: 0,
      PriceBuff_4: 0,
      PriceBuff_5: 0,
      Partial: { id: [], row: [] },
      Self: { id: [], row: [] }
    };
  }

  function listUltimateOptions(data) {
    var skillMap = skillMapOf(data);
    var partial = [];
    var self = [];
    (data.chefs || []).forEach(function (item) {
      var meta = chefUltimateMeta(item, skillMap);
      if (!meta) {
        return;
      }
      var id = item.chefId + ',' + meta.skillId;
      if (meta.condition === 'Partial' || meta.condition === 'Next') {
        partial.push({
          id: id,
          name: item.name,
          subName: meta.desc,
          effect: meta.effect
        });
      }
      if (meta.condition === 'Self') {
        var selfEffect = (meta.effect || []).filter(function (eff) {
          return eff.type !== 'Material_Gain' && eff.type !== 'GuestDropCount';
        });
        if (selfEffect.length) {
          self.push({
            id: id,
            name: item.name,
            subName: meta.desc,
            effect: selfEffect
          });
        }
      }
    });
    return { partial: partial, self: self };
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

  function wornAmberMap(data, user) {
    var worn = {};
    var chefMap = {};
    (data.chefs || []).forEach(function (c) {
      chefMap[Number(c.chefId)] = c.name;
    });
    Object.keys(user.chefAmber || {}).forEach(function (chefId) {
      (user.chefAmber[chefId] || []).forEach(function (amberId) {
        var id = toInt(amberId, 0);
        if (!id) {
          return;
        }
        if (!worn[id]) {
          worn[id] = [];
        }
        var name = chefMap[Number(chefId)];
        if (name && worn[id].indexOf(name) < 0) {
          worn[id].push(name);
        }
      });
    });
    return worn;
  }

  function wornEquipMap(data, user) {
    var worn = {};
    var chefMap = {};
    (data.chefs || []).forEach(function (c) {
      chefMap[Number(c.chefId)] = c.name;
    });
    Object.keys(user.chefEquip || {}).forEach(function (chefId) {
      var id = toInt(user.chefEquip[chefId], 0);
      if (!id) {
        return;
      }
      if (!worn[id]) {
        worn[id] = [];
      }
      var name = chefMap[Number(chefId)];
      if (name && worn[id].indexOf(name) < 0) {
        worn[id].push(name);
      }
    });
    return worn;
  }

  function buildAmberCatalog(data, user) {
    var skillMap = skillMapOf(data);
    var worn = wornAmberMap(data, user || {});
    return (data.ambers || []).map(function (item) {
      var skills = (item.skill || []).map(function (sid) {
        return descOfSkill(skillMap, sid);
      }).filter(Boolean);
      return {
        id: Number(item.amberId),
        galleryId: item.galleryId,
        name: item.name,
        type: Number(item.type),
        color: (AMBER_COLORS[Number(item.type) - 1] || {}).color || '',
        rarity: toInt(item.rarity, 0),
        amplification: toInt(item.amplification, 0),
        origin: String(item.origin || ''),
        desc: String(item.desc || ''),
        skill: skills.join('；'),
        guestAppear: skillIdsGuestAppear(skillMap, item.skill),
        wornBy: worn[item.amberId] || worn[String(item.amberId)] || [],
        img: imageUrl('amber', item.galleryId)
      };
    });
  }

  function buildEquipCatalog(data, user) {
    var skillMap = skillMapOf(data);
    var worn = wornEquipMap(data, user || {});
    return (data.equips || []).map(function (item) {
      var skills = (item.skill || []).map(function (sid) {
        return descOfSkill(skillMap, sid);
      }).filter(Boolean);
      return {
        id: Number(item.equipId),
        galleryId: item.galleryId,
        name: item.name,
        rarity: toInt(item.rarity, 0),
        origin: String(item.origin || ''),
        skill: skills.join('；'),
        guestAppear: skillIdsGuestAppear(skillMap, item.skill),
        wornBy: worn[item.equipId] || worn[String(item.equipId)] || [],
        img: imageUrl('equip', item.galleryId)
      };
    });
  }

  function recommendGoldGear(user, data, chefIds) {
    var skillMap = skillMapOf(data);
    var equips = (data.equips || []).map(function (item) {
      return { id: Number(item.equipId), guestAppear: skillIdsGuestAppear(skillMap, item.skill) };
    }).filter(function (e) { return e.guestAppear > 0; }).sort(function (a, b) {
      return b.guestAppear - a.guestAppear;
    });
    var ambers = (data.ambers || []).map(function (item) {
      return {
        id: Number(item.amberId),
        type: Number(item.type),
        guestAppear: skillIdsGuestAppear(skillMap, item.skill),
        amp: toInt(item.amplification, 0)
      };
    }).filter(function (a) { return a.guestAppear > 0; }).sort(function (a, b) {
      return b.guestAppear - a.guestAppear || b.amp - a.amp;
    });
    var usedEquip = {};
    var usedAmber = {};
    (chefIds || []).forEach(function (chefId) {
      if (!chefId) {
        return;
      }
      var equip = equips.find(function (e) { return !usedEquip[e.id]; });
      if (equip) {
        setChefEquip(user, chefId, equip.id);
        usedEquip[equip.id] = true;
      }
      var amber = ambers.find(function (a) { return !usedAmber[a.id]; });
      if (amber) {
        setChefAmber(user, chefId, amber.type - 1, amber.id);
        usedAmber[amber.id] = true;
      }
    });
    return user;
  }

  function setChefAmber(user, chefId, slotIndex, amberId) {
    user = user || {};
    user.chefAmber = user.chefAmber || {};
    var slots = (user.chefAmber[chefId] || [0, 0, 0]).slice();
    while (slots.length < 3) {
      slots.push(0);
    }
    slots[slotIndex] = toInt(amberId, 0);
    user.chefAmber[chefId] = slots;
    return user;
  }

  function setChefEquip(user, chefId, equipId) {
    user = user || {};
    user.chefEquip = user.chefEquip || {};
    var id = toInt(equipId, 0);
    if (id) {
      user.chefEquip[chefId] = id;
    } else {
      delete user.chefEquip[chefId];
    }
    return user;
  }

  function formatTime(sec) {
    sec = toInt(sec, 0);
    if (!sec) {
      return '';
    }
    var rst = '';
    var day = 86400;
    var hour = 3600;
    var min = 60;
    if (sec >= day) {
      rst += Math.floor(sec / day) + '天';
      sec %= day;
    }
    if (sec >= hour) {
      rst += Math.floor(sec / hour) + '小时';
      sec %= hour;
    }
    if (sec >= min) {
      rst += Math.floor(sec / min) + '分';
      sec %= min;
    }
    if (sec > 0) {
      rst += sec + '秒';
    }
    return rst;
  }

  function percentShow(val) {
    var n = Number(val);
    if (!n) {
      return '';
    }
    var s = 100000;
    return Math.round(n * s * 100) / s + '%';
  }

  function buildCondimentCatalog(data) {
    var skillMap = skillMapOf(data);
    return (data.condiments || []).map(function (item) {
      var skills = (item.skill || []).map(function (sid) {
        return skillMap[Number(sid)];
      }).filter(Boolean);
      var skillType = {};
      var descs = [];
      skills.forEach(function (skill) {
        descs.push(String(skill.desc || ''));
        (skill.effect || []).forEach(function (effect) {
          if (!effect || !effect.type) {
            return;
          }
          if (effect.type === 'OpenTime') {
            skillType[effect.type] = effect.value < 0 ? 'buff' : 'debuff';
          } else {
            skillType[effect.type] = effect.value > 0 ? 'buff' : 'debuff';
          }
        });
      });
      return {
        condimentId: Number(item.condimentId),
        name: item.name,
        rarity: toInt(item.rarity, 0),
        rarity_show: '★★★'.slice(0, toInt(item.rarity, 0)),
        skill: descs.join('\n'),
        origin: String(item.origin || ''),
        skill_type: skillType
      };
    });
  }

  function buildDecorationCatalog(data) {
    var day = 86400;
    var timeMap = {};
    var suits = [];
    var list = (data.decorations || []).map(function (item) {
      var tipTime = toInt(item.tipTime, 0);
      var tipMin = toInt(item.tipMin, 0);
      var tipMax = toInt(item.tipMax, 0);
      var effMin = tipMin && tipTime ? parseFloat((tipMin / (tipTime / day)).toFixed(1)) : null;
      var effMax = tipMax && tipTime ? parseFloat((tipMax / (tipTime / day)).toFixed(1)) : null;
      var effAvg = (effMin != null && effMax != null)
        ? Math.floor(((effMin + effMax) * 10 / 2)) / 10
        : null;
      if (tipTime) {
        timeMap[tipTime] = true;
      }
      if (item.suit && suits.indexOf(item.suit) < 0) {
        suits.push(item.suit);
      }
      return {
        id: Number(item.id),
        icon: item.icon,
        name: item.name,
        gold: Number(item.gold) || 0,
        gold_show: percentShow(item.gold),
        tipMin: tipMin || '',
        tipMax: tipMax || '',
        tipTime: tipTime,
        tipTime_show: formatTime(tipTime),
        effMin: effMin,
        effMax: effMax,
        effAvg: effAvg,
        position: item.position,
        suit: item.suit || '',
        suitGold: Number(item.suitGold) || 0,
        suitGold_show: percentShow(item.suitGold),
        origin: String(item.origin || '')
      };
    });
    var decoTimes = Object.keys(timeMap).map(Number).sort(function (a, b) {
      return a - b;
    }).map(function (t) {
      return { id: t, name: formatTime(t) };
    });
    return { list: list, suits: suits, decoTimes: decoTimes };
  }

  var SKILL_CN = { stirfry: '炒', boil: '煮', knife: '切', fry: '炸', bake: '烤', steam: '蒸' };
  var CONDIMENT_CN = { Sweet: '甜', Sour: '酸', Spicy: '辣', Salty: '咸', Bitter: '苦', Tasty: '鲜' };
  var GOLD_RUNE_PLAN = [
    { rune: '蒸馏杯', names: ['豆乳芝士蛋饼', '清蒸武昌鱼', '雪花鱼糕', '汽锅鸡', '腊味合蒸', '炒面面包'] },
    { rune: '恐怖利刃', names: ['阴阳豆腐汤', '奇乐无穷', '刺身拼盘', '熊猫戏竹', '蟹黄鱼翅'] },
    { rune: '鼓风机', names: ['腐衣黄鱼卷', '风沙牛排', '冷锅鱼', '夏日风情堡', '邪神烤鸡'] },
    { rune: '千年煮鳖', names: ['得莫利炖鱼', '蟹黄鱼籽丸'] },
    { rune: '香烤鱼排', names: ['勇士大餐', '德式拼盘', '煎牛排'] },
    { rune: '五星炒果', names: ['暖锅子', '香辣蟹', '莲房鱼包', '肉蟹煲'] }
  ];

  function materialTypeOf(origin) {
    if (['菜棚', '菜地', '森林'].indexOf(origin) > -1) {
      return 'vegetable';
    }
    if (['鸡舍', '猪圈', '牧场'].indexOf(origin) > -1) {
      return 'meat';
    }
    if (origin === '作坊') {
      return 'creation';
    }
    if (origin === '池塘') {
      return 'fish';
    }
    return '';
  }

  function buildRecipeCatalog(data, user) {
    var matMap = {};
    (data.materials || []).forEach(function (m) {
      matMap[m.materialId] = m;
    });
    var guestByRecipe = {};
    (data.guests || []).forEach(function (g) {
      (g.gifts || []).forEach(function (gf) {
        if (!guestByRecipe[gf.recipe]) {
          guestByRecipe[gf.recipe] = [];
        }
        guestByRecipe[gf.recipe].push({ guest: g.name, antique: gf.antique });
      });
    });
    var nameById = {};
    (data.recipes || []).forEach(function (r) {
      nameById[r.recipeId] = r.name;
    });
    var comboByRep = {};
    (data.combos || []).forEach(function (c) {
      (c.recipes || []).forEach(function (id) {
        if (!comboByRep[id]) {
          comboByRep[id] = [];
        }
        comboByRep[id].push(nameById[c.recipeId] || '');
      });
    });
    var got = (user && user.repGot) || {};
    return (data.recipes || []).map(function (item) {
      var mats = (item.materials || []).map(function (m) {
        var meta = matMap[m.material] || {};
        return {
          name: meta.name || '',
          qty: m.quantity,
          type: materialTypeOf(meta.origin || '')
        };
      });
      var types = [];
      mats.forEach(function (m) {
        if (m.type && types.indexOf(m.type) < 0) {
          types.push(m.type);
        }
      });
      var skills = [];
      Object.keys(SKILL_CN).forEach(function (key) {
        if (item[key]) {
          skills.push(SKILL_CN[key] + item[key]);
        }
      });
      var time = toInt(item.time, 0);
      var price = toInt(item.price, 0);
      var limit = toInt(item.limit, 0);
      var guests = guestByRecipe[item.name] || [];
      return {
        recipeId: item.recipeId,
        name: item.name,
        rarity: toInt(item.rarity, 0),
        rarity_show: '★★★★★'.slice(0, toInt(item.rarity, 0)),
        stirfry: item.stirfry || 0,
        boil: item.boil || 0,
        knife: item.knife || 0,
        fry: item.fry || 0,
        bake: item.bake || 0,
        steam: item.steam || 0,
        skills_show: skills.join(' '),
        condiment: item.condiment || '',
        condiment_show: CONDIMENT_CN[item.condiment] || '',
        materials_show: mats.map(function (m) { return m.name + '*' + m.qty; }).join(' '),
        materials_search: mats.map(function (m) { return m.name; }).join(' '),
        materials_type: types,
        price: price,
        time: time,
        time_show: formatTime(time),
        limit: limit,
        total_price: price * limit,
        total_time_show: formatTime(time * limit),
        gold_eff: time ? Math.round(3600 / time * price) : 0,
        origin: String(item.origin || '').replace(/<br\s*\/?>/gi, '\n'),
        unlock: item.unlock || '',
        gift: item.gift || '',
        normal_guests: guests.map(function (g) { return g.guest + '-' + g.antique; }).join('\n'),
        degree_guests: (item.guests || []).map(function (g, i) {
          return '优特神'.slice(i, i + 1) + '-' + g.guest;
        }).join('\n'),
        combo: (comboByRep[item.recipeId] || []).filter(Boolean).join('\n'),
        got: !!got[item.recipeId],
        checked: !!got[item.recipeId]
      };
    });
  }

  function goldGuestRate(bonusPct, servings) {
    var bonus = toInt(bonusPct, 0);
    var n = toInt(servings, 15);
    var r7 = 0.100588 * bonus + 10.062;
    var slope = 0.0083 * bonus + 0.83;
    return Math.round((r7 + slope * (n - 7)) * 100) / 100;
  }

  function buildGoldRuneCatalog(data, user) {
    var recipes = {};
    (data.recipes || []).forEach(function (r) {
      recipes[r.name] = r;
    });
    var guestByRecipe = {};
    (data.guests || []).forEach(function (g) {
      (g.gifts || []).forEach(function (gf) {
        if (!guestByRecipe[gf.recipe]) {
          guestByRecipe[gf.recipe] = [];
        }
        guestByRecipe[gf.recipe].push({ guest: g.name, antique: gf.antique });
      });
    });
    var got = (user && user.repGot) || {};
    return GOLD_RUNE_PLAN.map(function (group) {
      return {
        rune: group.rune,
        recipes: group.names.map(function (name) {
          var raw = recipes[name];
          var guests = guestByRecipe[name] || [];
          var time = raw ? toInt(raw.time, 0) : 0;
          var limit = raw ? toInt(raw.limit, 0) : 0;
          return {
            name: name,
            rune: group.rune,
            recipeId: raw ? raw.recipeId : 0,
            rarity: raw ? raw.rarity : 0,
            time: time,
            time_show: formatTime(time),
            total_time_show: formatTime(time * limit),
            origin: raw ? String(raw.origin || '').replace(/<br\s*\/?>/gi, ' ') : '',
            guests: guests.map(function (g) { return g.guest; }).join('、'),
            antique: (guests[0] && guests[0].antique) || group.rune,
            got: raw ? !!got[raw.recipeId] : false
          };
        })
      };
    });
  }

  function recommendGoldRunes(groups, selectedRunes, onlyOwned) {
    var selected = selectedRunes || [];
    var plan = [];
    var options = [];
    groups.forEach(function (group) {
      if (selected.length && selected.indexOf(group.rune) < 0) {
        return;
      }
      var pool = group.recipes.filter(function (r) {
        return onlyOwned ? r.got : true;
      });
      if (!pool.length) {
        pool = group.recipes.slice();
      }
      options = options.concat(pool);
      var best = pool.slice().sort(function (a, b) {
        if (a.got !== b.got) {
          return a.got ? -1 : 1;
        }
        return (a.time || 99999) - (b.time || 99999);
      })[0];
      if (best) {
        plan.push(best);
      }
    });
    return { plan: plan, options: options };
  }

  function buildQuestCatalog(data) {
    return (data.quests || []).map(function (item) {
      var rewards = (item.rewards || []).map(function (r) {
        return r.quantity ? (r.name + ' * ' + r.quantity) : r.name;
      });
      return {
        questId: item.questId,
        questIdDisp: item.questIdDisp != null ? item.questIdDisp : item.questId,
        preId: item.preId || '',
        type: String(item.type || ''),
        goal: String(item.goal || ''),
        rewards_show: rewards.join('\n')
      };
    });
  }

  function setChefDiskLv(user, chefId, level) {
    user = user || {};
    user.chefDiskLv = user.chefDiskLv || {};
    user.chefDiskLv[chefId] = Math.max(1, Math.min(5, toInt(level, 1)));
    return user;
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
    buildAllChefs: buildAllChefs,
    buildOwnedChefs: buildOwnedChefs,
    previewGather: previewGather,
    pickTeam: pickTeam,
    assignAllGather: assignAllGather,
    buildRecipeCatalog: buildRecipeCatalog,
    buildGoldRuneCatalog: buildGoldRuneCatalog,
    recommendGoldRunes: recommendGoldRunes,
    goldGuestRate: goldGuestRate,
    GOLD_RUNE_PLAN: GOLD_RUNE_PLAN,
    findArea: findArea,
    analyzeOpenTeam: analyzeOpenTeam,
    chefGuestScore: chefGuestScore,
    pickGoldRuneChefs: pickGoldRuneChefs,
    recommendGoldGear: recommendGoldGear,
    isOpenChef: isOpenChef,
    teamPoints: teamPoints,
    teamDualPoints: teamDualPoints,
    applyOfficialArchive: applyOfficialArchive,
    buildUltimateFromChefUlt: buildUltimateFromChefUlt,
    emptyUserUltimate: emptyUserUltimate,
    listUltimateOptions: listUltimateOptions,
    imageUrl: imageUrl,
    AMBER_COLORS: AMBER_COLORS,
    formatTime: formatTime,
    buildAmberCatalog: buildAmberCatalog,
    buildEquipCatalog: buildEquipCatalog,
    buildCondimentCatalog: buildCondimentCatalog,
    buildDecorationCatalog: buildDecorationCatalog,
    buildQuestCatalog: buildQuestCatalog,
    setChefAmber: setChefAmber,
    setChefEquip: setChefEquip,
    setChefDiskLv: setChefDiskLv
  };
});
