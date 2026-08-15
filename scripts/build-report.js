'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const REPORT_DIR = path.join(ROOT, 'reports');
const PEOPLE = 4;
const TIME_SLOT = 4;

const VEG_AREAS = [
  { name: '森林', type: 'veg', key: 'veg', label: '菜', capacity: 32 },
  { name: '菜地', type: 'veg', key: 'veg', label: '菜', capacity: 30 },
  { name: '池塘', type: 'fish', key: 'fish', label: '鱼', capacity: 29 },
  { name: '作坊', type: 'creation', key: 'creation', label: '面', capacity: 26 },
  { name: '菜棚', type: 'veg', key: 'veg', label: '菜', capacity: 25 },
  { name: '牧场', type: 'meat', key: 'meat', label: '肉', capacity: 25 },
  { name: '鸡舍', type: 'meat', key: 'meat', label: '肉', capacity: 24 },
  { name: '猪圈', type: 'meat', key: 'meat', label: '肉', capacity: 18 }
];

const JADE_AREAS = [
  { name: '藏心亭', keys: ['meat', 'veg'], label: '肉+菜' },
  { name: '朝阴山', keys: ['meat', 'creation'], label: '肉+面' },
  { name: '北冥城', keys: ['fish', 'creation'], label: '鱼+面' },
  { name: '清空谷', keys: ['meat', 'fish'], label: '肉+鱼' },
  { name: '还寒洞', keys: ['veg', 'creation'], label: '菜+面' },
  { name: '永昼宫', keys: ['veg', 'fish'], label: '菜+鱼' }
];

const JADE_TIERS = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240];

const COND_AREAS = [
  { name: '樊正阁', technique: '蒸', defaultName: '鱼露', flavor: 'tasty', flavorLabel: '鲜' },
  { name: '庖丁阁', technique: '切', defaultName: '山楂', flavor: 'sour', flavorLabel: '酸' },
  { name: '膳祖阁', technique: '炸', defaultName: '蜂蜜', flavor: 'sweet', flavorLabel: '甜' },
  { name: '易牙阁', technique: '烤', defaultName: '丁香', flavor: 'bitter', flavorLabel: '苦' },
  { name: '彭铿阁', technique: '煮', defaultName: '泡椒', flavor: 'spicy', flavorLabel: '辣' },
  { name: '伊尹阁', technique: '炒', defaultName: '盐', flavor: 'salty', flavorLabel: '咸' }
];

const GATHER_TYPES = {
  Meat: 'meat',
  Fish: 'fish',
  Vegetable: 'veg',
  Creation: 'creation'
};

const FLAVOR_TYPES = {
  Sweet: 'sweet',
  Sour: 'sour',
  Spicy: 'spicy',
  Salty: 'salty',
  Bitter: 'bitter',
  Tasty: 'tasty'
};

const MATERIAL_GAIN_TYPES = {
  Material_Gain: 'base',
  Material_Meat: 'meat',
  Material_Fish: 'fish',
  Material_Vegetable: 'veg',
  Material_Creation: 'creation'
};

function logError(where, err) {
  console.error('[ERROR]', where, err && err.stack ? err.stack : err);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    logError('readJson ' + filePath, err);
    throw err;
  }
}

