'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../codex_isometric_rpg.js'), 'utf8');
function setup(options = {}, width = 960, height = 700) {
  const listeners = new Map(), globalListeners = new Map(), frames = new Map(); let id = 0;
  const texts = [], gradients = [];
  const ctx = new Proxy({
    font: '12px system-ui',
    measureText(text) { return { width: [...String(text)].length * parseFloat(this.font.slice(4)) * 0.7 }; },
    fillText(text, x, y) { assert(Number.isFinite(x) && Number.isFinite(y)); assert(parseFloat(this.font.slice(4)) >= 12); texts.push(String(text)); },
    createRadialGradient(...args) { return this.createLinearGradient(...args); },
    createLinearGradient(...args) { args.forEach(v => assert(Number.isFinite(v))); const stops = []; gradients.push(stops); return { addColorStop: (...s) => stops.push(s) }; }
  }, { get(target, prop) { return prop in target ? target[prop] : (...args) => { args.filter(a => typeof a === 'number').forEach(n => assert(Number.isFinite(n), `${prop}: non-finite`)); }; } });
  const canvas = { width, height, style: { cursor: 'crosshair' }, getContext: () => ctx,
    getBoundingClientRect: () => ({ width, height, left: 20, top: 30 }),
    addEventListener: (name, f) => listeners.set(name, f), removeEventListener: name => listeners.delete(name) };
  let disconnected = false;
  const window = { devicePixelRatio: 2, requestAnimationFrame(f) { frames.set(++id, f); return id; }, cancelAnimationFrame(i) { frames.delete(i); },
    addEventListener: (name, f) => globalListeners.set(name, f), removeEventListener: name => globalListeners.delete(name),
    ResizeObserver: class { observe() {} disconnect() { disconnected = true; } } };
  vm.runInNewContext(source, { window });
  const world = new window.CodexIsometricRpgEngine(canvas, { autoStart: false, scene: 'board', ...options });
  return { world, canvas, listeners, globalListeners, frames, texts, gradients, disconnected: () => disconnected };
}
function advance(world, seconds) { world.update(seconds); world.render(); }
test('互換API、入力検証、5年代の境界とテーマ切替', () => {
  const { world: w, gradients } = setup();
  for (const method of ['setState', 'update', 'render', 'start', 'stop', 'destroy', 'triggerBurst', 'rollDice', 'startBattle', 'executeBattleCommand', 'spinRoulette', 'setGameScene']) assert.equal(typeof w[method], 'function');
  const themes = new Set();
  for (const [year, era] of [[2026, 0], [2034, 0], [2035, 1], [2044, 1], [2045, 2], [2054, 2], [2055, 3], [2064, 3], [2065, 4], [2076, 4]]) {
    w.setState({ year }); const start = gradients.length; w.render(); assert.equal(w.era, era); themes.add(JSON.stringify(gradients[start]));
  }
  assert.equal(themes.size, 5);
  const before = JSON.stringify(w.state);
  assert.throws(() => w.setState({ year: 2030, choiceMode: 'bad' })); assert.equal(JSON.stringify(w.state), before);
  for (const year of [NaN, Infinity, '2030']) assert.throws(() => w.setState({ year }));
  assert.throws(() => w.setState({ season: 'bad' })); assert.throws(() => w.setState({ timeOfDay: NaN }));
  w.setState({ year: 5000, timeOfDay: -0.25 }); assert.equal(w.year, 2076); assert.equal(w.state.timeOfDay, 0.75);
  w.setState({ year: 1900 }); assert.equal(w.year, 2026);
});
test('サイコロは1〜6、途中連打を拒否し、ホップ完了時に一度だけ報酬', () => {
  const { world: w } = setup(); const face = w.rollDice();
  assert(face >= 1 && face <= 6); assert.equal(w.rollDice(), false);
  advance(w, 1); assert.equal(w.position, 0);
  advance(w, 0.45); assert(w.position > 0 && w.position < face);
  advance(w, 8); assert.equal(w.position, face); assert(w.claimed.has(face));
  const stats = JSON.stringify(w.stats); w.land(); assert.equal(JSON.stringify(w.stats), stats);
  w.setState({ year: 2026 }); advance(w, 5); assert.equal(w.position, 0); // 明示リセットは内部進行より優先
});
test('51マス、全イベント、前後移動、2076終点と複数ページ', () => {
  const types = new Set();
  for (let i = 0; i < 51; i++) {
    const { world: w } = setup(); types.add(w.tileType(i));
    w.setState({ year: 2026 + i }); advance(w, 16);
    assert.equal(w.position, i); assert.equal(w.year, 2026 + i);
    if (i) { assert(w.claimed.has(i)); assert.equal(w.scene, w.tileType(i) === 1 ? 'battle' : w.tileType(i) === 2 ? 'roulette' : 'board'); }
    if (i === 50) assert.equal(w.rollDice(), false);
  }
  assert.equal(types.size, 5);
});
test('choiceMode変更で自動攻撃、同じ値の再送は戦闘を再開しない', () => {
  const { world: w } = setup(); w.setState({ choiceMode: 'standard' }); assert.equal(w.scene, 'battle');
  const b = w.battle; assert.equal(b.attack.kind, 'combo'); w.setState({ choiceMode: 'standard' }); assert.equal(w.battle, b);
  advance(w, 2); assert.equal(b.hp, 5799); assert.equal(w.stats.hp, 78);
  assert(w.executeBattleCommand('barrier')); advance(w, 2); assert.equal(b.hp, 3999); assert.equal(w.stats.hp, 96);
  w.setState({ choiceMode: 'antifragile' }); advance(w, 0.7); assert.equal(b.hp, 0);
  assert.equal(w.effects.filter(p => p.type === 'coin').length, 40); assert.equal(w.stats.wins, 1); assert.equal(w.stats.gold, 9999);
  assert.equal(w.executeBattleCommand('slash'), false); advance(w, 10); assert.equal(w.stats.wins, 1);
});
test('全ボス、コマンド連打、敗北と再挑戦、破棄後の操作', () => {
  for (let i = 0; i < 4; i++) {
    const { world: w } = setup(); w.startBattle(i); assert.equal(w.battle.index, i);
    w.stats.hp = 1; assert(w.executeBattleCommand('combo')); assert.equal(w.executeBattleCommand('combo'), false);
    advance(w, 2); assert(w.battle.defeated); assert.equal(w.executeBattleCommand('barrier'), false);
    w.startBattle(i); assert.equal(w.stats.hp, 50); assert.equal(w.battle.hp, 9999);
    w.destroy(); assert.equal(w.rollDice(), false); assert.equal(w.spinRoulette(), false); assert.equal(w.executeBattleCommand('slash'), false);
  }
  const { world: w } = setup(); assert.throws(() => w.startBattle(4)); assert.throws(() => w.executeBattleCommand('bad')); assert.throws(() => w.setGameScene('bad'));
});
test('6種類のルーレット報酬と針の一致、二重抽選防止、他画面での完了', () => {
  for (let i = 0; i < 6; i++) {
    const { world: w } = setup(); w.stats.hp = 30; w.random = () => (i + 0.1) / 6;
    assert(w.spinRoulette()); assert.equal(w.spinRoulette(), false); w.setGameScene('board'); advance(w, 5);
    const r = w.roulette; assert(r.done); assert.equal(r.result, i);
    const pointer = ((-Math.PI / 2 - r.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    assert.equal(Math.floor(pointer / (Math.PI * 2 / 6)), i);
    if (i === 0) assert.equal(w.stats.village, 3);
    if (i === 1) assert.equal(w.stats.allies, 5);
    if (i === 2) assert.equal(w.stats.assets, 5000);
    if (i === 3) assert.equal(w.stats.level, 4);
    if (i === 4) assert.equal(w.stats.hp, 100);
    if (i === 5) { assert.equal(w.stats.gold, 50000); assert.equal(w.stats.assets, 10000); }
    const stats = JSON.stringify(w.stats); advance(w, 20); assert.equal(JSON.stringify(w.stats), stats); assert(r.age > 5);
    assert(w.spinRoulette());
  }
});
test('全画面の描画、12px以上の文字、HUD領域・座標変換とクリック', () => {
  for (const [width, height] of [[960, 700], [760, 340], [390, 700], [320, 640]]) {
    const { world: w, texts, listeners } = setup({}, width, height);
    for (const year of [2026, 2035, 2045, 2055, 2065]) {
      w.setState({ year });
      for (const scene of ['board', 'battle', 'roulette']) {
        w.setGameScene(scene); w.render();
        assert(w.buttons.length >= 4);
        for (const b of w.buttons) { assert(b.x >= 0 && b.y >= 0); assert(b.x + b.w <= width); assert(b.y + b.h <= height); }
      }
    }
    w.setGameScene('board'); w.render();
    const b = w.buttons[1]; listeners.get('click')({ clientX: 20 + b.x + b.w / 2, clientY: 30 + b.y + b.h / 2 }); assert.equal(w.scene, 'battle');
    w.render(); assert(texts.some(t => t.includes('聖域バリア')));
  }
});
test('start/stop/destroyの多重呼出しと後片付け、負数dtと粒子上限', () => {
  const s = setup(); const w = s.world;
  w.start().start(); assert.equal(s.frames.size, 1); w.stop().stop(); assert.equal(s.frames.size, 0);
  const t = w.time; w.update(-1); w.update(NaN); assert.equal(w.time, t);
  for (let i = 0; i < 40; i++) w.triggerBurst('test'); assert(w.effects.length <= 240); assert(w.popups.length <= 5);
  w.start(); w.destroy(); w.destroy(); assert.equal(s.frames.size, 0); assert.equal(s.listeners.size, 0); assert.equal(s.globalListeners.size, 0); assert(s.disconnected());
  w.start(); assert.equal(s.frames.size, 0); assert.equal(s.canvas.style.cursor, 'crosshair');
});


test('既定は選択RPG、全10章・全30選択で一度だけ決済し、4ランクと再開を検証', () => {
  const years = [2026, 2030, 2034, 2038, 2042, 2046, 2052, 2060, 2068, 2076];
  for (const [route, rank] of [[Array(10).fill(0), 'S'], [[0,0,0,0,0,1,1,1,1,1], 'A'], [Array(10).fill(1), 'B'], [Array(10).fill(2), 'C']]) {
    const { world: w } = setup({ scene: undefined });
    assert.equal(w.scene, 'story'); assert.equal(w.nextChapter(), false);
    for (let i = 0; i < 10; i++) {
      assert.equal(w.year, years[i]); assert.equal(w.chapter.choices.length, 3);
      const before = { ...w.stats }, choice = w.chapter.choices[route[i]];
      assert(w.chooseOption(route[i])); assert.equal(w.chooseOption(route[i]), false);
      assert.equal(w.stats.assets, before.assets + choice.delta.assetsMan);
      assert.equal(w.stats.gold, Math.max(0, before.gold + choice.delta.gold));
      assert.equal(w.stats.hp, Math.max(0, Math.min(100, before.hp + choice.delta.hp)));
      assert.equal(w.stats.bond, Math.max(0, Math.min(100, before.bond + choice.delta.bond)));
      assert.equal(w.buildings[i].level, choice.level); assert.equal(w.phase, 'result');
      w.update(2.19); assert.equal(w.chapterIndex, i); w.update(0.02);
    }
    assert.equal(w.phase, 'ending'); assert.equal(w.endingRank(), rank); assert.equal(w.buildings.length, 10);
    assert.equal(w.snapshot().completedChapters, 10); assert.equal(w.chooseOption(0), false);
    w.render(); assert.equal(w.buttons[0].id, 'restart'); w.buttons[0].action();
    assert.equal(w.year, 2026); assert.equal(w.stats.assets, 0); assert.equal(w.stats.bond, 30);
    assert.equal(w.buildings.length, 0); assert.equal(w.history.length, 0); assert.equal(w.phase, 'choice');
  }
});
test('実クリック・hover・次章・外れクリック、CSS座標と小画面スクロール', () => {
  for (const [width, height] of [[1280, 800], [960, 700], [760, 340], [390, 700], [320, 640]]) {
    const { world: w, listeners, canvas } = setup({ scene: 'story' }, width, height);
    assert.equal(w.buttons.filter(b => b.id.startsWith('choice')).length > 0, true);
    if (w.storyScrollMax) listeners.get('wheel')({ deltaY: 10000, preventDefault() {} });
    const b = w.buttons.find(b => b.id === 'choice-2'); assert(b);
    assert(b.y >= 0 && b.y + b.h <= height);
    const e = { clientX: 20 + b.x + b.w / 2, clientY: 30 + b.y + b.h / 2 };
    listeners.get('pointermove')(e); assert.equal(w.hovered, 'choice-2'); assert.equal(canvas.style.cursor, 'pointer');
    listeners.get('click')(e); assert.equal(w.phase, 'result'); assert.equal(w.result.index, 2);
    const next = w.buttons.find(b => b.id === 'next'); assert(next);
    listeners.get('click')({ clientX: 20 + next.x + 10, clientY: 30 + next.y + 10 });
    assert.equal(w.chapterIndex, 1); assert.equal(w.phase, 'choice');
    listeners.get('click')({ clientX: 20, clientY: 30 }); assert.equal(w.phase, 'choice');
    assert.equal(w.dice, null);
    listeners.get('keydown')({ key: '1' }); assert.equal(w.result.index, 0);
    w.destroy(); assert.equal(listeners.size, 0);
  }
});
test('HUD callbackは初期化・選択・進行・再開で同期し、snapshot変更と再入に耐える', () => {
  const snapshots = [];
  const { world: w } = setup({ scene: 'story', onStateChange(s) { snapshots.push(s); } });
  assert.equal(snapshots.length, 1); assert.equal(snapshots[0].year, 2026);
  let latest;
  w.onStateChange = s => { latest = s; w.setState({ year: s.year, choiceMode: s.choiceMode }); };
  w.chooseOption(1); assert.equal(latest.hp, w.stats.hp); assert.equal(latest.bond, w.stats.bond);
  assert.equal(latest.assetsMan, w.stats.assets); assert.equal(latest.gold, w.stats.gold);
  latest.stats.hp = -999; latest.buildings[0].level = 999; assert.equal(w.stats.hp, 100); assert.equal(w.buildings[0].level, 2);
  const n = snapshots.length; w.update(0.1); assert.equal(snapshots.length, n);
  w.nextChapter(); assert.equal(latest.year, 2030); w.restartGame(); assert.equal(latest.assetsMan, 0);
  w.setGameScene('board'); w.rollDice(); assert.equal(latest.year, w.year);
});
test('年スライダーで報酬を再取得せず、最終章へ飛んでも未完了章を要求', () => {
  const { world: w } = setup({ scene: 'story' });
  for (const invalid of [-1, 3, 0.2, NaN, '1', undefined]) assert.equal(w.chooseOption(invalid), false);
  w.chooseOption(0); w.nextChapter(); const assets = w.stats.assets;
  w.setState({ year: 2026 }); assert.equal(w.chooseOption(0), false); assert.equal(w.stats.assets, assets);
  w.setState({ year: 2076 }); w.chooseOption(2); w.nextChapter();
  assert.equal(w.phase, 'choice'); assert.equal(w.chapterIndex, 1);
  w.destroy(); assert.equal(w.chooseOption(0), false); assert.equal(w.nextChapter(), false); assert.equal(w.restartGame(), false);
});
test('建設のバネ収束・粒子上限・全施設の実描画・季節時刻設定', () => {
  const { world: w, texts } = setup({ scene: 'story' });
  for (let i = 0; i < 10; i++) { w.chooseOption(i % 3); w.render(); w.update(0.3); w.render(); w.nextChapter(); }
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    w.setState({ season, timeOfDay: 0.8 }); w.render();
  }
  w.update(10); assert(w.buildings.every(b => Math.abs(b.bounce) < 0.001));
  assert(w.effects.length <= 240); assert(texts.some(t => t.includes('RANK')));
});

test('タッチスクロールは選択を誤発火せず、次章でスクロールをリセット', () => {
  const { world: w, listeners } = setup({ scene: 'story' }, 320, 640);
  let prevented = false;
  listeners.get('touchstart')({ touches: [{ clientY: 600 }] });
  listeners.get('touchmove')({ touches: [{ clientY: 80 }], preventDefault() { prevented = true; } });
  assert(prevented); assert(w.storyScroll > 0);
  const b = w.buttons.find(b => b.id === 'choice-2'); assert(b);
  const e = { clientX: 20 + b.x + 10, clientY: 30 + b.y + 10 };
  listeners.get('click')(e); assert.equal(w.phase, 'choice');
  listeners.get('touchstart')({ touches: [{ clientY: e.clientY }] });
  listeners.get('click')(e); assert.equal(w.result.index, 2);
  w.nextChapter(); assert.equal(w.storyScroll, 0);
});
test('主人公移動・ダッシュ・フィールドクリック・クエストドロワー開閉の直接操作', () => {
  const { world: w, listeners } = setup({ scene: 'story' }, 960, 700);
  const startX = w.hero.x, startY = w.hero.y;
  w.moveHero(1, 0); assert(w.hero.tx > startX);
  w.moveHero(0, -1); assert(w.hero.ty < startY);
  w.dashHero(); assert(w.hero.jump > 0); assert(w.heroBanner !== null);
  w.toggleQuestDrawer(false); assert.equal(w.drawerOpen, false);
  assert(w.buttons.some(b => b.id === 'drawer-open'));
  listeners.get('click')({ clientX: 20 + 480, clientY: 30 + 220 });
  assert(w.hero.ring > 0);
  w.toggleQuestDrawer(true); assert.equal(w.drawerOpen, true);
});
test('タイトル画面のモード選択、社会人モード文面、ランダム事件で結果が分岐', () => {
  const { world: w, texts, listeners } = setup({ scene: 'story', showTitle: true, events: true }, 960, 700);
  assert.equal(w.phase, 'title'); assert.equal(w.chooseOption(0), false);
  const btn = w.buttons.find(b => b.id === 'mode-adult'); assert(btn);
  listeners.get('click')({ clientX: 20 + btn.x + 5, clientY: 30 + btn.y + 5 });
  assert.equal(w.playMode, 'adult'); assert.equal(w.phase, 'choice'); assert(w.currentEvent);
  w.render(); assert(texts.some(t => t.includes('攻め')));
  const tiers = new Set();
  for (let i = 0; i < 10; i++) {
    for (const k of [0, 1, 2]) { const p = w.successRate(k); assert(p >= 0.1 && p <= 0.95); }
    assert(w.chooseOption(i % 3)); tiers.add(w.result.tier); w.render();
    assert.equal(w.phase, 'result'); w.update(5); assert.equal(w.phase, 'result'); // 事件ありは自動で進まない
    w.nextChapter();
  }
  assert.equal(w.phase, 'ending'); assert(['S', 'A', 'B', 'C'].includes(w.endingRank()));
  assert(tiers.size >= 2); w.render(); assert(texts.some(t => t.includes('RANK')));
  w.restartGame(); assert.equal(w.phase, 'title'); assert.equal(w.history.length, 0);
  listeners.get('keydown')({ key: '1' }); assert.equal(w.playMode, 'student'); assert.equal(w.phase, 'choice');
});
