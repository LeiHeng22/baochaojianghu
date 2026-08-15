(function () {
  'use strict';

  var E = window.BcjhEngine;
  var STORAGE_KEY = 'bcjh-lineup-v1';
  var USER_KEY = 'bcjh-user-v1';
  var TITLES = {
    chefs: '厨师',
    equips: '厨具',
    ambers: '遗玉',
    open: '开业',
    gather: '探索',
    user: '个人'
  };

  var state = {
    data: null,
    user: null,
    chefs: [],
    chefMap: {},
    ambers: [],
    equips: [],
    mode: 'chefs',
    openPresets: [{ id: 'default', name: '默认开业', slots: [null, null, null] }],
    activeOpenId: 'default',
    gatherTeams: {},
    gatherGroup: 'veg',
    gatherArea: '鸡舍',
    pickTarget: null,
    selectedChefId: null,
    equipPage: 0
  };

  var els = {
    dataStatus: document.getElementById('dataStatus'),
    headerTitle: document.getElementById('headerTitle'),
    aside: document.getElementById('aside'),
    navMask: document.getElementById('navMask'),
    btnNav: document.getElementById('btnNav'),
    chefsPane: document.getElementById('chefsPane'),
    equipsPane: document.getElementById('equipsPane'),
    ambersPane: document.getElementById('ambersPane'),
    openPane: document.getElementById('openPane'),
    gatherPane: document.getElementById('gatherPane'),
    userPane: document.getElementById('userPane'),
    chefKeyword: document.getElementById('chefKeyword'),
    chefFilter: document.getElementById('chefFilter'),
    chefCount: document.getElementById('chefCount'),
    chefTable: document.getElementById('chefTable'),
    equipKeyword: document.getElementById('equipKeyword'),
    equipRarity: document.getElementById('equipRarity'),
    equipCount: document.getElementById('equipCount'),
    equipTable: document.getElementById('equipTable'),
    amberKeyword: document.getElementById('amberKeyword'),
    amberColor: document.getElementById('amberColor'),
    amberCount: document.getElementById('amberCount'),
    amberTable: document.getElementById('amberTable'),
    openPreset: document.getElementById('openPreset'),
    openSlots: document.getElementById('openSlots'),
    openPreview: document.getElementById('openPreview'),
    gatherGroup: document.getElementById('gatherGroup'),
    gatherArea: document.getElementById('gatherArea'),
    gatherSlots: document.getElementById('gatherSlots'),
    gatherPreview: document.getElementById('gatherPreview'),
    tokenInput: document.getElementById('tokenInput'),
    btnOfficial: document.getElementById('btnOfficial'),
    btnLoadLocal: document.getElementById('btnLoadLocal'),
    btnUpdateCatalog: document.getElementById('btnUpdateCatalog'),
    btnImport: document.getElementById('btnImport'),
    fileInput: document.getElementById('fileInput'),
    cloudIdInput: document.getElementById('cloudIdInput'),
    btnCloud: document.getElementById('btnCloud'),
    decoBuff: document.getElementById('decoBuff'),
    btnSaveDeco: document.getElementById('btnSaveDeco'),
    pickerModal: document.getElementById('pickerModal'),
    pickerTitle: document.getElementById('pickerTitle'),
    pickerKeyword: document.getElementById('pickerKeyword'),
    pickerFilter: document.getElementById('pickerFilter'),
    pickerList: document.getElementById('pickerList'),
    toast: document.getElementById('toast')
  };

  function logError(where, err) {
    console.error('[爆炒江湖]', where, err);
  }

  function toast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    window.setTimeout(function () {
      els.toast.classList.remove('show');
    }, 2200);
  }

  function stars(n) {
    return '★'.repeat(Number(n) || 0);
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
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

  function chefById(id) {
    return id ? state.chefMap[Number(id)] || null : null;
  }

  function currentOpen() {
    return state.openPresets.find(function (p) { return p.id === state.activeOpenId; }) || state.openPresets[0];
  }

  function gatherKey(name) {
    return name;
  }

  function currentGatherSlots() {
    var key = gatherKey(state.gatherArea);
    if (!state.gatherTeams[key]) {
      state.gatherTeams[key] = [null, null, null, null];
    }
    return state.gatherTeams[key];
  }

  function usedGatherIds(exceptArea) {
    var used = {};
    Object.keys(state.gatherTeams).forEach(function (area) {
      if (area === exceptArea) {
        return;
      }
      (state.gatherTeams[area] || []).forEach(function (id) {
        if (id) {
          used[id] = area;
        }
      });
    });
    return used;
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        openPresets: state.openPresets,
        activeOpenId: state.activeOpenId,
        gatherTeams: state.gatherTeams,
        gatherGroup: state.gatherGroup,
        gatherArea: state.gatherArea,
        mode: state.mode
      }));
    } catch (err) {
      logError('persist', err);
    }
  }

  function persistUser() {
    if (!state.user) {
      return;
    }
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    } catch (err) {
      logError('persistUser', err);
    }
  }

  function restore() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      var saved = JSON.parse(raw);
      if (saved.openPresets && saved.openPresets.length) {
        state.openPresets = saved.openPresets;
        state.activeOpenId = saved.activeOpenId || saved.openPresets[0].id;
      }
      state.gatherTeams = saved.gatherTeams || {};
      state.gatherGroup = saved.gatherGroup || 'veg';
      state.gatherArea = saved.gatherArea || '鸡舍';
      if (saved.mode && TITLES[saved.mode]) {
        state.mode = saved.mode;
      }
    } catch (err) {
      logError('restore', err);
    }
  }

  function refreshDerived() {
    if (!state.data || !state.user) {
      return;
    }
    state.chefs = E.buildOwnedChefs(state.data, state.user);
    state.chefMap = {};
    state.chefs.forEach(function (c) {
      state.chefMap[c.id] = c;
    });
    if (state.selectedChefId && !state.chefMap[state.selectedChefId]) {
      state.selectedChefId = null;
    }
    if (!state.selectedChefId && state.chefs[0]) {
      state.selectedChefId = state.chefs[0].id;
    }
    state.ambers = E.buildAmberCatalog(state.data, state.user);
    state.equips = E.buildEquipCatalog(state.data, state.user);
    var recipeCount = Object.keys(state.user.repGot || {}).filter(function (k) { return state.user.repGot[k]; }).length;
    els.dataStatus.textContent = '厨师 ' + state.chefs.length + ' · 菜谱 ' + recipeCount;
    if (els.decoBuff) {
      els.decoBuff.value = E.toInt(state.user.userUltimate && state.user.userUltimate.decoBuff, 0);
    }
  }

  function setChefsFromUser(user) {
    state.user = user;
    persistUser();
    refreshDerived();
  }

  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        throw new Error(url + ' HTTP ' + res.status);
      }
      return res.json();
    });
  }

  function ensureData() {
    if (state.data) {
      return Promise.resolve(state.data);
    }
    return loadJson('../data/data.min.json').then(function (data) {
      state.data = data;
      return data;
    });
  }

  function saveUserToDisk(user) {
    persistUser();
    return fetch('/api/save-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(user)
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return true;
    }).catch(function (err) {
      logError('saveUserToDisk', err);
      return false;
    });
  }

  function saveGameDataToDisk(text) {
    return fetch('/api/save-game-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: text
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return true;
    }).catch(function (err) {
      logError('saveGameDataToDisk', err);
      return false;
    });
  }

  function setBusy(btn, busy, idleText, busyText) {
    if (!btn) {
      return;
    }
    btn.disabled = !!busy;
    btn.textContent = busy ? busyText : idleText;
  }

  function loadLocalData() {
    return Promise.all([
      loadJson('../data/data.min.json'),
      loadJson('../data/userData.json')
    ]).then(function (pair) {
      state.data = pair[0];
      var user = pair[1];
      try {
        var cached = window.localStorage.getItem(USER_KEY);
        if (cached) {
          var localUser = JSON.parse(cached);
          if (localUser && localUser.chefGot) {
            user = localUser;
          }
        }
      } catch (err) {
        logError('read cached user', err);
      }
      setChefsFromUser(user);
      renderAll();
      toast('已载入图鉴和个人数据');
    }).catch(function (err) {
      logError('loadLocalData', err);
      toast('载入失败，请到个人页导入数据');
    });
  }

  function importUserText(text) {
    try {
      var user = JSON.parse(text);
      if (!user.chefGot) {
        throw new Error('不是白菜菊花 userData');
      }
      return ensureData().then(function () {
        setChefsFromUser(user);
        renderAll();
        return saveUserToDisk(user).then(function (saved) {
          toast('已导入个人数据' + (saved ? '并写入本地' : ''));
        });
      });
    } catch (err) {
      logError('importUserText', err);
      toast('导入失败：文件不是有效的 userData');
      return Promise.reject(err);
    }
  }

  function importOfficial() {
    var token = (els.tokenInput.value || '').trim();
    if (!token) {
      toast('先填写游戏里的校验码');
      return;
    }
    setBusy(els.btnOfficial, true, '从游戏导入', '导入中…');
    ensureData().then(function () {
      return fetch('https://yx518.com/api/archive.do?token=' + encodeURIComponent(token)).then(function (res) {
        if (!res.ok) {
          throw new Error('官方接口 HTTP ' + res.status);
        }
        return res.text();
      }).then(function (text) {
        var rst = JSON.parse(text);
        if (rst.ret !== 'S') {
          throw new Error(rst.msg || '导入失败');
        }
        var result = E.applyOfficialArchive(state.user || {}, rst.msg, state.data);
        setChefsFromUser(result.user);
        setMode('chefs');
        renderAll();
        return saveUserToDisk(result.user).then(function (saved) {
          toast('已同步满级厨 ' + result.stats.officialChefs + ' 名，合计 ' + result.stats.ownedChefs + ' 名' + (saved ? '，已写入本地' : ''));
        });
      });
    }).catch(function (err) {
      logError('importOfficial', err);
      toast('导入失败：' + (err.message || err));
    }).then(function () {
      setBusy(els.btnOfficial, false, '从游戏导入', '导入中…');
    });
  }

  function importCloud() {
    var id = (els.cloudIdInput.value || '').trim();
    if (!/^\d{1,10}$/.test(id)) {
      toast('云端ID须为10位以内数字');
      return;
    }
    setBusy(els.btnCloud, true, '云端导入', '导入中…');
    ensureData().then(function () {
      return fetch('/api/cloud?id=' + encodeURIComponent(id)).then(function (res) {
        return res.json().then(function (rst) {
          if (!res.ok || !rst.ok) {
            throw new Error((rst && rst.msg) || ('HTTP ' + res.status));
          }
          return rst;
        });
      }).then(function (rst) {
        if (!rst.user || !rst.user.chefGot) {
          throw new Error('云端数据不是个人档');
        }
        setChefsFromUser(rst.user);
        setMode('chefs');
        renderAll();
        return saveUserToDisk(rst.user).then(function (saved) {
          toast('已导入【' + (rst.name || '云端') + '】' + (saved ? '并写入本地' : ''));
        });
      });
    }).catch(function (err) {
      logError('importCloud', err);
      toast('云端导入失败：' + (err.message || err));
    }).then(function () {
      setBusy(els.btnCloud, false, '云端导入', '导入中…');
    });
  }

  function updateCatalog() {
    setBusy(els.btnUpdateCatalog, true, '更新图鉴', '更新中…');
    fetch('https://h5.baochaojianghu.com/data/data.min.json').then(function (res) {
      if (!res.ok) {
        throw new Error('图鉴 HTTP ' + res.status);
      }
      return res.text();
    }).then(function (text) {
      var data = JSON.parse(text);
      state.data = data;
      if (state.user) {
        refreshDerived();
      }
      renderAll();
      return saveGameDataToDisk(text).then(function (saved) {
        toast('图鉴已更新，共 ' + (data.chefs || []).length + ' 名厨师' + (saved ? '，已写入本地' : ''));
      });
    }).catch(function (err) {
      logError('updateCatalog', err);
      toast('更新图鉴失败：' + (err.message || err));
    }).then(function () {
      setBusy(els.btnUpdateCatalog, false, '更新图鉴', '更新中…');
    });
  }

  function filteredChefs() {
    var keyword = (els.chefKeyword.value || '').trim();
    var filter = els.chefFilter.value;
    return state.chefs.filter(function (chef) {
      if (filter === 'aura' && !chef.isPartialUlt) {
        return false;
      }
      if (filter === 'ult' && !chef.isSelfUlt && !chef.isPartialUlt) {
        return false;
      }
      if (filter === 'open' && !E.isOpenChef(chef) && !chef.isPartialUlt) {
        return false;
      }
      if (filter === 'gather') {
        var total = chef.gather.meat + chef.gather.fish + chef.gather.veg + chef.gather.creation;
        if (total < 6 && E.expectation(chef, 'meat') < 4 && !chef.isPartialUlt) {
          return false;
        }
      }
      if (!keyword) {
        return true;
      }
      var blob = [chef.name, chef.skillDesc, chef.ultimateDesc, chef.origin, chef.equipName].concat(chef.amberNames || []).join(' ');
      return blob.indexOf(keyword) >= 0;
    });
  }

  function renderChefTable() {
    var list = filteredChefs();
    els.chefCount.textContent = list.length + ' / ' + state.chefs.length;
    els.chefTable.innerHTML = list.map(function (chef) {
      var g = chef.gather;
      var ambers = (chef.amberSlots || []).map(function (slot) {
        if (!slot.id) {
          return '<span class="tag gray">' + slot.color + '</span>';
        }
        return '<span class="tag ' + ({ 红: 'red', 绿: 'green', 蓝: 'blue' }[slot.color] || 'gray') + '">' + escapeHtml(slot.name) + '</span>';
      }).join('');
      return [
        '<tr data-chef="' + chef.id + '">',
        '<td><img class="thumb" src="' + chef.img + '" alt=""></td>',
        '<td><div class="name">' + escapeHtml(chef.name) + '</div><div class="stars">' + stars(chef.rarity) + '</div><div class="sub">' + (chef.isPartialUlt ? '光环' : (chef.isSelfUlt ? '已修炼' : '未修炼')) + ' · 盘' + chef.diskLv + '</div></td>',
        '<td>' + escapeHtml(chef.skillDesc || '') + (chef.ultimateDesc ? '<div class="sub">' + escapeHtml(chef.ultimateDesc) + '</div>' : '') + '</td>',
        '<td>肉' + g.meat + ' 鱼' + g.fish + ' 菜' + g.veg + ' 面' + g.creation + '</td>',
        '<td>' + escapeHtml(chef.equipName || '未装备') + (chef.equipDesc ? '<div class="sub">' + escapeHtml(chef.equipDesc) + '</div>' : '') + '</td>',
        '<td>' + (ambers || '无') + '</td>',
        '</tr>'
      ].join('');
    }).join('') || '<tr><td colspan="6">没有符合条件的厨师。</td></tr>';
  }

  function renderEquipTable() {
    var keyword = (els.equipKeyword.value || '').trim();
    var rarity = Number(els.equipRarity.value || 0);
    var list = state.equips.filter(function (item) {
      if (rarity && item.rarity !== rarity) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [item.name, item.skill, item.origin].join(' ').indexOf(keyword) >= 0;
    });
    els.equipCount.textContent = '显示 ' + Math.min(80, list.length) + ' / ' + list.length;
    els.equipTable.innerHTML = list.slice(0, 80).map(function (item) {
      return [
        '<tr>',
        '<td><img class="thumb" src="' + item.img + '" alt=""></td>',
        '<td><div class="name">' + escapeHtml(item.name) + '</div><div class="stars">' + stars(item.rarity) + '</div></td>',
        '<td>' + escapeHtml(item.skill || '') + '</td>',
        '<td>' + escapeHtml(item.origin || '') + '</td>',
        '<td>' + escapeHtml(item.wornBy.join('、') || '未装备') + '</td>',
        '</tr>'
      ].join('');
    }).join('') || '<tr><td colspan="5">没有符合条件的厨具。</td></tr>';
  }

  function renderAmberTable() {
    var keyword = (els.amberKeyword.value || '').trim();
    var color = Number(els.amberColor.value || 0);
    var list = state.ambers.filter(function (item) {
      if (color && item.type !== color) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [item.name, item.skill, item.origin, item.color].join(' ').indexOf(keyword) >= 0;
    });
    els.amberCount.textContent = list.length + ' / ' + state.ambers.length;
    els.amberTable.innerHTML = list.map(function (item) {
      var klass = { 红: 'red', 绿: 'green', 蓝: 'blue' }[item.color] || 'gray';
      return [
        '<tr>',
        '<td><img class="thumb" src="' + item.img + '" alt=""></td>',
        '<td><div class="name">' + escapeHtml(item.name) + '</div><div class="stars">' + stars(item.rarity) + '</div></td>',
        '<td><span class="tag ' + klass + '">' + item.color + '</span></td>',
        '<td>' + escapeHtml(item.skill || item.desc) + '</td>',
        '<td>+' + item.amplification + '/级</td>',
        '<td>' + escapeHtml(item.origin || '') + '</td>',
        '<td>' + escapeHtml(item.wornBy.join('、') || '未镶嵌') + '</td>',
        '</tr>'
      ].join('');
    }).join('') || '<tr><td colspan="7">没有符合条件的遗玉。</td></tr>';
  }

  function renderOpenPresets() {
    els.openPreset.innerHTML = state.openPresets.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === state.activeOpenId ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');
  }

  function renderGatherAreas() {
    var list = E.ALL_AREAS.filter(function (a) { return a.group === state.gatherGroup; });
    if (!list.some(function (a) { return a.name === state.gatherArea; })) {
      state.gatherArea = list[0].name;
    }
    els.gatherGroup.value = state.gatherGroup;
    els.gatherArea.innerHTML = list.map(function (a) {
      var extra = a.label ? '（' + a.label + '）' : '';
      return '<option value="' + a.name + '"' + (a.name === state.gatherArea ? ' selected' : '') + '>' + a.name + extra + '</option>';
    }).join('');
  }

  function miniHtml(kind, index, slotIndex, label, item, extraClass) {
    var img = item && item.img ? '<img src="' + item.img + '" alt="">' : '';
    var name = item && item.name ? escapeHtml(item.name) : '空';
    var desc = item && item.desc ? escapeHtml(item.desc) : label;
    return '<button class="mini ' + (extraClass || '') + '" type="button" data-kind="' + kind + '" data-index="' + index + '" data-slot="' + slotIndex + '">' + img + '<b>' + name + '</b><span>' + desc + '</span></button>';
  }

  function chefCardHtml(chef, index, kind) {
    if (!chef) {
      return '<button class="slot empty" type="button" data-kind="' + kind + '" data-index="' + index + '">点此上场</button>';
    }
    var ambers = (chef.amberSlots || []).map(function (slot, i) {
      return miniHtml('amber', index, i, slot.color + '玉', slot.id ? slot : null, ({ 红: 'red', 绿: 'green', 蓝: 'blue' }[slot.color] || ''));
    }).join('');
    return [
      '<div class="slot">',
      '<div class="slot-top" data-kind="' + kind + '" data-index="' + index + '">',
      '<img class="thumb" src="' + chef.img + '" alt="">',
      '<div><div class="slot-name">' + escapeHtml(chef.name) + '</div><div class="stars">' + stars(chef.rarity) + '</div><div class="sub">' + (chef.isPartialUlt ? '光环厨' : (chef.isSelfUlt ? '已修炼' : '个人技')) + ' · 盘' + chef.diskLv + '</div></div>',
      '</div>',
      '<div class="slot-skill">' + escapeHtml(chef.skillDesc || '') + '</div>',
      chef.ultimateDesc ? '<div class="slot-skill">' + escapeHtml(chef.ultimateDesc) + '</div>' : '',
      '<div class="mini-slots">',
      miniHtml('equip', index, 0, '厨具', chef.equipId ? { name: chef.equipName, desc: chef.equipDesc, img: chef.equipImg } : null, ''),
      ambers,
      '</div>',
      '</div>'
    ].join('');
  }

  function renderSlots() {
    var open = currentOpen();
    els.openSlots.innerHTML = (open.slots || [null, null, null]).map(function (id, i) {
      return chefCardHtml(chefById(id), i, 'open');
    }).join('');
    var gather = currentGatherSlots();
    els.gatherSlots.innerHTML = gather.map(function (id, i) {
      return chefCardHtml(chefById(id), i, 'gather');
    }).join('');
  }

  function renderOpenPreview() {
    if (!state.chefs.length) {
      els.openPreview.innerHTML = '<h2>开业预览</h2><p>先到个人页导入数据。</p>';
      return;
    }
    var openChefs = currentOpen().slots.map(chefById);
    var analysis = E.analyzeOpenTeam(openChefs);
    var deco = E.toInt(state.user && state.user.userUltimate && state.user.userUltimate.decoBuff, 0);
    els.openPreview.innerHTML = [
      '<h2>开业预览</h2>',
      '<div class="stat"><span>上场</span><b>' + openChefs.filter(Boolean).length + ' / 3</b></div>',
      '<div class="stat"><span>开业时间</span><b>' + signed(analysis.total.openTime, '%') + '</b></div>',
      '<div class="stat"><span>金币</span><b>' + signed(analysis.total.gold + deco, '%') + '</b></div>',
      '<div class="stat"><span>装饰加成</span><b>' + signed(deco, '%') + '</b></div>',
      '<div class="stat"><span>稀客</span><b>' + signed(analysis.total.guest, '%') + '</b></div>',
      analysis.total.lines.length ? '<p class="tip">' + escapeHtml(analysis.total.lines.join(' · ')) + '</p>' : '',
      '<h2>光环</h2>',
      analysis.auras.length
        ? '<ul class="aura-list">' + analysis.auras.map(function (a) {
          return '<li><b>' + escapeHtml(a.name) + '</b><br>' + escapeHtml(a.desc) + '</li>';
        }).join('') + '</ul>'
        : '<p class="tip">这队没有已修炼的场上光环。</p>',
      analysis.nextBuffs.length ? '<p class="tip">' + escapeHtml(analysis.nextBuffs.join('；')) + '</p>' : '',
      analysis.selfBuffs.length
        ? '<ul class="aura-list">' + analysis.selfBuffs.map(function (a) {
          return '<li><b>' + escapeHtml(a.name) + '（自身）</b><br>' + escapeHtml(a.desc) + '</li>';
        }).join('') + '</ul>'
        : ''
    ].join('');
  }

  function renderGatherPreview() {
    if (!state.chefs.length) {
      els.gatherPreview.innerHTML = '<h2>探索预览</h2><p>先到个人页导入数据。</p>';
      return;
    }
    var area = E.findArea(state.gatherArea);
    var team = currentGatherSlots().map(chefById).filter(Boolean);
    var preview = E.previewGather(area, team, state.data);
    var html = ['<h2>探索预览</h2>', '<div class="stat"><span>地点</span><b>' + escapeHtml(preview.title) + '</b></div>'];
    if (preview.kind === 'veg') {
      html.push('<div class="stat"><span>' + preview.label + '点</span><b class="' + (preview.ok ? 'ok' : 'bad') + '">' + preview.points + ' / ' + preview.need + '</b></div>');
      html.push('<div class="stat"><span>素材期望</span><b>' + preview.gain + '%</b></div>');
      html.push('<div class="material-list">' + preview.materials.map(function (m) {
        return '<div class="material' + (m.unlocked ? '' : ' off') + '"><span>' + escapeHtml(m.name) + '（' + m.skill + '）</span><b>' + (m.unlocked ? (m.min + '~' + m.max) : '未解锁') + '</b></div>';
      }).join('') + '</div>');
    } else if (preview.kind === 'jade') {
      html.push('<div class="stat"><span>' + preview.label + '</span><b>' + preview.points + '</b></div>');
      html.push('<div class="stat"><span>玉片档位</span><b class="' + (preview.ok ? 'ok' : 'bad') + '">' + preview.tier + ' / 240</b></div>');
    } else {
      html.push('<div class="stat"><span>' + preview.label + '</span><b class="' + (preview.ok ? 'ok' : 'bad') + '">' + preview.points + ' / ' + preview.need + '</b></div>');
    }
    var used = usedGatherIds(state.gatherArea);
    var conflicts = [];
    currentGatherSlots().forEach(function (id) {
      if (id && used[id] && state.chefMap[id]) {
        conflicts.push(state.chefMap[id].name + ' 已在' + used[id]);
      }
    });
    if (conflicts.length) {
      html.push('<p class="bad">' + escapeHtml(conflicts.join('；')) + '</p>');
    }
    els.gatherPreview.innerHTML = html.join('');
  }

  function renderAll() {
    renderChefTable();
    renderEquipTable();
    renderAmberTable();
    renderOpenPresets();
    renderGatherAreas();
    renderSlots();
    renderOpenPreview();
    renderGatherPreview();
    persist();
  }

  function setMode(mode) {
    state.mode = mode;
    els.headerTitle.textContent = TITLES[mode] || '图鉴';
    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    els.chefsPane.hidden = mode !== 'chefs';
    els.equipsPane.hidden = mode !== 'equips';
    els.ambersPane.hidden = mode !== 'ambers';
    els.openPane.hidden = mode !== 'open';
    els.gatherPane.hidden = mode !== 'gather';
    els.userPane.hidden = mode !== 'user';
    els.aside.classList.remove('open');
    els.navMask.classList.remove('show');
    persist();
  }

  function closeNav() {
    els.aside.classList.remove('open');
    els.navMask.classList.remove('show');
  }

  function chefForPickerTarget() {
    if (!state.pickTarget) {
      return null;
    }
    var lineup = state.pickTarget.lineup || (state.mode === 'gather' ? 'gather' : 'open');
    var ids = lineup === 'gather' ? currentGatherSlots() : currentOpen().slots;
    return chefById(ids[state.pickTarget.index]);
  }

  function openPicker(kind, index, slot, lineup) {
    state.pickTarget = { kind: kind, index: index, slot: slot, lineup: lineup || kind };
    els.pickerKeyword.value = '';
    if (kind === 'equip') {
      els.pickerTitle.textContent = '选择厨具';
      els.pickerFilter.innerHTML = '<option value="all">全部厨具</option><option value="1">★</option><option value="2">★★</option><option value="3">★★★</option>';
    } else if (kind === 'amber') {
      var color = (E.AMBER_COLORS[slot] || {}).color || '';
      els.pickerTitle.textContent = '选择' + color + '玉';
      els.pickerFilter.innerHTML = '<option value="all">该颜色全部</option>';
    } else {
      els.pickerTitle.textContent = kind === 'open' ? '开业上场 · 第' + (index + 1) + '位' : state.gatherArea + ' · 第' + (index + 1) + '位';
      els.pickerFilter.innerHTML = '<option value="all">已有全部</option><option value="aura">光环厨</option><option value="open">开业向</option><option value="gather">采集向</option>';
      els.pickerFilter.value = kind === 'open' ? 'open' : 'gather';
    }
    els.pickerModal.classList.add('show');
    renderPicker();
  }

  function renderPicker() {
    if (!state.pickTarget) {
      return;
    }
    var keyword = els.pickerKeyword.value.trim();
    var filter = els.pickerFilter.value;
    var kind = state.pickTarget.kind;
    if (kind === 'equip') {
      var rarity = Number(filter) || 0;
      var equips = state.equips.filter(function (item) {
        if (rarity && item.rarity !== rarity) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        return [item.name, item.skill, item.origin].join(' ').indexOf(keyword) >= 0;
      }).slice(0, 80);
      els.pickerList.innerHTML = equips.map(function (item) {
        return '<button class="btn picker-item" type="button" data-id="' + item.id + '"><img class="thumb sm" src="' + item.img + '" alt=""><span><b>' + escapeHtml(item.name) + '</b> ' + stars(item.rarity) + '<small>' + escapeHtml(item.skill + (item.wornBy.length ? ' · ' + item.wornBy.join('、') : '')) + '</small></span></button>';
      }).join('') || '<p>没有符合条件的厨具。</p>';
      return;
    }
    if (kind === 'amber') {
      var type = (state.pickTarget.slot || 0) + 1;
      var ambers = state.ambers.filter(function (item) {
        if (item.type !== type) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        return [item.name, item.skill, item.origin].join(' ').indexOf(keyword) >= 0;
      });
      els.pickerList.innerHTML = ambers.map(function (item) {
        return '<button class="btn picker-item" type="button" data-id="' + item.id + '"><img class="thumb sm" src="' + item.img + '" alt=""><span><b>' + escapeHtml(item.name) + '</b> ' + stars(item.rarity) + '<small>' + escapeHtml(item.skill + (item.wornBy.length ? ' · ' + item.wornBy.join('、') : '')) + '</small></span></button>';
      }).join('') || '<p>没有符合条件的遗玉。</p>';
      return;
    }
    var usedHere = {};
    var currentIds = kind === 'open' ? currentOpen().slots : currentGatherSlots();
    currentIds.forEach(function (id) {
      if (id) {
        usedHere[id] = true;
      }
    });
    var occupied = kind === 'gather' ? usedGatherIds(state.gatherArea) : {};
    var list = state.chefs.filter(function (chef) {
      if (filter === 'aura' && !chef.isPartialUlt) {
        return false;
      }
      if (filter === 'open' && !E.isOpenChef(chef) && !chef.isPartialUlt) {
        return false;
      }
      if (filter === 'gather') {
        var total = chef.gather.meat + chef.gather.fish + chef.gather.veg + chef.gather.creation;
        if (total < 6 && E.expectation(chef, 'meat') < 4 && !chef.isPartialUlt) {
          return false;
        }
      }
      if (!keyword) {
        return true;
      }
      var blob = [chef.name, chef.skillDesc, chef.ultimateDesc, chef.origin].join(' ');
      return blob.indexOf(keyword) >= 0;
    }).slice(0, 80);
    els.pickerList.innerHTML = list.map(function (chef) {
      var busy = occupied[chef.id] ? ' · 已在' + occupied[chef.id] : '';
      var picked = usedHere[chef.id] ? ' · 已在本队' : '';
      return '<button class="btn picker-item" type="button" data-id="' + chef.id + '"><img class="thumb sm" src="' + chef.img + '" alt=""><span><b>' + escapeHtml(chef.name) + '</b> ' + stars(chef.rarity) + '<small>' + escapeHtml((chef.ultimateDesc || chef.skillDesc || '') + busy + picked) + '</small></span></button>';
    }).join('') || '<p>没有符合条件的厨师。</p>';
  }

  function assignPicked(id) {
    if (!state.pickTarget) {
      return;
    }
    var kind = state.pickTarget.kind;
    var index = state.pickTarget.index;
    if (kind === 'equip' || kind === 'amber') {
      var chef = chefForPickerTarget();
      if (!chef || !state.user) {
        toast('先选择上场厨师');
        return;
      }
      if (kind === 'equip') {
        E.setChefEquip(state.user, chef.id, id);
      } else {
        E.setChefAmber(state.user, chef.id, state.pickTarget.slot, id);
      }
      setChefsFromUser(state.user);
      saveUserToDisk(state.user);
    } else if (kind === 'open') {
      currentOpen().slots[index] = id;
    } else {
      currentGatherSlots()[index] = id;
    }
    els.pickerModal.classList.remove('show');
    state.pickTarget = null;
    renderAll();
  }

  function recommendGather() {
    if (!state.chefs.length) {
      toast('先载入数据');
      return;
    }
    var area = E.findArea(state.gatherArea);
    var occupied = usedGatherIds(state.gatherArea);
    var pool = state.chefs.filter(function (c) { return !occupied[c.id]; });
    var team = E.pickTeam(area, pool);
    state.gatherTeams[gatherKey(state.gatherArea)] = [0, 1, 2, 3].map(function (i) {
      return team[i] ? team[i].id : null;
    });
    renderAll();
    toast('已按当前地点推荐四人');
  }

  function onSlotClick(event) {
    var mini = event.target.closest('.mini');
    if (mini) {
      var chefKind = mini.closest('.slot') && mini.closest('.slot').querySelector('[data-kind]');
      var lineupKind = chefKind ? chefKind.getAttribute('data-kind') : (state.mode === 'gather' ? 'gather' : 'open');
      openPicker(mini.getAttribute('data-kind'), Number(mini.getAttribute('data-index')), Number(mini.getAttribute('data-slot') || 0), lineupKind);
      return;
    }
    var top = event.target.closest('[data-kind][data-index]');
    if (top) {
      openPicker(top.getAttribute('data-kind'), Number(top.getAttribute('data-index')));
    }
  }

  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-mode'));
    });
  });

  els.btnNav.addEventListener('click', function () {
    els.aside.classList.toggle('open');
    els.navMask.classList.toggle('show');
  });
  els.navMask.addEventListener('click', closeNav);

  els.btnLoadLocal.addEventListener('click', loadLocalData);
  els.btnImport.addEventListener('click', function () {
    els.fileInput.click();
  });
  els.fileInput.addEventListener('change', function () {
    var file = els.fileInput.files && els.fileInput.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      importUserText(String(reader.result || '')).catch(function (err) {
        logError('file import', err);
      });
    };
    reader.onerror = function () {
      logError('FileReader', reader.error);
      toast('读取文件失败');
    };
    reader.readAsText(file, 'utf-8');
    els.fileInput.value = '';
  });
  els.btnOfficial.addEventListener('click', importOfficial);
  els.btnCloud.addEventListener('click', importCloud);
  els.btnUpdateCatalog.addEventListener('click', updateCatalog);
  els.tokenInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      importOfficial();
    }
  });
  els.cloudIdInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      importCloud();
    }
  });
  els.btnSaveDeco.addEventListener('click', function () {
    if (!state.user) {
      toast('先导入个人数据');
      return;
    }
    state.user.userUltimate = state.user.userUltimate || {};
    state.user.userUltimate.decoBuff = E.toInt(els.decoBuff.value, 0);
    setChefsFromUser(state.user);
    saveUserToDisk(state.user);
    renderAll();
    toast('装饰加成已保存');
  });

  els.chefKeyword.addEventListener('input', renderChefTable);
  els.chefFilter.addEventListener('change', renderChefTable);
  els.equipKeyword.addEventListener('input', renderEquipTable);
  els.equipRarity.addEventListener('change', renderEquipTable);
  els.amberKeyword.addEventListener('input', renderAmberTable);
  els.amberColor.addEventListener('change', renderAmberTable);

  els.openPreset.addEventListener('change', function () {
    state.activeOpenId = els.openPreset.value;
    renderAll();
  });
  document.getElementById('btnNewOpen').addEventListener('click', function () {
    var name = window.prompt('方案名称', '开业方案 ' + (state.openPresets.length + 1));
    if (!name) {
      return;
    }
    var id = 'open-' + Date.now();
    state.openPresets.push({ id: id, name: name, slots: [null, null, null] });
    state.activeOpenId = id;
    renderAll();
  });
  document.getElementById('btnSaveOpen').addEventListener('click', function () {
    persist();
    toast('开业方案已保存到本机');
  });
  document.getElementById('btnClearOpen').addEventListener('click', function () {
    currentOpen().slots = [null, null, null];
    renderAll();
  });

  els.gatherGroup.addEventListener('change', function () {
    state.gatherGroup = els.gatherGroup.value;
    renderGatherAreas();
    renderSlots();
    renderGatherPreview();
    persist();
  });
  els.gatherArea.addEventListener('change', function () {
    state.gatherArea = els.gatherArea.value;
    renderSlots();
    renderGatherPreview();
    persist();
  });
  document.getElementById('btnRecommend').addEventListener('click', recommendGather);
  document.getElementById('btnClearGather').addEventListener('click', function () {
    state.gatherTeams[gatherKey(state.gatherArea)] = [null, null, null, null];
    renderAll();
  });

  els.openSlots.addEventListener('click', onSlotClick);
  els.gatherSlots.addEventListener('click', onSlotClick);

  els.pickerList.addEventListener('click', function (event) {
    var item = event.target.closest('[data-id]');
    if (!item) {
      return;
    }
    assignPicked(Number(item.getAttribute('data-id')));
  });
  document.getElementById('btnPickerEmpty').addEventListener('click', function () {
    assignPicked(null);
  });
  document.getElementById('btnPickerClose').addEventListener('click', function () {
    els.pickerModal.classList.remove('show');
    state.pickTarget = null;
  });
  els.pickerKeyword.addEventListener('input', renderPicker);
  els.pickerFilter.addEventListener('change', renderPicker);
  els.pickerModal.addEventListener('click', function (event) {
    if (event.target === els.pickerModal) {
      els.pickerModal.classList.remove('show');
      state.pickTarget = null;
    }
  });

  restore();
  setMode(state.mode);
  renderOpenPresets();
  renderGatherAreas();
  renderSlots();
  renderOpenPreview();
  renderGatherPreview();
  loadLocalData();
})();