function writeUtf8(filePath, text) {
  fs.writeFileSync(filePath, text, { encoding: 'utf8' });
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stars(rarity) {
  return '★'.repeat(toInt(rarity, 0));
}

function skillMapOf(data) {
  const map = new Map();
  (data.skills || []).forEach((s) => map.set(Number(s.skillId), s));
  return map;
}

function effectsOfSkill(skillMap, skillId) {
  const skill = skillMap.get(Number(skillId));
  return skill && Array.isArray(skill.effect) ? skill.effect : [];
}

function descOfSkill(skillMap, skillId) {
  const skill = skillMap.get(Number(skillId));
  return skill ? String(skill.desc || '') : '';
}

function applyEffects(target, effects, scale) {
  const mul = scale == null ? 1 : scale;
  (effects || []).forEach((effect) => {
    if (!effect) {
      return;
    }
    const type = String(effect.type || '');
    const value = toInt(effect.value, 0) * mul;
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
  const text = String(desc || '');
  const re = /(\d+)%概率额外获得(-?\d+)%(?:的)?素材/g;
  let chance = 0;
  let material = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    chance += toInt(match[1], 0);
    material += toInt(match[2], 0);
  }
  return { chance, material };
}

function parseAuraGather(desc) {
  const text = String(desc || '');
  const bonus = { meat: 0, fish: 0, veg: 0, creation: 0 };
  const multi = text.match(/场上所有厨师(肉|鱼|菜|面)和(肉|鱼|菜|面)各\+(\d+)/);
  const single = text.match(/场上所有厨师(肉|鱼|菜|面)(?:类采集|采集)?\+(\d+)/);
  const map = { 肉: 'meat', 鱼: 'fish', 菜: 'veg', 面: 'creation' };
  if (multi) {
    const value = toInt(multi[3], 0);
    bonus[map[multi[1]]] += value;
    bonus[map[multi[2]]] += value;
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

function amberValueScale(level) {
  return Math.max(1, toInt(level, 1));
}

function buildChef(raw, user, data, skillMap) {
  const chefId = Number(raw.chefId);
  const diskLv = toInt((user.chefDiskLv || {})[chefId], 1);
  const amberIds = (user.chefAmber || {})[chefId] || [];
  const equipId = (user.chefEquip || {})[chefId];
  const selfIds = new Set((user.userUltimate && user.userUltimate.Self && user.userUltimate.Self.id) || []);
  const partialIds = new Set((user.userUltimate && user.userUltimate.Partial && user.userUltimate.Partial.id) || []);

  const target = {
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

  const personalDesc = descOfSkill(skillMap, raw.skill);
  applyEffects(target, effectsOfSkill(skillMap, raw.skill), 1);
  const personalCrit = parseCrit(personalDesc);
  target.critChance += personalCrit.chance;
  target.critMaterial += personalCrit.material;

  const ultimateSkillId = (raw.ultimateSkillList || [])[0];
  const ultimateKey = ultimateSkillId ? chefId + ',' + ultimateSkillId : '';
  const ultimateDesc = descOfSkill(skillMap, ultimateSkillId);
  const ultimateEffects = effectsOfSkill(skillMap, ultimateSkillId);
  const isSelfUlt = selfIds.has(ultimateKey);
  const isPartialUlt = partialIds.has(ultimateKey);
  if (isSelfUlt) {
    applyEffects(target, ultimateEffects, 1);
    const ultCrit = parseCrit(ultimateDesc);
    target.critChance += ultCrit.chance;
    target.critMaterial += ultCrit.material;
  }

  const amberNames = [];
  amberIds.forEach((amberId) => {
    const id = toInt(amberId, 0);
    if (!id) {
      return;
    }
    const amber = data.ambers.find((a) => Number(a.amberId) === id);
    if (!amber) {
      return;
    }
    amberNames.push(amber.name);
    const levelIndex = Math.max(0, diskLv - 1);
    (amber.skill || []).forEach((sid) => {
      const skill = skillMap.get(Number(sid));
      if (!skill) {
        return;
      }
      const scaled = (skill.effect || []).map((effect) => {
        const copy = Object.assign({}, effect);
        copy.value = toInt(effect.value, 0) + levelIndex * toInt(amber.amplification, 0);
        return copy;
      });
      applyEffects(target, scaled, 1);
    });
  });

  let equipName = '';
  let equipDesc = '';
  if (equipId) {
    const equip = data.equips.find((e) => Number(e.equipId) === Number(equipId));
    if (equip) {
      equipName = equip.name;
      const descs = [];
      (equip.skill || []).forEach((sid) => {
        applyEffects(target, effectsOfSkill(skillMap, sid), 1);
        const desc = descOfSkill(skillMap, sid);
        if (desc) {
          descs.push(desc);
        }
        const eqCrit = parseCrit(desc);
        target.critChance += eqCrit.chance;
        target.critMaterial += eqCrit.material;
      });
      equipDesc = descs.join('；');
    }
  }

  const auraBonus = isPartialUlt ? parseAuraGather(ultimateDesc) : emptyBonus();
  const expectation = (typeKey) => {
    const gain = target.gain.base + (target.gain[typeKey] || 0);
    return gain + (target.critChance / 100) * target.critMaterial;
  };

  return {
    id: chefId,
    name: raw.name,
    rarity: toInt(raw.rarity, 0),
    origin: String(raw.origin || '').replace(/<br\s*\/?>/gi, ' / '),
    skillDesc: personalDesc,
    ultimateDesc,
    isSelfUlt,
    isPartialUlt,
    auraBonus,
    gather: target.gather,
    flavor: target.flavor,
    gain: target.gain,
    critChance: target.critChance,
    critMaterial: target.critMaterial,
    expectation,
    diskLv,
    amberNames,
    equipName,
    equipDesc,
    tags: raw.tags || []
  };
}

function topTwoGatherKeys(chef) {
  return ['meat', 'fish', 'veg', 'creation']
    .map((key) => ({ key, value: chef.gather[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((x) => x.key)
    .sort();
}

function teamAuraBonus(chefs) {
  return chefs.reduce((sum, chef) => addBonus(sum, chef.auraBonus || emptyBonus()), emptyBonus());
}

function chefPoints(chef, key, aura) {
  return toInt(chef.gather[key], 0) + toInt(aura[key], 0);
}

function teamPoints(chefs, key) {
  const aura = teamAuraBonus(chefs);
  return chefs.reduce((sum, chef) => sum + chefPoints(chef, key, aura), 0);
}

function teamDualPoints(chefs, keys) {
  return keys.reduce((sum, key) => sum + teamPoints(chefs, key), 0);
}

function teamGain(chefs, typeKey) {
  if (!chefs.length) {
    return 0;
  }
  const total = chefs.reduce((sum, chef) => sum + chef.expectation(typeKey), 0);
  return Math.round((total / chefs.length) * 10) / 10;
}

function percentQty(value, gain) {
  return Math.ceil((value * (100 + Number(gain))) / 100);
}

function gardenYield(map, chefs, data) {
  const area = VEG_AREAS.find((x) => x.name === map.name);
  const points = teamPoints(chefs, area.key);
  const gain = teamGain(chefs, area.key);
  const materials = [];
  (map.materials || []).forEach((m) => {
    const unlocked = points >= toInt(m.skill, 0);
    const qty = (m.quantity && m.quantity[TIME_SLOT]) || [0, 0];
    const min = unlocked ? percentQty(qty[0], gain) : 0;
    const max = unlocked ? percentQty(qty[1], gain) : 0;
    materials.push({
      name: m.name,
      skill: m.skill,
      unlocked,
      min,
      max
    });
  });
  return { points, gain, materials };
}

function jadeTier(points) {
  let reached = 0;
  JADE_TIERS.forEach((tier) => {
    if (points >= tier) {
      reached = tier;
    }
  });
  return reached;
}

function combinations(list, k) {
  const result = [];
  function walk(start, acc) {
    if (acc.length === k) {
      result.push(acc.slice());
      return;
    }
    for (let i = start; i < list.length; i++) {
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
  const scored = chefs.map((chef) => {
    const aura = chef.auraBonus[area.key] || 0;
    const raw = chef.gather[area.key] + PEOPLE * aura;
    return {
      chef,
      raw,
      exp: chef.expectation(area.key)
    };
  });
  const byExp = scored.filter((x) => x.exp > 0).sort((a, b) => b.exp - a.exp || b.raw - a.raw);
  const byRaw = scored.slice().sort((a, b) => b.raw - a.raw || b.exp - a.exp);
  const poolMap = new Map();
  byExp.slice(0, 12).forEach((x) => poolMap.set(x.chef.id, x));
  byRaw.slice(0, 16).forEach((x) => poolMap.set(x.chef.id, x));
  const auraFirst = scored.find((x) => (x.chef.auraBonus[area.key] || 0) > 0);
  if (auraFirst) {
    poolMap.set(auraFirst.chef.id, auraFirst);
  }
  const pool = Array.from(poolMap.values());
  let best = null;

  combinations(pool, Math.min(PEOPLE, pool.length)).forEach((items) => {
    const team = items.map((x) => x.chef);
    const points = teamPoints(team, area.key);
    const exp = teamGain(team, area.key);
    const meet = points >= area.capacity;
    const current = { meet, exp, points, team };
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

  if (best && best.team.length) {
    return best.team;
  }
  return byRaw.slice(0, PEOPLE).map((x) => x.chef);
}

function pickJadeTeam(chefs, area) {
  const required = area.keys.slice().sort();
  const matched = chefs.filter((chef) => {
    const top = topTwoGatherKeys(chef);
    return top[0] === required[0] && top[1] === required[1];
  });
  const filler = chefs.slice().sort((a, b) => {
    const ar = a.gather[area.keys[0]] + a.gather[area.keys[1]];
    const br = b.gather[area.keys[0]] + b.gather[area.keys[1]];
    return br - ar;
  });
  const pool = matched.length >= PEOPLE
    ? matched
    : matched.concat(filler.filter((c) => !matched.some((m) => m.id === c.id)));
  const scored = pool.map((chef) => {
    const aura = (chef.auraBonus[area.keys[0]] || 0) + (chef.auraBonus[area.keys[1]] || 0);
    const raw = chef.gather[area.keys[0]] + chef.gather[area.keys[1]];
    return { chef, score: raw + PEOPLE * aura, raw };
  }).sort((a, b) => b.score - a.score || b.raw - a.raw || b.chef.rarity - a.chef.rarity);
  return scored.slice(0, PEOPLE).map((x) => x.chef);
}

function pickCondTeam(chefs, area) {
  return chefs
    .slice()
    .sort((a, b) => {
      const av = a.flavor[area.flavor] || 0;
      const bv = b.flavor[area.flavor] || 0;
      if (bv !== av) {
        return bv - av;
      }
      return b.rarity - a.rarity;
    })
    .slice(0, PEOPLE);
}

function chefNames(chefs) {
  return chefs.map((c) => c.name).join('、') || '-';
}

function chefDetail(chefs, extra) {
  return chefs.map((c) => {
    const bits = [
      c.name,
      extra ? extra(c) : '',
      c.isPartialUlt ? '光环:' + c.ultimateDesc : '',
      c.equipName ? '厨具:' + c.equipName : '',
      c.amberNames.length ? '遗玉:' + c.amberNames.join('/') : ''
    ].filter(Boolean);
    return bits.join('｜');
  }).join('<br>');
}

function mdEscape(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function csvEscape(text) {
  const s = String(text == null ? '' : text);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatMaterials(materials) {
  const unlocked = materials.filter((m) => m.unlocked);
  if (!unlocked.length) {
    return '未解锁';
  }
  return unlocked.map((m) => m.name + ' ' + m.min + '~' + m.max).join('、');
}

function main() {
  try {
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
    }

    const data = readJson(path.join(DATA_DIR, 'data.min.json'));
    const user = readJson(path.join(DATA_DIR, 'userData.json'));
    const skillMap = skillMapOf(data);
    const chefGot = user.chefGot || {};

    const owned = data.chefs
      .filter((c) => chefGot[c.chefId] === true)
      .map((c) => buildChef(c, user, data, skillMap))
      .sort((a, b) => b.rarity - a.rarity || a.id - b.id);

    const missing = Object.keys(chefGot).filter((id) => chefGot[id] === true && !data.chefs.some((c) => String(c.chefId) === String(id)));
    if (missing.length) {
      console.warn('[WARN] 图鉴数据缺少厨师ID:', missing.join(','));
    }

    const auraChefs = owned.filter((c) => c.isPartialUlt);
    const gatherChefs = owned.filter((c) => {
      const g = c.gather;
      const total = g.meat + g.fish + g.veg + g.creation;
      const exp = Math.max(c.expectation('meat'), c.expectation('fish'), c.expectation('veg'), c.expectation('creation'));
      const gatherAura = c.auraBonus.meat + c.auraBonus.fish + c.auraBonus.veg + c.auraBonus.creation;
      return total >= 8 || exp >= 4 || gatherAura > 0;
    });

    const gardenIndep = VEG_AREAS.map((area) => {
      const map = data.maps.find((m) => m.name === area.name);
      const team = pickGardenTeam(owned, area);
      const result = gardenYield(map, team, data);
      return { area, team, result };
    });

    const jadeIndep = JADE_AREAS.map((area) => {
      const team = pickJadeTeam(owned, area);
      const points = teamDualPoints(team, area.keys);
      return { area, team, points, tier: jadeTier(points) };
    });

    const condIndep = COND_AREAS.map((area) => {
      const team = pickCondTeam(owned, area);
      const total = team.reduce((sum, c) => sum + toInt(c.flavor[area.flavor], 0), 0);
      return { area, team, total };
    });

    const used = new Set();
    function remain() {
      return owned.filter((c) => !used.has(c.id));
    }
    function take(team) {
      team.forEach((c) => used.add(c.id));
      return team;
    }

    const bestGarden = gardenIndep.slice().sort((a, b) => {
      const au = a.result.materials.filter((m) => m.unlocked).length;
      const bu = b.result.materials.filter((m) => m.unlocked).length;
      if (bu !== au) {
        return bu - au;
      }
      if (b.result.gain !== a.result.gain) {
        return b.result.gain - a.result.gain;
      }
      return b.result.points - a.result.points;
    })[0];
    const threeGardenTeam = take(pickGardenTeam(remain(), bestGarden.area));
    const threeGarden = {
      area: bestGarden.area,
      team: threeGardenTeam,
      result: gardenYield(data.maps.find((m) => m.name === bestGarden.area.name), threeGardenTeam, data)
    };

    const jadeCandidates = JADE_AREAS.map((area) => {
      const team = pickJadeTeam(remain(), area);
      const points = teamDualPoints(team, area.keys);
      return { area, team, points, tier: jadeTier(points) };
    }).sort((a, b) => b.points - a.points);
    const threeJadePick = jadeCandidates[0];
    take(threeJadePick.team);
    const threeJade = {
      area: threeJadePick.area,
      team: threeJadePick.team,
      points: teamDualPoints(threeJadePick.team, threeJadePick.area.keys),
      tier: jadeTier(teamDualPoints(threeJadePick.team, threeJadePick.area.keys))
    };

    const condCandidates = COND_AREAS.map((area) => {
      const team = pickCondTeam(remain(), area);
      const total = team.reduce((sum, c) => sum + toInt(c.flavor[area.flavor], 0), 0);
      return { area, team, total };
    }).sort((a, b) => b.total - a.total);
    const threeCondPick = condCandidates[0];
    take(threeCondPick.team);
    const threeCond = {
      area: threeCondPick.area,
      team: threeCondPick.team,
      total: threeCondPick.team.reduce((sum, c) => sum + toInt(c.flavor[threeCondPick.area.flavor], 0), 0)
    };

    const jobUsed = new Set();
    function jobRemain() {
      return owned.filter((c) => !jobUsed.has(c.id));
    }
    function jobTake(team) {
      team.forEach((c) => jobUsed.add(c.id));
      return team;
    }
    const gardenJobs = VEG_AREAS.map((area) => {
      const team = jobTake(pickGardenTeam(jobRemain(), area));
      const map = data.maps.find((m) => m.name === area.name);
      return { area, team, result: gardenYield(map, team, data) };
    });
    const jadeJobs = JADE_AREAS.map((area) => {
      const team = jobTake(pickJadeTeam(jobRemain(), area));
      const points = teamDualPoints(team, area.keys);
      return { area, team, points, tier: jadeTier(points) };
    });
    const condJobs = COND_AREAS.map((area) => {
      const team = jobTake(pickCondTeam(jobRemain(), area));
      const total = team.reduce((sum, c) => sum + toInt(c.flavor[area.flavor], 0), 0);
      return { area, team, total };
    });

    const now = new Date();
    const stamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');

    const chefLines = [];
    chefLines.push('# 已有厨师总表');
    chefLines.push('');
    chefLines.push('生成时间：' + stamp);
    chefLines.push('');
    chefLines.push('数据来源：`data/userData.json`（白菜菊花导出）+ [h5.baochaojianghu.com](https://h5.baochaojianghu.com/) 图鉴数据。');
    chefLines.push('');
    chefLines.push('- 已有厨师：**' + owned.length + '** / 图鉴 ' + data.chefs.length);
    chefLines.push('- 采集相关（有采集点、素材加成或采集光环）：**' + gatherChefs.length + '**');
    chefLines.push('- 已修炼光环厨：**' + auraChefs.length + '**（上场 3 名厨神/开业厨时，光环对场上所有厨师生效）');
    chefLines.push('');
    chefLines.push('## 光环厨师（已修炼）');
    chefLines.push('');
    chefLines.push('| 厨师 | 星级 | 光环 | 采集光环 |');
    chefLines.push('| --- | --- | --- | --- |');
    auraChefs.forEach((c) => {
      const aura = c.auraBonus;
      const gatherAura = (aura.meat || aura.fish || aura.veg || aura.creation)
        ? ('肉' + aura.meat + ' 鱼' + aura.fish + ' 菜' + aura.veg + ' 面' + aura.creation)
        : '非采集光环';
      chefLines.push('| ' + mdEscape(c.name) + ' | ' + stars(c.rarity) + ' | ' + mdEscape(c.ultimateDesc) + ' | ' + gatherAura + ' |');
    });
    chefLines.push('');
    chefLines.push('## 采集相关厨师');
    chefLines.push('');
    chefLines.push('| 厨师 | 星 | 肉 | 鱼 | 菜 | 面 | 素材期望 | 技能 | 修炼 | 厨具 | 遗玉 |');
    chefLines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |');
    gatherChefs
      .slice()
      .sort((a, b) => (b.gather.meat + b.gather.fish + b.gather.veg + b.gather.creation) - (a.gather.meat + a.gather.fish + a.gather.veg + a.gather.creation))
      .forEach((c) => {
        const exp = Math.max(c.expectation('meat'), c.expectation('fish'), c.expectation('veg'), c.expectation('creation'));
        chefLines.push([
          mdEscape(c.name),
          stars(c.rarity),
          c.gather.meat,
          c.gather.fish,
          c.gather.veg,
          c.gather.creation,
          exp.toFixed(1),
          mdEscape(c.skillDesc),
          c.isSelfUlt || c.isPartialUlt ? mdEscape(c.ultimateDesc) : '',
          mdEscape(c.equipName),
          mdEscape(c.amberNames.join(' / '))
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
      });
    chefLines.push('');
    chefLines.push('## 全部已有厨师');
    chefLines.push('');
    chefLines.push('| ID | 厨师 | 星 | 来源 | 个人技能 | 修炼技能 | 已修炼 |');
    chefLines.push('| --- | --- | --- | --- | --- | --- | --- |');
    owned.forEach((c) => {
      chefLines.push([
        c.id,
        mdEscape(c.name),
        stars(c.rarity),
        mdEscape(c.origin),
        mdEscape(c.skillDesc),
        mdEscape(c.ultimateDesc),
        (c.isSelfUlt || c.isPartialUlt) ? '是' : ''
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    });
    chefLines.push('');

    const report = [];
    report.push('# 探索采集对照表');
    report.push('');
    report.push('生成时间：' + stamp);
    report.push('');
    report.push('规则按 [白菜菊花](https://h5.baochaojianghu.com/) / 南风图鉴采集编队口径：');
    report.push('');
    report.push('- 每个地点上场 **' + PEOPLE + '** 名采集厨（你指定的人数）');
    report.push('- 每个厨师同一时间只能去一个地区');
    report.push('- **菜园区**：只看单一采集维（肉/鱼/菜/面）的合计点数，点数够了才出对应食材；素材获得%提高产量');
    report.push('- **玉片区**：看双采集维合计（例如藏心亭=肉+菜），按 15 一档解锁玉片档位');
    report.push('- **调料区**：看对应口味值合计，目标 1080（图鉴默认 5 人，这里按 4 人算，可能不满）');
    report.push('- 光环厨上场后，其采集光环加到**场上所有厨师**');
    report.push('- 产量按最长一档时间（约 22 小时）估算，未算季节/月卡');
    report.push('- 遗玉/厨具按你当前 `userData` 已装备的来算，没有自动换鞋换玉');
    report.push('');
    report.push('## 1. 三区推荐编队（各 4 人，厨师不重复）');
    report.push('');
    report.push('同时铺菜园、玉片、调料各一个点。菜园优先解锁食材最多且素材加成高的点，玉片优先双采集合计最高，调料优先口味值最高。');
    report.push('');
    report.push('| 大区 | 地点 | 上场厨师 | 关键数值 | 能采到什么 |');
    report.push('| --- | --- | --- | --- | --- |');
    report.push('| 菜园区 | ' + threeGarden.area.name + ' | ' + chefNames(threeGarden.team) + ' | ' + threeGarden.area.label + '点 ' + threeGarden.result.points + ' / 需求' + threeGarden.area.capacity + '；素材期望 ' + threeGarden.result.gain + '% | ' + formatMaterials(threeGarden.result.materials) + ' |');
    report.push('| 玉片区 | ' + threeJade.area.name + '（' + threeJade.area.label + '） | ' + chefNames(threeJade.team) + ' | 双采集合计 ' + threeJade.points + '；档位 ' + threeJade.tier + '/240 | 可解锁该点 ' + threeJade.tier + ' 及以下玉片档 |');
    report.push('| 调料区 | ' + threeCond.area.name + '（' + threeCond.area.defaultName + '/' + threeCond.area.flavorLabel + '） | ' + chefNames(threeCond.team) + ' | 口味值 ' + threeCond.total + ' / 1080 | ' + (threeCond.total >= 1080 ? '三火双加可满' : '未满 1080，三火比例会偏低') + ' |');
    report.push('');
    report.push('### 菜园队明细');
    report.push('');
    threeGarden.team.forEach((c) => {
      report.push('- **' + c.name + '**：' + threeGarden.area.label + c.gather[threeGarden.area.key] + '，素材期望 ' + c.expectation(threeGarden.area.key).toFixed(1) + '%' + (c.isPartialUlt ? '，光环 ' + c.ultimateDesc : '') + (c.equipName ? '，' + c.equipName : ''));
    });
    report.push('');
    report.push('### 玉片队明细');
    report.push('');
    threeJade.team.forEach((c) => {
      const dual = c.gather[threeJade.area.keys[0]] + c.gather[threeJade.area.keys[1]];
      report.push('- **' + c.name + '**：' + threeJade.area.label + ' ' + dual + (c.isPartialUlt ? '，光环 ' + c.ultimateDesc : ''));
    });
    report.push('');
    report.push('### 调料队明细');
    report.push('');
    threeCond.team.forEach((c) => {
      report.push('- **' + c.name + '**：' + threeCond.area.flavorLabel + ' ' + toInt(c.flavor[threeCond.area.flavor], 0));
    });
    report.push('');

    report.push('## 2. 分地点最强 4 人（对照，厨师会重复）');
    report.push('');
    report.push('下面每行都是「只看这个点、不管别的点」时的最强 4 人，方便你对照当前派遣。');
    report.push('');
    report.push('### 菜园区');
    report.push('');
    report.push('| 地点 | 类型 | 需求点 | 队伍点 | 素材期望 | 厨师 | 约22小时可采 |');
    report.push('| --- | --- | ---: | ---: | ---: | --- | --- |');
    gardenIndep.forEach((row) => {
      report.push('| ' + row.area.name + ' | ' + row.area.label + ' | ' + row.area.capacity + ' | ' + row.result.points + ' | ' + row.result.gain + '% | ' + chefNames(row.team) + ' | ' + formatMaterials(row.result.materials) + ' |');
    });
    report.push('');
    report.push('### 玉片区');
    report.push('');
    report.push('| 地点 | 双采集 | 合计点 | 档位 | 厨师 |');
    report.push('| --- | --- | ---: | ---: | --- |');
    jadeIndep.forEach((row) => {
      report.push('| ' + row.area.name + ' | ' + row.area.label + ' | ' + row.points + ' | ' + row.tier + ' | ' + chefNames(row.team) + ' |');
    });
    report.push('');
    report.push('### 调料区');
    report.push('');
    report.push('| 地点 | 默认调料 | 口味 | 口味合计 | 目标 | 厨师 |');
    report.push('| --- | --- | --- | ---: | ---: | --- |');
    condIndep.forEach((row) => {
      report.push('| ' + row.area.name + ' | ' + row.area.defaultName + ' | ' + row.area.flavorLabel + ' | ' + row.total + ' | 1080 | ' + chefNames(row.team) + ' |');
    });
    report.push('');

    report.push('## 3. 全图不重复就业（每图 4 人，厨师只上场一次）');
    report.push('');
    report.push('按菜园高需求点 → 玉片 → 调料的顺序占人。人不够的点会变弱。');
    report.push('');
    report.push('### 菜园就业');
    report.push('');
    report.push('| 地点 | 队伍点 | 素材期望 | 厨师 | 约22小时可采 |');
    report.push('| --- | ---: | ---: | --- | --- |');
    gardenJobs.forEach((row) => {
      report.push('| ' + row.area.name + ' | ' + row.result.points + ' | ' + row.result.gain + '% | ' + chefNames(row.team) + ' | ' + formatMaterials(row.result.materials) + ' |');
    });
    report.push('');
    report.push('### 玉片就业');
    report.push('');
    report.push('| 地点 | 合计点 | 档位 | 厨师 |');
    report.push('| --- | ---: | ---: | --- |');
    jadeJobs.forEach((row) => {
      report.push('| ' + row.area.name + '（' + row.area.label + '） | ' + row.points + ' | ' + row.tier + ' | ' + chefNames(row.team) + ' |');
    });
    report.push('');
    report.push('### 调料就业');
    report.push('');
    report.push('| 地点 | 口味合计 | 厨师 |');
    report.push('| --- | ---: | --- |');
    condJobs.forEach((row) => {
      report.push('| ' + row.area.name + '（' + row.area.defaultName + '） | ' + row.total + ' | ' + chefNames(row.team) + ' |');
    });
    report.push('');
    report.push('重新生成：`node scripts/build-report.js`（先把新的 `userData.txt` 覆盖到 `data/userData.json`）。');
    report.push('');

    const csv = [];
    csv.push(['分区', '地点', '模式', '厨师', '数值', '结果'].map(csvEscape).join(','));
    function pushCsv(section, name, mode, team, value, result) {
      csv.push([section, name, mode, chefNames(team), value, result].map(csvEscape).join(','));
    }
    pushCsv('菜园', threeGarden.area.name, '三区推荐', threeGarden.team, threeGarden.result.points, formatMaterials(threeGarden.result.materials));
    pushCsv('玉片', threeJade.area.name, '三区推荐', threeJade.team, threeJade.points, '档位' + threeJade.tier);
    pushCsv('调料', threeCond.area.name, '三区推荐', threeCond.team, threeCond.total, threeCond.total + '/1080');
    gardenIndep.forEach((row) => pushCsv('菜园', row.area.name, '对照最强', row.team, row.result.points, formatMaterials(row.result.materials)));
    jadeIndep.forEach((row) => pushCsv('玉片', row.area.name, '对照最强', row.team, row.points, '档位' + row.tier));
    condIndep.forEach((row) => pushCsv('调料', row.area.name, '对照最强', row.team, row.total, row.total + '/1080'));
    gardenJobs.forEach((row) => pushCsv('菜园', row.area.name, '不重复就业', row.team, row.result.points, formatMaterials(row.result.materials)));
    jadeJobs.forEach((row) => pushCsv('玉片', row.area.name, '不重复就业', row.team, row.points, '档位' + row.tier));
    condJobs.forEach((row) => pushCsv('调料', row.area.name, '不重复就业', row.team, row.total, row.total + '/1080'));

    writeUtf8(path.join(REPORT_DIR, '厨师总表.md'), chefLines.join('\n'));
    writeUtf8(path.join(REPORT_DIR, '采集对照表.md'), report.join('\n'));
    writeUtf8(path.join(REPORT_DIR, '采集对照表.csv'), csv.join('\n') + '\n');

    const summary = {
      generatedAt: stamp,
      ownedChefs: owned.length,
      gatherChefs: gatherChefs.length,
      auraChefs: auraChefs.map((c) => c.name),
      threeArea: {
        garden: { area: threeGarden.area.name, chefs: threeGarden.team.map((c) => c.name), points: threeGarden.result.points, materials: threeGarden.result.materials.filter((m) => m.unlocked).map((m) => m.name) },
        jade: { area: threeJade.area.name, chefs: threeJade.team.map((c) => c.name), points: threeJade.points, tier: threeJade.tier },
        cond: { area: threeCond.area.name, chefs: threeCond.team.map((c) => c.name), total: threeCond.total }
      }
    };
    writeUtf8(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

    console.log('已有厨师', owned.length, '采集相关', gatherChefs.length, '光环', auraChefs.length);
    console.log('三区推荐 菜园', threeGarden.area.name, chefNames(threeGarden.team), threeGarden.result.points);
    console.log('三区推荐 玉片', threeJade.area.name, chefNames(threeJade.team), threeJade.points, '档', threeJade.tier);
    console.log('三区推荐 调料', threeCond.area.name, chefNames(threeCond.team), threeCond.total);
    console.log('报告已写入 reports/');
  } catch (err) {
    logError('main', err);
    process.exitCode = 1;
  }
}

main();
