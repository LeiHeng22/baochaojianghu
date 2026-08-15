(function () {
  'use strict';

  var E = window.BcjhEngine;
  var STORAGE_KEY = 'bcjh-lineup-v1';
  var USER_KEY = 'bcjh-user-v1';

  function logError(where, err) {
    console.error('[爆炒江湖]', where, err);
  }

  function matchKeyword(blob, keyword) {
    var words = String(keyword || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      return true;
    }
    var text = String(blob || '');
    return words.some(function (word) { return text.indexOf(word) >= 0; });
  }

  function stars(n) {
    return '★★★★★'.slice(0, Number(n) || 0);
  }

  new Vue({
    el: '#main',
    data: function () {
      return {
        loading: true,
        leftBar: false,
        rightBar: false,
        settingVisible: false,
        pickerShow: false,
        tableShow: true,
        tableKey: 1,
        navId: 0,
        calFocus: '',
        dataStatus: '尚未载入数据',
        userDataCode: '',
        cloudId: '',
        cloudIdShow: '',
        decoBuff: 0,
        importAmberAndEquip: true,
        userDataText: '',
        LDataText: '',
        syncingUltimate: false,
        userUltimate: {
          decoBuff: 0,
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
        },
        pickerTitle: '选择',
        pickerKeyword: '',
        pickerKind: '',
        pickerIndex: 0,
        pickerSlot: 0,
        boxHeight: window.innerHeight - 50,
        tableHeight: window.innerHeight - 122,
        nav: [
          { id: 1, name: '菜谱', icon: 'el-icon-food' },
          { id: 2, name: '厨师', icon: 'el-icon-user' },
          { id: 3, name: '厨具', icon: 'el-icon-knife-fork' },
          { id: 12, name: '遗玉', icon: 'el-icon-bangzhu' },
          { id: 4, name: '装修', icon: 'el-icon-refrigerator' },
          { id: 5, name: '探索', icon: 'el-icon-chicken' },
          { id: 10, name: '调料', icon: 'el-icon-ice-tea' },
          { id: 6, name: '任务', icon: 'el-icon-document' },
          { id: 7, name: '计算器', icon: 'el-icon-set-up' },
          { id: 8, name: '个人', icon: 'el-icon-user' },
          { id: 11, name: '宴会跑分', icon: 'el-icon-cpu' },
          { id: 9, name: '说明', icon: 'el-icon-info' }
        ],
        page_list: [
          { id: 5, name: '5条/页' },
          { id: 10, name: '10条/页' },
          { id: 20, name: '20条/页' },
          { id: 50, name: '50条/页' },
          { id: 100, name: '100条/页' },
          { id: 1000, name: '所有' }
        ],
        skill_map: { stirfry: '炒', boil: '煮', knife: '切', fry: '炸', bake: '烤', steam: '蒸' },
        chefCol: { img: true, rarity: false, skills: true, skill: true, gather: true, origin: true, ultimateSkill: true, chefEquip: true, diskDesc: true, got: true },
        chefColName: { img: '图', rarity: '星', skills: '技法', skill: '技能', gather: '采集', origin: '来源', ultimateSkill: '修炼技能', chefEquip: '厨具', diskDesc: '遗玉', got: '已有' },
        chefFilter: { chefKeyword: '', rarity: { 1: true, 2: true, 3: true, 4: true, 5: true }, got: true },
        equipCol: { img: true, rarity: true, skill: true, origin: true },
        equipColName: { img: '图', rarity: '星', skill: '技能', origin: '来源' },
        equipFilter: { equipKeyword: '', rarity: { 1: true, 2: true, 3: true } },
        amberCol: { img: true, rarity: true, color: true, skill: true, amplification: true, origin: true },
        amberColName: { img: '图', rarity: '星', color: '颜色', skill: '技能', amplification: '成长', origin: '来源' },
        amberFilter: {
          amberKeyword: '',
          rarity: { 1: true, 2: true, 3: true },
          origin: { 1: { name: '太初赤玉', flag: true }, 2: { name: '太初碧玉', flag: true }, 3: { name: '太初青玉', flag: true } }
        },
        chefsPageSize: 20,
        equipsPageSize: 20,
        ambersPageSize: 20,
        condimentsPageSize: 20,
        decorationsPageSize: 20,
        questsPageSize: 20,
        chefsCurPage: 1,
        equipsCurPage: 1,
        ambersCurPage: 1,
        condimentsCurPage: 1,
        decorationsCurPage: 1,
        questsCurPage: 1,
        condimentCol: { id: false, img: false, rarity: true, skill: true, origin: true },
        condimentColName: { id: '编号', img: '图', rarity: '星', skill: '技能', origin: '来源' },
        condimentFilter: {
          condimentKeyword: '',
          rarity: { 1: true, 2: true, 3: true },
          skillType: {
            UseStirfry: { name: '炒售价', flag: true },
            UseBoil: { name: '煮售价', flag: true },
            UseKnife: { name: '切售价', flag: true },
            UseFry: { name: '炸售价', flag: true },
            UseBake: { name: '烤售价', flag: true },
            UseSteam: { name: '蒸售价', flag: true },
            UseSweet: { name: '甜售价', flag: true },
            UseSour: { name: '酸售价', flag: true },
            UseSpicy: { name: '辣售价', flag: true },
            UseSalty: { name: '咸售价', flag: true },
            UseBitter: { name: '苦售价', flag: true },
            UseTasty: { name: '鲜售价', flag: true }
          }
        },
        condiment_radio: false,
        condiment_concurrent: false,
        decorationCol: {
          checkbox: true, id: false, img: false, gold: true, tipMin: false, tipMax: false,
          tipTime: false, effMin: false, effMax: false, effAvg: true, position: false,
          suit: true, suitGold: true, origin: true
        },
        decorationColName: {
          checkbox: '选择', id: '编号', img: '图', gold: '收入加成', tipMin: '最小玉璧',
          tipMax: '最大玉璧', tipTime: '冷却时间', effMin: '最小玉璧/天', effMax: '最大玉璧/天',
          effAvg: '平均玉璧/天', position: '位置', suit: '套装', suitGold: '套装加成', origin: '来源'
        },
        decorationFilter: {
          keyword: '',
          timeIds: [],
          position: [
            { name: '1大桌', flag: true }, { name: '1小桌', flag: true }, { name: '1门', flag: true },
            { name: '1灯', flag: true }, { name: '1窗', flag: true }, { name: '2大桌', flag: true },
            { name: '2小桌', flag: true }, { name: '2门', flag: true }, { name: '2窗', flag: true },
            { name: '3灯', flag: true }, { name: '3大桌', flag: true }, { name: '3小桌', flag: true },
            { name: '1装饰', flag: true }, { name: '2装饰', flag: true }, { name: '2屏风', flag: true },
            { name: '3包间', flag: true }
          ]
        },
        decoration_radio: false,
        decoSelect: [],
        decoSelectId: [],
        decoSelectText: '',
        decoSuit: '',
        decoTimeList: [],
        suits: [],
        questsType: '主线任务',
        questsKeyword: '',
        data: null,
        user: null,
        chefs: [],
        chefMap: {},
        ambers: [],
        equips: [],
        condiments: [],
        decorations: [],
        quests: [],
        openPresets: [{ id: 'default', name: '默认开业', slots: [null, null, null] }],
        activeOpenId: 'default',
        gatherTeams: {},
        gatherGroup: 'veg',
        gatherArea: '鸡舍'
      };
    },
    computed: {
      navTitle: function () {
        var item = this.nav.find(function (n) { return n.id === this.navId; }.bind(this));
        return item ? item.name : '首页';
      },
      chefsView: function () {
        var that = this;
        return this.chefs.filter(function (chef) {
          if (that.chefFilter.got && !chef.got) {
            return false;
          }
          if (!that.chefFilter.rarity[chef.rarity]) {
            return false;
          }
          return matchKeyword([chef.name, chef.skill, chef.ultimateSkillShow, chef.origin, chef.equipName, chef.amberText].join(' '), that.chefFilter.chefKeyword);
        });
      },
      chefsPage: function () {
        var start = (this.chefsCurPage - 1) * this.chefsPageSize;
        return this.chefsView.slice(start, start + this.chefsPageSize);
      },
      equipsView: function () {
        var that = this;
        return this.equips.filter(function (item) {
          if (!that.equipFilter.rarity[item.rarity]) {
            return false;
          }
          return matchKeyword([item.name, item.skill, item.origin].join(' '), that.equipFilter.equipKeyword);
        });
      },
      equipsPage: function () {
        var start = (this.equipsCurPage - 1) * this.equipsPageSize;
        return this.equipsView.slice(start, start + this.equipsPageSize);
      },
      ambersView: function () {
        var that = this;
        return this.ambers.filter(function (item) {
          if (!that.amberFilter.rarity[item.rarity]) {
            return false;
          }
          if (that.amberFilter.origin[item.type] && !that.amberFilter.origin[item.type].flag) {
            return false;
          }
          return matchKeyword([item.name, item.skill, item.origin, item.color].join(' '), that.amberFilter.amberKeyword);
        });
      },
      ambersPage: function () {
        var start = (this.ambersCurPage - 1) * this.ambersPageSize;
        return this.ambersView.slice(start, start + this.ambersPageSize);
      },
      condimentsView: function () {
        var that = this;
        var selected = Object.keys(this.condimentFilter.skillType).filter(function (key) {
          return that.condimentFilter.skillType[key].flag;
        });
        return this.condiments.filter(function (item) {
          if (!that.condimentFilter.rarity[item.rarity]) {
            return false;
          }
          if (!matchKeyword([item.name, item.skill, item.origin].join(' '), that.condimentFilter.condimentKeyword)) {
            return false;
          }
          if (!selected.length) {
            return false;
          }
          if (that.condiment_concurrent) {
            return selected.every(function (key) { return item.skill_type[key]; });
          }
          return selected.some(function (key) { return item.skill_type[key]; });
        });
      },
      condimentsPage: function () {
        var start = (this.condimentsCurPage - 1) * this.condimentsPageSize;
        return this.condimentsView.slice(start, start + this.condimentsPageSize);
      },
      decorationsView: function () {
        var that = this;
        var positions = this.decorationFilter.position.filter(function (p) { return p.flag; }).map(function (p) { return p.name; });
        var times = this.decorationFilter.timeIds || [];
        var list = this.decorations.filter(function (item) {
          if (positions.indexOf(item.position) < 0) {
            return false;
          }
          if (times.length && times.indexOf(item.tipTime) < 0) {
            return false;
          }
          return matchKeyword([item.name, item.suit, item.origin].join(' '), that.decorationFilter.keyword);
        }).map(function (item) {
          return Object.assign({}, item, { checked: that.decoSelectId.indexOf(item.id) > -1 });
        });
        return list.sort(function (a, b) {
          var ac = that.decoSelectId.indexOf(a.id) > -1 ? 1 : 0;
          var bc = that.decoSelectId.indexOf(b.id) > -1 ? 1 : 0;
          if (ac !== bc) {
            return bc - ac;
          }
          return (Number(b.effAvg) || 0) - (Number(a.effAvg) || 0);
        });
      },
      decorationsPage: function () {
        var start = (this.decorationsCurPage - 1) * this.decorationsPageSize;
        return this.decorationsView.slice(start, start + this.decorationsPageSize);
      },
      questsTypes: function () {
        var prefer = ['主线任务', '旧支线任务', '新支线任务', '厨师修炼', '修炼任务', '遗玉支线'];
        var seen = {};
        var rest = [];
        this.quests.forEach(function (item) {
          if (!item.type || seen[item.type]) {
            return;
          }
          seen[item.type] = true;
          if (prefer.indexOf(item.type) < 0) {
            rest.push(item.type);
          }
        });
        return prefer.filter(function (t) { return seen[t]; }).concat(rest);
      },
      questsView: function () {
        var that = this;
        return this.quests.filter(function (item) {
          if (item.type !== that.questsType) {
            return false;
          }
          return matchKeyword([item.questId, item.questIdDisp, item.goal, item.rewards_show].join(' '), that.questsKeyword);
        });
      },
      questsPage: function () {
        var start = (this.questsCurPage - 1) * this.questsPageSize;
        return this.questsView.slice(start, start + this.questsPageSize);
      },
      currentOpen: function () {
        var that = this;
        return this.openPresets.find(function (p) { return p.id === that.activeOpenId; }) || this.openPresets[0];
      },
      currentGather: function () {
        if (!this.gatherTeams[this.gatherArea]) {
          this.$set(this.gatherTeams, this.gatherArea, [null, null, null, null]);
        }
        return this.gatherTeams[this.gatherArea];
      },
      gatherAreas: function () {
        return E.ALL_AREAS.filter(function (a) { return a.group === this.gatherGroup; }.bind(this));
      },
      ownedChefs: function () {
        return this.chefs.filter(function (c) { return c.got; });
      },
      pickerList: function () {
        var keyword = this.pickerKeyword;
        if (this.pickerKind === 'equip') {
          return this.equips.filter(function (item) {
            return matchKeyword([item.name, item.skill].join(' '), keyword);
          }).slice(0, 80).map(function (item) {
            return { id: item.id, name: item.name, sub: item.skill };
          });
        }
        if (this.pickerKind === 'amber') {
          var type = this.pickerSlot + 1;
          return this.ambers.filter(function (item) {
            return item.type === type && matchKeyword([item.name, item.skill].join(' '), keyword);
          }).map(function (item) {
            return { id: item.id, name: item.name, sub: item.skill };
          });
        }
        return this.ownedChefs.filter(function (chef) {
          return matchKeyword([chef.name, chef.skill, chef.ultimateSkillShow].join(' '), keyword);
        }).slice(0, 80).map(function (chef) {
          return { id: chef.id, name: chef.name, sub: chef.ultimateSkillShow || chef.skill };
        });
      },
      openPreviewHtml: function () {
        var chefs = this.currentOpen.slots.map(this.chefById);
        if (!chefs.some(Boolean)) {
          return '还没有方案┑(￣Д ￣)┍';
        }
        var analysis = E.analyzeOpenTeam(chefs);
        var deco = E.toInt(this.userUltimate && this.userUltimate.decoBuff, 0);
        return '开业时间 ' + analysis.total.openTime + '%　金币 ' + (analysis.total.gold + deco) + '%　稀客 ' + analysis.total.guest + '%　装饰 ' + deco + '%';
      },
      ultimateOptions: function () {
        return this.data ? E.listUltimateOptions(this.data) : { partial: [], self: [] };
      },
      partialSkillList: function () {
        return this.ultimateOptions.partial;
      },
      selfSkillList: function () {
        return this.ultimateOptions.self;
      },
      gatherPreviewHtml: function () {
        var area = E.findArea(this.gatherArea);
        var team = this.currentGather.map(this.chefById).filter(Boolean);
        if (!area || !this.data) {
          return '';
        }
        var preview = E.previewGather(area, team, this.data);
        if (preview.kind === 'veg') {
          return preview.title + '　' + preview.label + '点 ' + preview.points + '/' + preview.need + '　素材期望 ' + preview.gain + '%';
        }
        if (preview.kind === 'jade') {
          return preview.title + '　' + preview.label + ' ' + preview.points + '　档位 ' + preview.tier + '/240';
        }
        return preview.title + '　' + preview.label + ' ' + preview.points + '/' + preview.need;
      }
    },
    watch: {
      chefCol: { deep: true, handler: function () { this.tableKey += 1; this.persist(); } },
      equipCol: { deep: true, handler: function () { this.tableKey += 1; } },
      amberCol: { deep: true, handler: function () { this.tableKey += 1; } },
      condimentCol: { deep: true, handler: function () { this.tableKey += 1; } },
      decorationCol: { deep: true, handler: function () { this.tableKey += 1; } },
      chefFilter: { deep: true, handler: function () { this.chefsCurPage = 1; } },
      condimentFilter: { deep: true, handler: function () { this.condimentsCurPage = 1; } },
      decorationFilter: { deep: true, handler: function () { this.decorationsCurPage = 1; } },
      questsKeyword: function () { this.questsCurPage = 1; },
      questsType: function () { this.questsCurPage = 1; },
      gatherGroup: function () {
        var list = this.gatherAreas;
        if (list.length && !list.some(function (a) { return a.name === this.gatherArea; }.bind(this))) {
          this.gatherArea = list[0].name;
        }
        this.persist();
      },
      gatherArea: function () { this.persist(); },
      activeOpenId: function () { this.persist(); }
    },
    methods: {
      checkNav: function (id) {
        this.navId = id;
        this.leftBar = false;
        this.persist();
      },
      selectAllCol: function (key) {
        var col = this[key];
        var names = this[key + 'Name'];
        var allOn = Object.keys(names).every(function (k) { return col[k]; });
        Object.keys(names).forEach(function (k) { col[k] = !allOn; });
      },
      selectAllFlags: function (target) {
        if (target === 'condimentFilter.skillType') {
          this.condiment_radio = false;
          this.condiment_concurrent = false;
          var skill = this.condimentFilter.skillType;
          var anyOff = Object.keys(skill).some(function (k) { return !skill[k].flag; });
          Object.keys(skill).forEach(function (k) { skill[k].flag = anyOff; });
        } else if (target === 'decorationFilter.position') {
          this.decoration_radio = false;
          var pos = this.decorationFilter.position;
          var anyOff = pos.some(function (p) { return !p.flag; });
          pos.forEach(function (p) { p.flag = anyOff; });
        }
      },
      checkCondiSkillType: function (key) {
        var skill = this.condimentFilter.skillType;
        if (this.condiment_radio) {
          Object.keys(skill).forEach(function (k) {
            skill[k].flag = k === key ? !skill[k].flag : false;
          });
        } else {
          skill[key].flag = !skill[key].flag;
        }
      },
      changeCondimentRadio: function (val) {
        if (!val) {
          return;
        }
        this.condiment_concurrent = false;
        var skill = this.condimentFilter.skillType;
        var on = Object.keys(skill).filter(function (k) { return skill[k].flag; });
        if (on.length > 1) {
          Object.keys(skill).forEach(function (k) { skill[k].flag = false; });
        }
      },
      changeCondimentConcurrent: function (val) {
        if (!val) {
          return;
        }
        this.condiment_radio = false;
        var skill = this.condimentFilter.skillType;
        var on = Object.keys(skill).filter(function (k) { return skill[k].flag; });
        if (on.length > 2) {
          Object.keys(skill).forEach(function (k) { skill[k].flag = false; });
        }
      },
      changeDecorationRadio: function (val) {
        if (!val) {
          return;
        }
        var pos = this.decorationFilter.position;
        var on = pos.filter(function (p) { return p.flag; });
        if (on.length > 1) {
          pos.forEach(function (p) { p.flag = false; });
        }
      },
      checkPosition: function (i) {
        var pos = this.decorationFilter.position;
        if (this.decoration_radio) {
          pos.forEach(function (p, j) {
            p.flag = j === i ? !p.flag : false;
          });
        } else {
          pos[i].flag = !pos[i].flag;
        }
      },
      updateDecoSummary: function () {
        var that = this;
        var avg = 0;
        var gold = 0;
        this.decoSelect.forEach(function (r) {
          gold += Number(r.gold) || 0;
          avg += Number(r.effAvg) || 0;
        });
        avg = Math.round(avg * 10) / 10;
        var suitNames = [];
        this.decoSelect.forEach(function (r) {
          if (r.suit && suitNames.indexOf(r.suit) < 0) {
            suitNames.push(r.suit);
          }
        });
        suitNames.forEach(function (s) {
          var suitGold = 0;
          var missing = that.decorations.filter(function (item) {
            if (!suitGold && item.suit === s) {
              suitGold = item.suitGold;
            }
            return item.suit === s && that.decoSelectId.indexOf(item.id) < 0;
          });
          if (!missing.length) {
            gold += suitGold;
          }
        });
        this.decoSelectText = '平均玉璧/天: ' + avg + ' 收入加成: ' + (Math.round(gold * 1000) / 10) + '%';
      },
      handleDecoSelect: function (val, row) {
        if (val) {
          this.decoSelect = this.decoSelect.filter(function (r) { return r.position !== row.position; });
          this.decoSelect.push(row);
        } else {
          this.decoSelect = this.decoSelect.filter(function (r) { return r.id !== row.id; });
        }
        this.decoSelectId = this.decoSelect.map(function (r) { return r.id; });
        this.updateDecoSummary();
      },
      checkDecoRow: function (row) {
        if (!row) {
          return;
        }
        this.handleDecoSelect(!row.checked, row);
      },
      emptyDeco: function () {
        this.decoSelect = [];
        this.decoSelectId = [];
        this.decoSuit = '';
        this.decoSelectText = '';
      },
      selectSuit: function (val) {
        var that = this;
        this.decoSelect = this.decorations.filter(function (r) { return r.suit === val; });
        this.decoSelectId = this.decoSelect.map(function (r) { return r.id; });
        this.updateDecoSummary();
      },
      chefById: function (id) {
        return id ? this.chefMap[Number(id)] || null : null;
      },
      toast: function (text) {
        if (this.$message) {
          this.$message({ message: text, duration: 1800 });
        }
      },
      persist: function () {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            openPresets: this.openPresets,
            activeOpenId: this.activeOpenId,
            gatherTeams: this.gatherTeams,
            gatherGroup: this.gatherGroup,
            gatherArea: this.gatherArea,
            navId: this.navId,
            chefCol: this.chefCol
          }));
        } catch (err) {
          logError('persist', err);
        }
      },
      persistUser: function () {
        if (!this.user) {
          return;
        }
        try {
          window.localStorage.setItem(USER_KEY, JSON.stringify(this.user));
        } catch (err) {
          logError('persistUser', err);
        }
      },
      restore: function () {
        try {
          var raw = window.localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            return;
          }
          var saved = JSON.parse(raw);
          if (saved.openPresets) {
            this.openPresets = saved.openPresets;
            this.activeOpenId = saved.activeOpenId || saved.openPresets[0].id;
          }
          this.gatherTeams = saved.gatherTeams || {};
          this.gatherGroup = saved.gatherGroup || 'veg';
          this.gatherArea = saved.gatherArea || '鸡舍';
          if (typeof saved.navId === 'number') {
            this.navId = saved.navId;
          }
          if (saved.chefCol) {
            this.chefCol = Object.assign(this.chefCol, saved.chefCol);
          }
        } catch (err) {
          logError('restore', err);
        }
      },
      refreshDerived: function () {
        if (!this.data || !this.user) {
          return;
        }
        var chefs = E.buildAllChefs(this.data, this.user);
        this.chefs = chefs.map(function (c) {
          return Object.assign({}, c, {
            rarity_show: stars(c.rarity),
            Stirfry_show: c.cook.stirfry || '',
            Boil_show: c.cook.boil || '',
            Knife_show: c.cook.knife || '',
            Fry_show: c.cook.fry || '',
            Bake_show: c.cook.bake || '',
            Steam_show: c.cook.steam || '',
            skill: c.skillDesc,
            meat: c.gather.meat,
            fish: c.gather.fish,
            veg: c.gather.veg,
            creation: c.gather.creation,
            ultimateSkillShow: c.ultimateDesc,
            amberText: (c.amberNames || []).join('、'),
            checked: c.got
          });
        });
        var map = {};
        this.chefs.forEach(function (c) { map[c.id] = c; });
        this.chefMap = map;
        this.ambers = E.buildAmberCatalog(this.data, this.user).map(function (a) {
          return Object.assign({}, a, { rarity_show: stars(a.rarity), wornText: (a.wornBy || []).join('、') });
        });
        this.equips = E.buildEquipCatalog(this.data, this.user).map(function (e) {
          return Object.assign({}, e, { rarity_show: stars(e.rarity), wornText: (e.wornBy || []).join('、') });
        });
        this.condiments = E.buildCondimentCatalog(this.data);
        var deco = E.buildDecorationCatalog(this.data);
        this.decorations = deco.list;
        this.suits = deco.suits;
        this.decoTimeList = deco.decoTimes;
        this.quests = E.buildQuestCatalog(this.data);
        var owned = this.chefs.filter(function (c) { return c.got; }).length;
        var recipes = Object.keys(this.user.repGot || {}).filter(function (k) { return this.user.repGot[k]; }.bind(this)).length;
        this.dataStatus = '已有厨师 ' + owned + ' / ' + this.chefs.length + ' · 菜谱 ' + recipes;
        if (!this.syncingUltimate) {
          this.userUltimate = this.normalizeUltimate(this.user.userUltimate);
        }
        this.decoBuff = E.toInt(this.userUltimate.decoBuff, 0);
      },
      setUser: function (user) {
        this.user = user;
        this.persistUser();
        this.refreshDerived();
      },
      saveUserToDisk: function (user) {
        this.persistUser();
        return fetch('/api/save-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(user)
        }).then(function (res) { return res.ok; }).catch(function (err) {
          logError('saveUserToDisk', err);
          return false;
        });
      },
      loadJson: function (url) {
        return fetch(url).then(function (res) {
          if (!res.ok) {
            throw new Error(url + ' HTTP ' + res.status);
          }
          return res.json();
        });
      },
      loadLocal: function () {
        var that = this;
        return Promise.all([this.loadJson('../data/data.min.json'), this.loadJson('../data/userData.json')]).then(function (pair) {
          that.data = pair[0];
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
            logError('cached user', err);
          }
          that.setUser(user);
          that.loading = false;
          that.toast('已载入图鉴和个人数据');
        }).catch(function (err) {
          logError('loadLocal', err);
          that.loading = false;
          that.toast('载入失败，请到个人页导入');
        });
      },
      changeGot: function (val, chefId) {
        if (!this.user) {
          return;
        }
        this.user.chefGot = this.user.chefGot || {};
        this.user.chefGot[chefId] = !!val;
        this.setUser(this.user);
        this.saveUserToDisk(this.user);
      },
      syncUserData: function () {
        var that = this;
        var token = (this.userDataCode || '').trim();
        if (!token) {
          this.toast('先填写游戏里的校验码');
          return;
        }
        if (!this.data) {
          this.toast('图鉴还没载入');
          return;
        }
        fetch('https://yx518.com/api/archive.do?token=' + encodeURIComponent(token)).then(function (res) {
          if (!res.ok) {
            throw new Error('官方接口 HTTP ' + res.status);
          }
          return res.text();
        }).then(function (text) {
          var rst = JSON.parse(text);
          if (rst.ret !== 'S') {
            throw new Error(rst.msg || '导入失败');
          }
          var result = E.applyOfficialArchive(that.user || {}, rst.msg, that.data);
          that.setUser(result.user);
          that.checkNav(2);
          that.saveUserToDisk(result.user);
          that.toast('导入成功');
          that.userDataCode = '';
        }).catch(function (err) {
          logError('syncUserData', err);
          that.toast('导入失败：' + (err.message || err));
        });
      },
      downloadCloud: function () {
        var that = this;
        if (!/^\d{1,10}$/.test(this.cloudId || '')) {
          this.toast('云端ID须为10位以内数字');
          return;
        }
        fetch('/api/cloud?id=' + encodeURIComponent(this.cloudId)).then(function (res) {
          return res.json().then(function (rst) {
            if (!res.ok || !rst.ok) {
              throw new Error((rst && rst.msg) || ('HTTP ' + res.status));
            }
            return rst;
          });
        }).then(function (rst) {
          var next = that.applyImportedUser(rst.user);
          that.$confirm('是否确定导入【' + (rst.name || '云端') + '】的个人数据？ 如果是导入他人数据，记得 先保存好自己的个人数据 ！', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'info'
          }).then(function () {
            that.setUser(next);
            that.checkNav(2);
            that.saveUserToDisk(next);
            that.toast('已导入【' + (rst.name || '云端') + '】');
          }).catch(function () {});
        }).catch(function (err) {
          logError('downloadCloud', err);
          that.toast('云端导入失败：' + (err.message || err));
        });
      },
      updateCatalog: function () {
        var that = this;
        fetch('https://h5.baochaojianghu.com/data/data.min.json').then(function (res) {
          if (!res.ok) {
            throw new Error('图鉴 HTTP ' + res.status);
          }
          return res.json();
        }).then(function (data) {
          that.data = data;
          if (that.user) {
            that.refreshDerived();
          }
          that.toast('图鉴已更新');
        }).catch(function (err) {
          logError('updateCatalog', err);
          that.toast('更新图鉴失败：' + (err.message || err));
        });
      },
      importFile: function (event) {
        this.importUserData(event);
      },
      ultKey: function (key) {
        return String(key || '').charAt(0).toUpperCase() + String(key || '').slice(1);
      },
      normalizeUltimate: function (src) {
        var next = E.emptyUserUltimate(0);
        src = src || {};
        Object.keys(next).forEach(function (key) {
          if (key === 'Partial' || key === 'Self') {
            var block = src[key] || {};
            next[key] = {
              id: Array.isArray(block.id) ? block.id.slice() : [],
              row: Array.isArray(block.row) ? block.row.slice() : []
            };
          } else if (src[key] !== undefined && src[key] !== '') {
            next[key] = E.toInt(src[key], 0);
          }
        });
        return next;
      },
      applyImportedUser: function (raw) {
        if (!raw || typeof raw !== 'object') {
          throw new Error('不是个人数据');
        }
        if (!raw.chefGot && !raw.repGot && !raw.userUltimate) {
          throw new Error('不是白菜菊花 userData');
        }
        var current = this.user || {};
        return {
          chefGot: raw.chefGot || {},
          chefUlt: raw.chefUlt || current.chefUlt || {},
          repGot: raw.repGot || {},
          chefAmber: raw.chefAmber || current.chefAmber || {},
          chefEquip: raw.chefEquip || current.chefEquip || {},
          chefDiskLv: raw.chefDiskLv || current.chefDiskLv || {},
          userUltimate: this.normalizeUltimate(raw.userUltimate || {})
        };
      },
      saveUltimate: function () {
        if (!this.user) {
          return;
        }
        this.user.userUltimate = this.normalizeUltimate(this.userUltimate);
        this.decoBuff = E.toInt(this.user.userUltimate.decoBuff, 0);
        this.syncingUltimate = true;
        this.setUser(this.user);
        this.saveUserToDisk(this.user);
        this.syncingUltimate = false;
      },
      onSkillSelect: function (kind) {
        var list = kind === 'Partial' ? this.partialSkillList : this.selfSkillList;
        var map = {};
        list.forEach(function (item) {
          map[item.id] = item;
        });
        var ids = (this.userUltimate[kind] && this.userUltimate[kind].id) || [];
        this.userUltimate[kind].row = ids.map(function (id) {
          return map[id];
        }).filter(Boolean);
        this.saveUltimate();
      },
      scrollUser: function (val) {
        var box = document.querySelector('.ultimate-box');
        if (box) {
          box.scrollTop = val;
        }
      },
      getCloudId: function () {
        try {
          var raw = window.localStorage.getItem('bcjh-cloud-id-v1');
          if (!raw) {
            this.cloudIdShow = '';
            return;
          }
          var cloud = JSON.parse(raw);
          var age = Date.now() - new Date(cloud.time).getTime();
          this.cloudIdShow = age < 86400000 ? ('本机上次上传个人数据ID：' + cloud.id) : '';
          if (cloud.id) {
            this.cloudId = String(cloud.id);
          }
        } catch (err) {
          logError('getCloudId', err);
          this.cloudIdShow = '';
        }
      },
      confirmDanger: function (text) {
        return this.$confirm(text, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
      },
      setAllUltimate: function () {
        var that = this;
        if (!this.data || !this.user) {
          this.toast('先载入图鉴和个人数据');
          return;
        }
        this.confirmDanger('是否确定导入全修炼数据？此操作会覆盖原有修炼数据且不能恢复').then(function () {
          var chefUlt = {};
          (that.data.chefs || []).forEach(function (item) {
            chefUlt[item.chefId] = true;
          });
          that.user.chefUlt = chefUlt;
          that.user.userUltimate = E.buildUltimateFromChefUlt(that.data, chefUlt, that.userUltimate.decoBuff);
          that.setUser(that.user);
          that.saveUserToDisk(that.user);
          that.toast('已设为全修炼');
        }).catch(function () {});
      },
      setAllExistUltimate: function () {
        var that = this;
        if (!this.data || !this.user) {
          this.toast('先载入图鉴和个人数据');
          return;
        }
        this.confirmDanger('是否确定将已有厨师全部设为已修炼？此操作会覆盖原有修炼数据且不能恢复').then(function () {
          that.user.chefUlt = Object.assign({}, that.user.chefGot || {});
          that.user.userUltimate = E.buildUltimateFromChefUlt(that.data, that.user.chefUlt, that.userUltimate.decoBuff);
          that.setUser(that.user);
          that.saveUserToDisk(that.user);
          that.toast('已有厨师已全部设为修炼');
        }).catch(function () {});
      },
      emptyUserUltimate: function () {
        var that = this;
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.confirmDanger('是否确定清空个人修炼数据？此操作会清空原有修炼/装饰加成数据且不能恢复（不影响已有厨师菜谱数据）').then(function () {
          that.user.chefUlt = {};
          that.user.userUltimate = E.emptyUserUltimate(0);
          that.setUser(that.user);
          that.saveUserToDisk(that.user);
          that.toast('个人修炼数据已清空');
        }).catch(function () {});
      },
      emptyAmberData: function () {
        var that = this;
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.confirmDanger('是否确定清空遗玉数据？此操作不能恢复').then(function () {
          that.user.chefAmber = {};
          that.setUser(that.user);
          that.saveUserToDisk(that.user);
          that.toast('遗玉数据已清空');
        }).catch(function () {});
      },
      emptyEquipData: function () {
        var that = this;
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.confirmDanger('是否确定清空厨具数据？此操作不能恢复').then(function () {
          that.user.chefEquip = {};
          that.setUser(that.user);
          that.saveUserToDisk(that.user);
          that.toast('厨具数据已清空');
        }).catch(function () {});
      },
      uploadData: function () {
        var that = this;
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.$prompt('数据暂存时限为24小时，单用户24小时上传上限为10次，所有用户24小时上传上限为5000次。 请勿无节制上传！ 请在下面填入昵称（随便填，只是核对用，防止误导入别人的数据）：', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPattern: /^.{1,10}$/,
          inputErrorMessage: '昵称字数在1~10个之间'
        }).then(function (rst) {
          var name = String(rst.value || '').trim();
          that.saveUltimate();
          return fetch('/api/cloud-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ user: name, data: JSON.stringify(that.user) })
          }).then(function (res) {
            return res.json().then(function (body) {
              if (!res.ok || !body.ok) {
                throw new Error((body && body.msg) || ('HTTP ' + res.status));
              }
              return body;
            });
          });
        }).then(function (body) {
          if (!body) {
            return;
          }
          try {
            window.localStorage.setItem('bcjh-cloud-id-v1', JSON.stringify({ id: body.id, time: new Date() }));
          } catch (err) {
            logError('save cloudId', err);
          }
          that.getCloudId();
          that.$notify({
            title: '上传成功',
            message: '数据ID：' + body.id + ' 获取云端数据时数据ID是唯一的识别码，请务必保管好您的数据ID！',
            duration: 0
          });
        }).catch(function (err) {
          if (!err || err === 'cancel') {
            return;
          }
          logError('uploadData', err);
          that.toast('上传失败：' + (err.message || err) + '。GitHub Pages 请用下方备份');
        });
      },
      downloadData: function () {
        var that = this;
        this.$prompt('请填写数据ID（需要先上传个人数据才能通过ID获取暂存的数据）：', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPattern: /^\d{1,10}$/,
          inputErrorMessage: '数据ID为10位以下的纯数字',
          inputValue: this.cloudId
        }).then(function (rst) {
          that.cloudId = String(rst.value || '').trim();
          that.downloadCloud();
        }).catch(function () {});
      },
      exportUserDataText: function () {
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.saveUltimate();
        this.userDataText = JSON.stringify(this.user);
        this.toast('已生成，可复制文本框内容');
      },
      importUserDataText: function () {
        try {
          var raw = JSON.parse(this.userDataText || '');
          var user = this.applyImportedUser(raw);
          this.setUser(user);
          this.saveUserToDisk(user);
          this.userDataText = '';
          this.toast('导入成功');
        } catch (err) {
          logError('importUserDataText', err);
          this.toast('导入失败：数据解析失败');
        }
      },
      exportUserData: function () {
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.saveUltimate();
        try {
          var text = JSON.stringify(this.user);
          var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'userData.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () {
            URL.revokeObjectURL(a.href);
          }, 1000);
        } catch (err) {
          logError('exportUserData', err);
          this.toast('下载失败，请改用手动复制');
        }
      },
      openFile: function () {
        var input = document.getElementById('file');
        if (input) {
          input.click();
        }
      },
      openLFile: function () {
        var input = document.getElementById('Lfile');
        if (input) {
          input.click();
        }
      },
      importUserData: function (event) {
        var that = this;
        var file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var raw = JSON.parse(String(reader.result || ''));
            var user = that.applyImportedUser(raw);
            that.setUser(user);
            that.saveUserToDisk(user);
            that.toast('导入成功');
          } catch (err) {
            logError('importUserData', err);
            that.toast('导入失败');
          }
        };
        reader.onerror = function () {
          logError('FileReader', reader.error);
          that.toast('读取文件失败');
        };
        reader.readAsText(file, 'utf-8');
        event.target.value = '';
      },
      importLPayload: function (data) {
        if (!this.data) {
          throw new Error('图鉴还没载入');
        }
        if (!data || !data.chefs) {
          throw new Error('不是L版图鉴数据');
        }
        var keep = this.user || {};
        var blank = {
          chefGot: {},
          chefUlt: {},
          repGot: {},
          chefAmber: keep.chefAmber || {},
          chefEquip: keep.chefEquip || {},
          chefDiskLv: keep.chefDiskLv || {},
          userUltimate: {}
        };
        var result = E.applyOfficialArchive(blank, {
          recipes: data.recipes,
          chefs: data.chefs,
          decorationEffect: data.decorationEffect
        }, this.data);
        this.setUser(result.user);
        this.saveUserToDisk(result.user);
      },
      importLDataText: function () {
        try {
          var data = JSON.parse(this.LDataText || '');
          this.importLPayload(data);
          this.LDataText = '';
          this.toast('导入成功');
        } catch (err) {
          logError('importLDataText', err);
          this.toast('导入失败：数据解析失败');
        }
      },
      importLData: function (event) {
        var that = this;
        var file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(String(reader.result || ''));
            that.importLPayload(data);
            that.toast('导入成功');
          } catch (err) {
            logError('importLData', err);
            that.toast('导入失败');
          }
        };
        reader.onerror = function () {
          logError('FileReader', reader.error);
          that.toast('读取文件失败');
        };
        reader.readAsText(file, 'utf-8');
        event.target.value = '';
      },
      saveDeco: function () {
        this.saveUltimate();
        this.toast('装饰加成已保存');
      },
      openPicker: function (kind, index, slot) {
        this.pickerKind = kind;
        this.pickerIndex = index;
        this.pickerSlot = slot || 0;
        this.pickerKeyword = '';
        this.calFocus = kind === 'equip' ? ('Equip_' + index) : (kind === 'amber' ? ('Amber_' + index) : ('Chef_' + index));
        this.pickerTitle = kind === 'equip' ? '选择厨具' : (kind === 'amber' ? '选择遗玉' : '选择厨师');
        this.pickerShow = true;
      },
      assignPicked: function (id) {
        if (this.pickerKind === 'equip' || this.pickerKind === 'amber') {
          var chef = this.chefById(this.pickerKind === 'equip' || this.pickerKind === 'amber'
            ? (this.navId === 5 ? this.currentGather[this.pickerIndex] : this.currentOpen.slots[this.pickerIndex])
            : id);
          if (!chef || !this.user) {
            this.toast('先选择上场厨师');
            this.pickerShow = false;
            return;
          }
          if (this.pickerKind === 'equip') {
            E.setChefEquip(this.user, chef.id, id);
          } else {
            E.setChefAmber(this.user, chef.id, this.pickerSlot, id);
          }
          this.setUser(this.user);
          this.saveUserToDisk(this.user);
        } else if (this.pickerKind === 'open') {
          this.$set(this.currentOpen.slots, this.pickerIndex, id);
        } else {
          this.$set(this.currentGather, this.pickerIndex, id);
        }
        this.pickerShow = false;
        this.persist();
      },
      newOpen: function () {
        var name = window.prompt('方案名称', '开业方案 ' + (this.openPresets.length + 1));
        if (!name) {
          return;
        }
        var id = 'open-' + Date.now();
        this.openPresets.push({ id: id, name: name, slots: [null, null, null] });
        this.activeOpenId = id;
        this.persist();
      },
      saveOpen: function () {
        this.persist();
        this.toast('开业方案已保存到本机');
      },
      clearOpen: function () {
        this.$set(this.currentOpen, 'slots', [null, null, null]);
        this.persist();
      },
      onGatherGroup: function () {},
      recommendGather: function () {
        var area = E.findArea(this.gatherArea);
        var used = {};
        Object.keys(this.gatherTeams).forEach(function (name) {
          if (name === this.gatherArea) {
            return;
          }
          (this.gatherTeams[name] || []).forEach(function (id) {
            if (id) {
              used[id] = true;
            }
          });
        }.bind(this));
        var pool = this.ownedChefs.filter(function (c) { return !used[c.id]; });
        var team = E.pickTeam(area, pool);
        this.$set(this.gatherTeams, this.gatherArea, [0, 1, 2, 3].map(function (i) {
          return team[i] ? team[i].id : null;
        }));
        this.persist();
        this.toast('已按当前地点推荐四人');
      },
      clearGather: function () {
        this.$set(this.gatherTeams, this.gatherArea, [null, null, null, null]);
        this.persist();
      }
    },
    mounted: function () {
      var that = this;
      this.restore();
      this.getCloudId();
      window.addEventListener('resize', function () {
        that.boxHeight = window.innerHeight - 50;
        that.tableHeight = window.innerHeight - 122;
      });
      this.loadLocal();
    }
  });
})();
