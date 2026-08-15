(function () {
  'use strict';

  var E = window.BcjhEngine;
  var STORAGE_KEY = 'bcjh-lineup-v1';

  var state = {
    data: null,
    user: null,
    chefs: [],
    chefMap: {},
    mode: 'open',
    openPresets: [{ id: 'default', name: '默认开业', slots: [null, null, null] }],
    activeOpenId: 'default',
    gatherTeams: {},
    gatherGroup: 'veg',
    gatherArea: '鸡舍',
    pickTarget: null,
    selectedChefId: null
  };

  var els = {
    dataStatus: document.getElementById('dataStatus'),
    btnLoadLocal: document.getElementById('btnLoadLocal'),
    btnImport: document.getElementById('btnImport'),
    fileInput: document.getElementById('fileInput'),
    tokenInput: document.getElementById('tokenInput'),
    btnOfficial: document.getElementById('btnOfficial'),
    cloudIdInput: document.getElementById('cloudIdInput'),
    btnCloud: document.getElementById('btnCloud'),
    btnUpdateCatalog: document.getElementById('btnUpdateCatalog'),
    railHint: document.getElementById('railHint'),
    chefsPane: document.getElementById('chefsPane'),
    chefKeyword: document.getElementById('chefKeyword'),
    chefFilter: document.getElementById('chefFilter'),
    chefCount: document.getElementById('chefCount'),
    chefGrid: document.getElementById('chefGrid'),
    openPane: document.getElementById('openPane'),
    gatherPane: document.getElementById('gatherPane'),
    openPreset: document.getElementById('openPreset'),
    openSlots: document.getElementById('openSlots'),
    gatherGroup: document.getElementById('gatherGroup'),
    gatherArea: document.getElementById('gatherArea'),
    gatherSlots: document.getElementById('gatherSlots'),
    preview: document.getElementById('preview'),
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
        gatherArea: state.gatherArea
      }));
    } catch (err) {
      logError('persist', err);
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
    } catch (err) {
      logError('restore', err);
    }
  }

  function setChefsFromUser(user) {
    state.user = user;
    state.chefs = E.buildOwnedChefs(state.data, user);
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
    var recipeCount = Object.keys(user.repGot || {}).filter(function (k) { return user.repGot[k]; }).length;
    els.dataStatus.textContent = '已有厨师 ' + state.chefs.length + ' 名 · 菜谱 ' + recipeCount;
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
          toast('已同步满级厨 ' + result.stats.officialChefs + ' 名，本地合计 ' + result.stats.ownedChefs + ' 名' + (saved ? '，已写入本地' : '；本地文件未写入'));
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
          toast('已导入【' + (rst.name || '云端') + '】' + (saved ? '并写入本地' : '；本地文件未写入'));
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
        setChefsFromUser(state.user);
      }
      renderAll();
      return saveGameDataToDisk(text).then(function (saved) {
        var chefTotal = (data.chefs || []).length;
        toast('图鉴已更新，共 ' + chefTotal + ' 名厨师' + (saved ? '，已写入本地' : '；本地文件未写入'));
      });
    }).catch(function (err) {
      logError('updateCatalog', err);
      toast('更新图鉴失败：' + (err.message || err));
    }).then(function () {
      setBusy(els.btnUpdateCatalog, false, '更新图鉴', '更新中…');
    });
  }

  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        throw new Error(url + ' HTTP ' + res.status);
      }
      return res.json();
    });
  }

  function loadLocalData() {
    return Promise.all([
      loadJson('../data/data.min.json'),
      loadJson('../data/userData.json')
    ]).then(function (pair) {
      state.data = pair[0];
      setChefsFromUser(pair[1]);
      renderAll();
      toast('已载入本地图鉴和个人数据');
    }).catch(function (err) {
      logError('loadLocalData', err);
      toast('载入失败，请用本地服务打开，或先导入 userData');
    });
  }

  function importUserText(text) {
    try {
      var user = JSON.parse(text);
      if (!user.chefGot) {
        throw new Error('不是白菜菊花 userData');
      }
      if (!state.data) {
        return loadJson('../data/data.min.json').then(function (data) {
          state.data = data;
          setChefsFromUser(user);
          renderAll();
          toast('已导入个人数据');
        });
      }
      setChefsFromUser(user);
      renderAll();
      toast('已导入个人数据');
      return Promise.resolve();
    } catch (err) {
      logError('importUserText', err);
      toast('导入失败：文件不是有效的 userData');
      return Promise.reject(err);
    }
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

  function slotHtml(chef, index, kind) {
    if (!chef) {
      return '<button class="slot empty" type="button" data-kind="' + kind + '" data-index="' + index + '">点此上场</button>';
    }
    return [
      '<button class="slot" type="button" data-kind="' + kind + '" data-index="' + index + '">',
      '<div class="rarity">' + stars(chef.rarity) + '</div>',
      '<div class="slot-name">' + escapeHtml(chef.name) + '</div>',
      '<div class="slot-meta">' + (chef.isPartialUlt ? '光环厨' : (chef.isSelfUlt ? '已修炼' : '个人技')) + (chef.equipName ? ' · ' + escapeHtml(chef.equipName) : '') + '</div>',
      '<div class="slot-skill">' + escapeHtml(chef.skillDesc || '') + '</div>',
      chef.ultimateDesc ? '<div class="slot-skill">' + escapeHtml(chef.ultimateDesc) + '</div>' : '',
      '</button>'
    ].join('');
  }

  function renderSlots() {
    var open = currentOpen();
    els.openSlots.innerHTML = (open.slots || [null, null, null]).map(function (id, i) {
      return slotHtml(chefById(id), i, 'open');
    }).join('');

    var gather = currentGatherSlots();
    els.gatherSlots.innerHTML = gather.map(function (id, i) {
      return slotHtml(chefById(id), i, 'gather');
    }).join('');
  }

  function renderPreview() {
    if (!state.chefs.length) {
      els.preview.innerHTML = '<h2>预览</h2><p>先载入、导入 userData，或用游戏校验码同步角色。</p>';
      return;
    }
    if (state.mode === 'chefs') {
      renderChefDetail(chefById(state.selectedChefId) || state.chefs[0]);
      return;
    }
    if (state.mode === 'open') {
      var openChefs = currentOpen().slots.map(chefById);
      var analysis = E.analyzeOpenTeam(openChefs);
      els.preview.innerHTML = [
        '<h2>开业预览</h2>',
        '<div class="stat"><span>上场</span><b>' + openChefs.filter(Boolean).length + ' / 3</b></div>',
        '<div class="stat"><span>开业时间</span><b>' + signed(analysis.total.openTime, '%') + '</b></div>',
        '<div class="stat"><span>金币</span><b>' + signed(analysis.total.gold, '%') + '</b></div>',
        '<div class="stat"><span>稀客</span><b>' + signed(analysis.total.guest, '%') + '</b></div>',
        analysis.total.lines.length ? '<p class="board-sub">' + escapeHtml(analysis.total.lines.join(' · ')) + '</p>' : '',
        '<h2>光环</h2>',
        analysis.auras.length
          ? '<ul class="aura-list">' + analysis.auras.map(function (a) {
            return '<li><b>' + escapeHtml(a.name) + '</b><br>' + escapeHtml(a.desc) + '</li>';
          }).join('') + '</ul>'
          : '<p class="board-sub">这队没有已修炼的场上光环。</p>',
        analysis.nextBuffs.length ? '<p class="board-sub">' + escapeHtml(analysis.nextBuffs.join('；')) + '</p>' : '',
        analysis.selfBuffs.length
          ? '<ul class="aura-list">' + analysis.selfBuffs.map(function (a) {
            return '<li><b>' + escapeHtml(a.name) + '（自身）</b><br>' + escapeHtml(a.desc) + '</li>';
          }).join('') + '</ul>'
          : ''
      ].join('');
      return;
    }

    var area = E.findArea(state.gatherArea);
    var team = currentGatherSlots().map(chefById).filter(Boolean);
    var preview = E.previewGather(area, team, state.data);
    var html = ['<h2>采集预览</h2>', '<div class="stat"><span>地点</span><b>' + escapeHtml(preview.title) + '</b></div>'];
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
      if (id && used[id]) {
        conflicts.push(state.chefMap[id].name + ' 已在' + used[id]);
      }
    });
    if (conflicts.length) {
      html.push('<p class="bad">' + escapeHtml(conflicts.join('；')) + '</p>');
    }
    els.preview.innerHTML = html.join('');
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

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
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

  function renderChefGrid() {
    var list = filteredChefs();
    els.chefCount.textContent = list.length + ' / ' + state.chefs.length;
    els.chefGrid.innerHTML = list.map(function (chef) {
      var selected = Number(state.selectedChefId) === chef.id ? ' selected' : '';
      return [
        '<button class="chef-card' + selected + '" type="button" data-id="' + chef.id + '">',
        '<div class="rarity">' + stars(chef.rarity) + '</div>',
        '<div class="slot-name">' + escapeHtml(chef.name) + '</div>',
        '<div class="slot-meta">' + (chef.isPartialUlt ? '光环厨' : (chef.isSelfUlt ? '已修炼' : '个人技')) + '</div>',
        '<div class="slot-skill">' + escapeHtml(chef.ultimateDesc || chef.skillDesc || '') + '</div>',
        '</button>'
      ].join('');
    }).join('') || '<p>没有符合条件的厨师。</p>';
  }

  function renderChefDetail(chef) {
    if (!chef) {
      els.preview.innerHTML = '<h2>角色</h2><p>点左侧一名厨师查看详情。</p>';
      return;
    }
    var g = chef.gather;
    var f = chef.flavor;
    var c = chef.cook;
    els.preview.innerHTML = [
      '<h2>' + escapeHtml(chef.name) + '</h2>',
      '<div class="stat"><span>星级</span><b>' + stars(chef.rarity) + '</b></div>',
      '<div class="stat"><span>修炼</span><b>' + (chef.isPartialUlt ? '光环' : (chef.isSelfUlt ? '已修炼' : '未修炼')) + '</b></div>',
      chef.origin ? '<p class="board-sub">' + escapeHtml(chef.origin) + '</p>' : '',
      '<h2>技能</h2>',
      '<p>' + escapeHtml(chef.skillDesc || '无') + '</p>',
      chef.ultimateDesc ? '<p>' + escapeHtml(chef.ultimateDesc) + '</p>' : '',
      '<h2>采集</h2>',
      '<div class="stat"><span>肉 / 鱼 / 菜 / 面</span><b>' + [g.meat, g.fish, g.veg, g.creation].join(' / ') + '</b></div>',
      '<div class="stat"><span>素材期望</span><b>' + ['meat', 'fish', 'veg', 'creation'].map(function (k) {
        return E.expectation(chef, k).toFixed(1);
      }).join(' / ') + '</b></div>',
      '<h2>口味</h2>',
      '<div class="stat"><span>甜酸辣咸苦鲜</span><b>' + [f.sweet, f.sour, f.spicy, f.salty, f.bitter, f.tasty].join('/') + '</b></div>',
      '<h2>技法</h2>',
      '<div class="stat"><span>炒煮切炸烤蒸</span><b>' + [c.stirfry, c.boil, c.knife, c.fry, c.bake, c.steam].join('/') + '</b></div>',
      '<h2>装备</h2>',
      '<div class="stat"><span>厨具</span><b>' + escapeHtml(chef.equipName || '未装备') + '</b></div>',
      chef.equipDesc ? '<p class="board-sub">' + escapeHtml(chef.equipDesc) + '</p>' : '',
      '<div class="stat"><span>遗玉</span><b>' + escapeHtml((chef.amberNames || []).join('、') || '无') + '</b></div>',
      '<div class="stat"><span>厨神盘</span><b>' + chef.diskLv + '</b></div>'
    ].join('');
  }

  function renderAll() {
    renderOpenPresets();
    renderGatherAreas();
    renderSlots();
    renderChefGrid();
    renderPreview();
    persist();
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    els.chefsPane.hidden = mode !== 'chefs';
    els.openPane.hidden = mode !== 'open';
    els.gatherPane.hidden = mode !== 'gather';
    var hints = {
      chefs: '这里是游戏里已有的角色。官方导入只带满级满阶，遗玉厨具仍看本地数据。',
      open: '开业上场三名厨师。光环厨会对场上所有人生效，下位光环只打右边那位。',
      gather: '菜园看单采集合计，玉片看双采集档位，调料看口味值。每地四人，人不能复用。'
    };
    els.railHint.textContent = hints[mode] || hints.open;
    renderPreview();
  }

  function openPicker(kind, index) {
    state.pickTarget = { kind: kind, index: index };
    els.pickerTitle.textContent = kind === 'open' ? '开业上场 · 第' + (index + 1) + '位' : state.gatherArea + ' · 第' + (index + 1) + '位';
    els.pickerKeyword.value = '';
    els.pickerFilter.value = kind === 'open' ? 'open' : 'gather';
    els.pickerModal.classList.add('show');
    renderPicker();
  }

  function renderPicker() {
    if (!state.pickTarget) {
      return;
    }
    var keyword = els.pickerKeyword.value.trim();
    var filter = els.pickerFilter.value;
    var usedHere = {};
    var currentIds = state.pickTarget.kind === 'open' ? currentOpen().slots : currentGatherSlots();
    currentIds.forEach(function (id) {
      if (id) {
        usedHere[id] = true;
      }
    });
    var occupied = state.pickTarget.kind === 'gather' ? usedGatherIds(state.gatherArea) : {};
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
      return '<button class="btn picker-item" type="button" data-id="' + chef.id + '"><b>' + escapeHtml(chef.name) + '</b> ' + stars(chef.rarity) + '<small>' + escapeHtml((chef.ultimateDesc || chef.skillDesc || '') + busy + picked) + '</small></button>';
    }).join('') || '<p>没有符合条件的厨师。</p>';
  }

  function assignChef(id) {
    if (!state.pickTarget) {
      return;
    }
    if (state.pickTarget.kind === 'open') {
      currentOpen().slots[state.pickTarget.index] = id;
    } else {
      currentGatherSlots()[state.pickTarget.index] = id;
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

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-mode'));
    });
  });

  els.btnLoadLocal.addEventListener('click', function () {
    loadLocalData();
  });

  els.btnImport.addEventListener('click', function () {
    els.fileInput.click();
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
  els.chefKeyword.addEventListener('input', function () {
    renderChefGrid();
  });
  els.chefFilter.addEventListener('change', function () {
    renderChefGrid();
  });
  els.chefGrid.addEventListener('click', function (event) {
    var card = event.target.closest('[data-id]');
    if (!card) {
      return;
    }
    state.selectedChefId = Number(card.getAttribute('data-id'));
    renderChefGrid();
    renderPreview();
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
    renderPreview();
    persist();
  });

  els.gatherArea.addEventListener('change', function () {
    state.gatherArea = els.gatherArea.value;
    renderSlots();
    renderPreview();
    persist();
  });

  document.getElementById('btnRecommend').addEventListener('click', recommendGather);
  document.getElementById('btnClearGather').addEventListener('click', function () {
    state.gatherTeams[gatherKey(state.gatherArea)] = [null, null, null, null];
    renderAll();
  });

  els.openSlots.addEventListener('click', function (event) {
    var slot = event.target.closest('.slot');
    if (!slot) {
      return;
    }
    openPicker('open', Number(slot.getAttribute('data-index')));
  });

  els.gatherSlots.addEventListener('click', function (event) {
    var slot = event.target.closest('.slot');
    if (!slot) {
      return;
    }
    openPicker('gather', Number(slot.getAttribute('data-index')));
  });

  els.pickerList.addEventListener('click', function (event) {
    var item = event.target.closest('[data-id]');
    if (!item) {
      return;
    }
    assignChef(Number(item.getAttribute('data-id')));
  });

  document.getElementById('btnPickerEmpty').addEventListener('click', function () {
    assignChef(null);
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
  renderOpenPresets();
  renderGatherAreas();
  renderSlots();
  renderPreview();
  loadLocalData();
})();
