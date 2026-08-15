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
        decoBuff: 0,
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
        chefsCurPage: 1,
        equipsCurPage: 1,
        ambersCurPage: 1,
        data: null,
        user: null,
        chefs: [],
        chefMap: {},
        ambers: [],
        equips: [],
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
        var deco = E.toInt(this.decoBuff, 0);
        return '开业时间 ' + analysis.total.openTime + '%　金币 ' + (analysis.total.gold + deco) + '%　稀客 ' + analysis.total.guest + '%　装饰 ' + deco + '%';
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
      chefFilter: { deep: true, handler: function () { this.chefsCurPage = 1; } },
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
        var owned = this.chefs.filter(function (c) { return c.got; }).length;
        var recipes = Object.keys(this.user.repGot || {}).filter(function (k) { return this.user.repGot[k]; }.bind(this)).length;
        this.dataStatus = '已有厨师 ' + owned + ' / ' + this.chefs.length + ' · 菜谱 ' + recipes;
        this.decoBuff = E.toInt(this.user.userUltimate && this.user.userUltimate.decoBuff, 0);
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
          that.setUser(rst.user);
          that.checkNav(2);
          that.saveUserToDisk(rst.user);
          that.toast('已导入【' + (rst.name || '云端') + '】');
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
        var that = this;
        var file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var user = JSON.parse(String(reader.result || ''));
            if (!user.chefGot) {
              throw new Error('不是白菜菊花 userData');
            }
            that.setUser(user);
            that.saveUserToDisk(user);
            that.toast('导入成功');
          } catch (err) {
            logError('importFile', err);
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
        if (!this.user) {
          this.toast('先导入个人数据');
          return;
        }
        this.user.userUltimate = this.user.userUltimate || {};
        this.user.userUltimate.decoBuff = E.toInt(this.decoBuff, 0);
        this.setUser(this.user);
        this.saveUserToDisk(this.user);
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
      window.addEventListener('resize', function () {
        that.boxHeight = window.innerHeight - 50;
        that.tableHeight = window.innerHeight - 122;
      });
      this.loadLocal();
    }
  });
})();
