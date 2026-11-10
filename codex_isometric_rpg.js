/* 人生すごろく / コマンドバトル / 大逆転ルーレット — Canvas 2D、依存なし。
 * new CodexIsometricRpgEngine(canvas, { year, choiceMode, season, timeOfDay,
 *   autoStart: false, seed: 2046, maxDpr: 2, cycleSeconds: 120 });
 * update(dt) の単位は秒。autoStart:false は呼出元で update/render を行う。
 * year は2026〜2076の整数へ丸める。ゲームの獲得値は stats に保持する。
 */
(function (global) {
  'use strict';
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MODES = ['antifragile', 'standard', 'relapse'];
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const ERAS = [
    ['黎明の町・空き家再生ステージ', '#743d54', '#ffce91', '#ff9956', '#497d66'],
    ['AI＆3D建築開拓ステージ', '#06384c', '#3ce6cd', '#66ffdc', '#107e88'],
    ['神社聖域＆令和の講ステージ', '#6d274e', '#ffc26c', '#ffe29a', '#9e5b49'],
    ['空飛ぶeVTOL＆ソーラー都市ステージ', '#130d43', '#664399', '#61e8ff', '#354676'],
    ['2076伝説の黄金空中聖域ステージ', '#080e32', '#333776', '#ffe79c', '#776338']
  ];
  const BOSSES = ['重労働ゴーレム(2〜8の雑務)', '空き家スプロール魔王', '孤独＆格差ドラゴン', '思考停止カオスロボ'];
  const PRIZES = ['⛩️ 神社ビレッジ3倍', '🤖 AIロボ軍団加入', '💰 資産+5,000万', '👑 伝説の宮大工', '⚡ やる気MAX回復', '🌈 大逆転ジャックポット'];
  const COLORS = ['#58b8ff', '#ff627b', '#ffd766', '#50d8a4', '#bd93ff', '#f0a1ff'];
  // 各章は一度だけ決済。資産の単位は万円。
  const CHAPTERS = [
    [2026, 'はじまりの灯', '仕事に追われ、町づくりが進まない。目的を決める「1」と仕上げる「9」に集中し、途中の「2〜8」は誰に任せる？', '開拓者ギルド',
      ['AIと仲間に2〜8を任せる', '手順書を作り、一仕事ずつ渡す', '全工程を自分だけで抱える'],
      ['仲間が集結！ 空いた時間で開拓の拠点を建てた！', '小さな分担が実を結び、相談所が開いた。', '夜通し働き、仮の作業小屋だけは確保した…。']],
    [2030, 'AI直結賃貸始動', '空き物件と住みたい人が出会えない。AI直接不動産AI直結賃貸で、家主と入居者の相談をどうつなぐ？', 'AI直結賃貸相談館',
      ['AIで希望を照合し、仲間が内見を支援', '一軒ずつ家主の相談を聞く', '紙の台帳と電話を一人で回す'],
      ['空き家に灯が戻る！ 直接相談の拠点が誕生！', '丁寧な紹介が一組の契約につながった。', '電話が鳴りやまない…。小さな受付を増設した。']],
    [2034, '古民家にもう一度、灯を', '河口湖の古民家が朽ちかけている。住民の思い出を残しながら、次の暮らしに再生しよう。', '古民家再生宿',
      ['AI診断と職人・住民の共同改修', '屋根から順に、少しずつ修繕', '一人で応急処置を繰り返す'],
      ['眠っていた梁が蘇る！ 滞在客を迎える再生宿が完成！', '雨漏りが止まり、住民の集会所になった。', '雨をしのぐので精一杯。それでも一室を守った。']],
    [2038, '未来の家を刷る', '住宅不足が深刻だ。3Dプリント住宅で速く建てるか、既存の工法を続けるか。住み心地も大切にしたい。', '木と光のドーム住宅',
      ['3D施工と木組みを仲間で融合', '小さな試作住宅から検証する', '従来工法を一人で管理する'],
      ['木とガラスが輝く！ 新しい住まいの街区が誕生！', '試作ドームに最初の家族が引っ越した。', '工期が延びて疲労が蓄積…。資材小屋を整えた。']],
    [2042, '宮大工の継承', '速く建つ家が増える一方、宮大工の技が途絶えそうだ。師匠の知恵をどう未来へ渡す？', '宮大工の継承工房',
      ['AI記録と若手の実習を師匠と進める', '毎週、師匠から技を一つ学ぶ', '技術を独占し、弟子を取らない'],
      ['千年の技とAIが共演！ 黄金の棟を持つ工房が完成！', '弟子が一本の継手を仕上げ、工房が育った。', '後継者はまだいない…。古い道具蔵を補修した。']],
    [2046, 'AI執事と余白の経済', '買い物・予約・日々の事務が生活を圧迫している。AI執事を使って住民の時間を取り戻せるだろうか？', 'AI執事の交流館',
      ['執事AIと人の相談員で地域を支える', '予約業務だけAIで改善する', 'すべての依頼を一人で受ける'],
      ['自由な時間が町の豊かさに！ 執事交流館が開業！', '待ち時間が減り、小さな相談窓口が育った。', '依頼が山積みに…。徹夜で受付を増やした。']],
    [2052, '小さな町、大きな電力', '災害で送電が不安定に。総合建設の仲間と、徒歩で暮らせるコンパクト都市と自立電源を作ろう。', '太陽のマイクログリッド',
      ['建設ギルドと住宅・電力を一体整備', '公共施設から太陽光を増やす', '古い設備を一人で修理する'],
      ['光の幹線が開通！ 町全体が助け合う自立電源が完成！', '集会所の電気を守れるようになった。', '停電対応で消耗…。予備電源をなんとか設置した。']],
    [2060, '令和の講', '豊かな町でも孤独は残る。「令和の講」で助け合う仲間をつなぎ、誰もが役割を持てる場所を作ろう。', '令和の講・鎮守の社',
      ['得意を交換する講を皆で運営する', '月に一度の交流会を続ける', '相談を一人で引き受け続ける'],
      ['百の得意が結ばれた！ 金色の社に祭りの灯がともる！', '顔を知る仲間が増え、鳥居が建った。', '支える側が孤立…。小さな祈りの場だけを守った。']],
    [2068, '空から訪れる聖域', 'eVTOLで訪れる旅人が増えた。静けさと住民の暮らしを守りながら、聖地観光を育てたい。', 'eVTOL天空の港',
      ['予約AIと地域ガイドで少人数を迎える', '週末だけガイド便を試す', '予約も案内も一人で担当する'],
      ['空と湖が結ばれる！ 静かな旅を支える天空港が開港！', '最初の案内便が、笑顔を乗せて飛び立った。', '過密な案内で疲労…。仮設の発着場を整えた。']],
    [2076, '百年の聖域', '誕生から100年。育てた町を次の世代へ託す時がきた。建物だけでなく、助け合う仕組みをどう残す？', '百年の黄金聖域',
      ['土地・技・役割を次世代の仲間へ託す', '記録を整え、後継者と一歩ずつ歩む', '最後まで一人で管理し続ける'],
      ['百年の願いが空へ！ 黄金の聖域と共創の未来が完成！', '受け継がれた灯が、次の百年を照らす。', '町は残った。次は仲間に頼る勇気から始めよう。']]
  ].map(([year, title, prompt, building, actions, outcomes], chapter) => ({
    year, title, prompt, building,
    choices: actions.map((action, i) => ({
      action, outcome: outcomes[i], building, level: 3 - i,
      label: ['⚡ 大逆転・AIと仲間と共創ルート', '🤝 堅実・コツコツ改善ルート', '😰 ひとり抱え込み・旧来維持ルート'][i],
      delta: { hp: [14, 5, -17][i], bond: [9, 4, -6][i], village: [8, 4, 1][i],
        assetsMan: [1200, 450, 70][i] * (chapter + 1), gold: [800, 320, -100][i] * (chapter + 1) }
    }))
  }));
  // 社会人モード：同じ章・同じ数値で、実務用語と経営判断の文面に差し替える。
  const ADULT_LABELS = ['⚡ 攻め：共創・積極投資', '🛡️ 守り：段階投資・小さく検証', '🧱 現状維持：内製・コスト抑制'];
  const ADULT = [
    ['本業の業務過多で新規事業に時間が割けない。経営判断（1）と最終品質（9）以外の2〜8工程をどう外部化する？',
      ['生成AI＋業務委託で2〜8を外部化（月30万円投資）', '業務をマニュアル化し社内で段階的に移管', '全工程を自分で回し、外注費ゼロを維持'],
      ['可処分時間が週20時間増。新規事業の拠点を立ち上げた！', '属人化が減り、相談窓口を開設できた。', '固定費は抑えたが、拠点は作業小屋レベルに留まった…。']],
    ['空室率15%の地方市場。仲介手数料に頼らないAI直接マッチング（AI直結賃貸）で、オーナーと入居者をどうつなぐ？',
      ['AIマッチング＋提携仲介でオンライン内見を全面展開', '既存オーナー10社と小さく実証', '紙台帳と電話営業で従来の手数料収入を守る'],
      ['成約率が倍増！ 直接取引の拠点が誕生した。', '実証で1棟満室。手応えをつかんだ。', '問い合わせ対応に追われ、受付を増設するだけで精一杯…。']],
    ['河口湖の築90年古民家。改修費2,000万円、想定利回り8%。どう再生する？',
      ['AI劣化診断＋クラウドファンディング＋地元職人で宿泊施設化', '屋根・水回りから段階改修して賃貸化', '最低限の修繕で現状のまま貸し出す'],
      ['稼働率85%の再生宿が完成！ 利回りは想定超え。', '雨漏りが止まり、安定した賃料収入が入り始めた。', '修繕費が毎年かさみ、利回りは3%台に…。']],
    ['建築費高騰と職人不足で住宅供給が追いつかない。3Dプリント工法の導入をどう判断する？',
      ['3D施工×在来木造のハイブリッドで量産ラインを構築', 'モデル棟1棟で性能・コストを検証', '従来工法を維持し、既存の協力会社と継続'],
      ['工期40%短縮！ 新しい住宅街区を供給できた。', 'モデル棟の性能が実証され、最初の契約が入った。', '工期遅延と人件費増で利益率が低下…。']],
    ['宮大工の平均年齢は72歳。技能承継が途絶えれば社寺案件の受注が消える。',
      ['技能をAIでデータ化し、若手育成に年間1,500万円投資', '月1回の師弟研修を制度化', '必要な時だけ外注で調達する'],
      ['若手5名が独り立ち！ 社寺案件の受注が倍増した。', '弟子が一本の継手を仕上げ、工房が育った。', '外注費が高騰し、案件を断る場面が増えた…。']],
    ['事務・予約・経理で地域事業者の生産性が低迷。AIエージェント導入で人時生産性をどう上げる？',
      ['AI執事＋人の相談員のハイブリッド運用を地域全体へ', '予約業務のみSaaS化する', '既存スタッフの残業で対応する'],
      ['人時生産性が1.8倍！ 地域の交流拠点が開業した。', '予約の取りこぼしが減り、売上が安定した。', '残業代がかさみ、離職者が出てしまった…。']],
    ['災害で系統電力が不安定に。ゼネコン・電力会社とコンパクトシティ＋自立分散電源を整備するか？',
      ['ゼネコンJVで住宅・蓄電池・PPAを一体開発', '公共施設の屋根上太陽光から着手', '既存設備を補修して延命する'],
      ['停電ゼロの街区が完成！ 電力収入という新しい柱ができた。', '避難所の電力を確保できるようになった。', '補修費が膨らみ、予備電源を置くので精一杯…。']],
    ['単身高齢世帯が40%に。地域コミュニティ「令和の講」を収益と両立させて運営できるか？',
      ['スキル交換の会員制コミュニティとして事業化', '月1回の交流イベントを継続する', '自社の福利厚生として個別に対応する'],
      ['会員1,000人突破！ 会費収入で社が建った。', '顔の見える関係が増え、鳥居が建った。', '担当者に負担が集中し、孤立してしまった…。']],
    ['eVTOLで観光客が急増。オーバーツーリズムと住民の生活をどう両立する？',
      ['事前予約制＋入域料＋地域ガイドで高単価・少人数化', '週末限定で試験運航する', '受け入れ制限なしで全便を受け入れる'],
      ['客単価3倍・住民満足度も向上！ 天空港が開港した。', '試験運航が好評で、定期便化が決まった。', '住民の苦情が殺到し、仮設の発着場で対応…。']],
    ['事業承継のとき。資産・技術・コミュニティをどう次世代に渡す？',
      ['社団化・持株会で次世代に所有と役割を分散承継', '後継者を指名し、5年かけて引き継ぐ', '最後まで創業者が所有・経営を続ける'],
      ['100年続く仕組みが完成！ 黄金の聖域が次世代へ。', '後継者が育ち、事業は次の世代へ渡った。', '事業は残った。次は任せる勇気から始めよう。']]
  ];
  CHAPTERS.forEach((c, i) => {
    const [prompt, actions, outcomes] = ADULT[i];
    c.adult = { prompt, choices: actions.map((action, k) => ({ action, outcome: outcomes[k], label: ADULT_LABELS[k] })) };
  });
  // ランダム事件。mod=成功率の増減、boost=資産・ゴールドへの倍率（①共創 ②堅実 ③現状維持）。
  // 「いつも①が正解」にならないよう、③が得をする事件も入れている。
  const EVENTS = [
    { name: '📈 金利上昇', student: 'お金を借りるコストが上がった！ 大きな借金は危ない年。', adult: '政策金利が1.5%上昇。借入依存の大型投資は返済負担が重くなる。', mod: [-0.25, 0.15, 0.05], boost: [0.6, 1.3, 1] },
    { name: '🌋 大地震', student: '大きな地震が発生！ 仲間と助け合える町が強い。', adult: '震度6強の地震が発生。地域ネットワークとBCPの有無が明暗を分ける。', mod: [0.1, -0.1, -0.3], boost: [1.4, 1, 0.5] },
    { name: '🧱 資材高騰', student: '木材や鉄の値段が急に上がった！ 新しく建てるのは高くつく。', adult: '建設資材価格が前年比30%上昇。新築・大規模改修の採算が悪化。', mod: [-0.15, 0.05, 0.15], boost: [0.7, 1, 1.6] },
    { name: '👷 人手不足', student: '働く人が全然足りない！ AIや仲間の力がカギ。', adult: '有効求人倍率3倍超。自前の人員だけでは現場が回らない。', mod: [0.25, -0.05, -0.3], boost: [1.5, 1, 0.6] },
    { name: '📉 景気後退', student: '景気が悪くなった！ ムダを減らして守るのが正解かも。', adult: 'GDPマイナス成長。需要が冷え込み、固定費の軽さが生存条件に。', mod: [-0.2, 0, 0.3], boost: [0.6, 1, 3] },
    { name: '💴 補助金チャンス', student: '国から応援のお金が出る！ チャレンジするなら今。', adult: '地方創生・GX補助金（補助率2/3）が公募開始。積極投資の好機。', mod: [0.2, 0.1, -0.1], boost: [1.6, 1.2, 1] },
    { name: '✈️ 観光客急増', student: '世界中から旅行者がやってきた！ お客さんを迎える準備を。', adult: 'インバウンドが前年比2倍。受け入れ体制を作れた事業者が総取り。', mod: [0.15, 0.1, 0], boost: [1.5, 1.2, 1] },
    { name: '🍃 平穏な年', student: '大きな事件なし。自分の実力が試される年。', adult: '外部環境は安定。純粋に戦略と実行力の勝負。', mod: [0, 0, 0], boost: [1, 1, 1] }
  ];
  const BASE_SUCCESS = [0.6, 0.75, 0.55];
  const TIER_TEXT = {
    student: ['🌟 大成功!! 運も味方した！', '👍 成功！ 計画どおり！', '💥 失敗… 事件に足をすくわれた'],
    adult: ['🌟 大成功 — 想定を上回るリターン', '👍 成功 — 計画どおりの着地', '💥 失敗 — 外部環境が逆風に']
  };
  class CodexIsometricRpgEngine {
    constructor(canvas, options = {}) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('canvas が必要です');
      this.ctx = canvas.getContext('2d');
      if (!this.ctx) throw new Error('Canvas 2D が利用できません');
      this.canvas = canvas; this.options = options;
      this.original = { width: canvas.width, height: canvas.height, cursor: canvas.style.cursor };
      this.state = { year: 2026, choiceMode: 'antifragile', season: 'auto', timeOfDay: null };
      this.stats = { bond: 30, gold: 0, assets: 0, level: 1, allies: 2, village: 1, hp: 100, wins: 0 };
      this.randomState = (Number(options.seed) || 2046) >>> 0;
      this.scene = options.scene === 'board' ? 'board' : 'story'; this.time = 0; this.position = 0; this.target = 0;
      this.effects = []; this.popups = []; this.buttons = []; this.claimed = new Set();
      this.running = false; this.destroyed = false; this.frame = 0; this.shake = 0;
      this.transition = 0; this.dice = null; this.battle = null; this.roulette = null;
      this.chapterIndex = 0; this.phase = 'choice'; this.history = []; this.buildings = [];
      this.result = null; this.hovered = null; this.storyScroll = 0; this.cityBottom = 300;
      this.hero = { x: -111, y: 280, tx: -111, ty: 280, jump: 0, ring: 0, dir: 1 };
      this.heroBanner = null;
      this.drawerOpen = true;
      this.playMode = options.playMode === 'adult' ? 'adult' : 'student';
      this.eventsOn = options.events === true; this.chapterEvents = [];
      this.orbs = [[-190, 200], [-30, 165], [130, 175], [40, 260], [-140, 295], [175, 240]].map(([x, y], i) => ({ x, y, id: i, cooldown: 0 }));
      this.initialized = false;
      this.setState(options); this.position = this.target; this.initialized = true;
      if (this.scene === 'story' && options.showTitle) this.phase = 'title';
      if (this.eventsOn) this.pickEvent();
      this.onResize = () => this.resize();
      this.onMove = e => { const b = this.pick(e); this.hovered = b ? b.id : null; canvas.style.cursor = b ? 'pointer' : this.original.cursor; this.render(); };
      this.onLeave = () => { this.hovered = null; canvas.style.cursor = this.original.cursor; this.render(); };
      this.onClick = e => {
        if (this.touchScrolling) { this.touchScrolling = false; return; }
        const b = this.pick(e);
        if (b) b.action();
        else if (this.scene === 'story') this.clickPioneerField(e);
        else if (this.scene === 'board') this.rollDice();
        else if (this.scene === 'battle') this.executeBattleCommand(this.choiceMode || 'antifragile');
        else if (this.scene === 'roulette') this.spinRoulette();
      };
      this.onWheel = e => {
        if (this.scene !== 'story' || this.phase !== 'choice' || !this.storyScrollMax) return;
        e.preventDefault(); this.storyScroll = clamp(this.storyScroll + e.deltaY, 0, this.storyScrollMax); this.render();
      };
      this.onTouchStart = e => { this.touchY = e.touches[0].clientY; this.touchScrolling = false; };
      this.onTouchMove = e => {
        if (this.scene !== 'story' || this.phase !== 'choice' || !this.storyScrollMax) return;
        const y = e.touches[0].clientY, delta = this.touchY - y;
        if (Math.abs(delta) < 4 && !this.touchScrolling) return;
        e.preventDefault(); this.touchScrolling = true; this.touchY = y;
        this.storyScroll = clamp(this.storyScroll + delta, 0, this.storyScrollMax); this.render();
      };
      this.onKey = e => {
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault && e.preventDefault(); this.moveHero(-1, 0); return; }
        if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault && e.preventDefault(); this.moveHero(1, 0); return; }
        if (['ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault && e.preventDefault(); this.moveHero(0, -1); return; }
        if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault && e.preventDefault(); this.moveHero(0, 1); return; }
        if (e.key === ' ') { e.preventDefault && e.preventDefault(); this.dashHero(); return; }
        if (this.scene !== 'story') return;
        if (this.phase === 'title') { if (e.key === '1') this.setPlayMode('student'); if (e.key === '2') this.setPlayMode('adult'); return; }
        if (['1', '2', '3'].includes(e.key)) this.chooseOption(Number(e.key) - 1);
        else if (e.key === 'Enter' && this.phase === 'result') this.nextChapter();
      };
      this.original.tabindex = canvas.getAttribute ? canvas.getAttribute('tabindex') : null;
      if (canvas.setAttribute) canvas.setAttribute('tabindex', '0');
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
      canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
      canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
      canvas.addEventListener('keydown', this.onKey);
      canvas.addEventListener('click', this.onClick);
      canvas.addEventListener('pointermove', this.onMove);
      canvas.addEventListener('pointerleave', this.onLeave);
      global.addEventListener('resize', this.onResize);
      if (global.ResizeObserver) { this.observer = new global.ResizeObserver(this.onResize); this.observer.observe(canvas); }
      this.resize(); this.render();
      this.notifyState();
      if (options.autoStart !== false) this.start();
    }
    get chapter() { return CHAPTERS[this.chapterIndex]; }
    // 表示用の章（モードに応じた文面）。数値（delta/level/building）は共通。
    chapterView() {
      const c = this.chapter;
      if (this.playMode !== 'adult') return c;
      return { ...c, prompt: c.adult.prompt, choices: c.choices.map((ch, i) => ({ ...ch, ...c.adult.choices[i] })) };
    }
    get currentEvent() { return this.eventsOn ? this.chapterEvents[this.chapterIndex] || null : null; }
    pickEvent() {
      if (!this.eventsOn || this.chapterEvents[this.chapterIndex]) return;
      this.chapterEvents[this.chapterIndex] = EVENTS[Math.floor(this.random() * EVENTS.length)];
    }
    successRate(index) {
      const ev = this.currentEvent;
      return clamp(BASE_SUCCESS[index] + (ev ? ev.mod[index] : 0), 0.1, 0.95);
    }
    setPlayMode(mode) {
      if (this.destroyed || !['student', 'adult'].includes(mode)) return false;
      this.playMode = mode;
      if (this.phase === 'title') this.phase = 'choice';
      this.pickEvent();
      this.triggerBurst(mode === 'adult' ? '💼 社会人モード スタート！' : '🎒 高校生モード スタート！');
      this.notifyState(); this.render(); return true;
    }
    snapshot() {
      const ev = this.currentEvent;
      return { ...this.state, ...this.stats, assetsMan: this.stats.assets,
        stats: { ...this.stats, assetsMan: this.stats.assets }, scene: this.scene,
        chapterIndex: this.chapterIndex, chapterTitle: this.chapter.title, phase: this.phase,
        playMode: this.playMode, eventName: ev ? ev.name : null,
        buildings: this.buildings.map(({ id, name, level }) => ({ id, name, level })),
        completedChapters: this.history.filter(Boolean).length, rank: this.endingRank() };
    }
    notifyState() {
      if (this.destroyed || !this.buildings) return;
      const snapshot = this.snapshot(), key = JSON.stringify(snapshot);
      if (key === this.lastSnapshot) return;
      this.lastSnapshot = key;
      const callbacks = new Set([this.options.onStateChange, this.onStateChange]);
      for (const callback of callbacks) if (typeof callback === 'function') callback(this.snapshot());
    }
    endingRank() {
      // 事件ありでは「大成功2・成功1・失敗0」で採点（運と判断の両方が効く）。
      const score = this.history.reduce((sum, result) => sum + (result ? (result.tier !== undefined ? 2 - result.tier : 2 - result.index) : 0), 0);
      return score >= 17 ? 'S' : score >= 12 ? 'A' : score >= 6 ? 'B' : 'C';
    }
    chooseOption(index) {
      if (this.destroyed || this.scene !== 'story' || this.phase !== 'choice' || this.history[this.chapterIndex]) return false;
      if (!Number.isInteger(index) || index < 0 || index > 2) return false;
      const choice = this.chapterView().choices[index];
      let delta = choice.delta, tier;
      const ev = this.currentEvent;
      if (ev) {
        const p = this.successRate(index), r = this.random();
        tier = r < p * 0.4 ? 0 : r < p ? 1 : 2;
        const b = ev.boost[index], d = choice.delta;
        if (tier === 0) delta = { hp: d.hp + 6, bond: d.bond + 4, village: d.village + 2, assetsMan: Math.round(d.assetsMan * 1.6 * b), gold: Math.round(Math.abs(d.gold) * 1.6 * b) };
        else if (tier === 1) delta = { ...d, assetsMan: Math.round(d.assetsMan * b), gold: Math.round(d.gold * b) };
        else delta = { hp: Math.min(d.hp, 0) - 12, bond: d.bond - 3, village: Math.max(0, d.village - 2), assetsMan: Math.round(d.assetsMan * 0.15), gold: -Math.round(Math.abs(d.gold) * 0.5) };
      }
      for (const stat of ['hp', 'bond']) this.stats[stat] = clamp(this.stats[stat] + delta[stat], 0, 100);
      this.stats.village = clamp(this.stats.village + delta.village, 0, 100);
      this.stats.assets = Math.max(0, this.stats.assets + delta.assetsMan);
      this.stats.gold = Math.max(0, this.stats.gold + delta.gold);
      this.state.choiceMode = MODES[index];
      let building = this.buildings.find(b => b.id === this.chapterIndex);
      if (!building) { building = { id: this.chapterIndex, name: choice.building, level: 0 }; this.buildings.push(building); }
      const gained = tier === 2 ? 1 : tier === 0 ? choice.level + 1 : choice.level;
      Object.assign(building, { level: building.level + gained, age: 0, bounce: 0.25, velocity: 4 });
      this.result = { index, choice, age: 0, tier, delta, event: ev };
      this.history[this.chapterIndex] = this.result;
      this.phase = 'result'; this.shake = tier === 2 ? 1 : 0.65;
      this.emit(this.width / 2, this.cityBottom * 0.65, tier === 0 ? 120 : tier === 2 ? 15 : 70, 'spark');
      if (tier !== undefined) this.triggerBurst(TIER_TEXT[this.playMode][tier]);
      this.hovered = null; this.render(); this.notifyState(); return true;
    }
    nextChapter() {
      if (this.destroyed || this.scene !== 'story' || this.phase !== 'result') return false;
      if (this.chapterIndex === CHAPTERS.length - 1) {
        // 年スライダーで最後へ飛んでも未選択の章を飛ばしてクリアしない。
        const missing = CHAPTERS.findIndex((_, i) => !this.history[i]);
        if (missing < 0) { this.phase = 'ending'; this.result = null; this.notifyState(); this.render(); return true; }
        this.chapterIndex = missing;
      } else this.chapterIndex++;
      this.state.year = this.chapter.year;
      this.position = this.target = this.year - 2026;
      this.result = this.history[this.chapterIndex] || null;
      if (this.result) this.result.age = 0;
      this.phase = this.result ? 'result' : 'choice'; this.hovered = null; this.storyScroll = 0;
      this.pickEvent();
      this.notifyState(); this.render(); return true;
    }
    restartGame() {
      if (this.destroyed) return false;
      Object.assign(this.stats, { hp: 100, bond: 30, village: 1, assets: 0, gold: 0, level: 1, allies: 2, wins: 0 });
      this.chapterIndex = 0; this.history = []; this.buildings = []; this.result = null;
      this.phase = 'choice'; this.scene = 'story'; this.state.year = 2026; this.state.choiceMode = 'antifragile';
      this.position = this.target = 0; this.dice = this.battle = this.roulette = null;
      this.effects = []; this.popups = []; this.claimed.clear(); this.shake = this.transition = 0;
      this.time = 0; this.hovered = null; this.storyScroll = 0; this.randomState = (Number(this.options.seed) || 2046) >>> 0;
      this.hero = { x: -111, y: 280, tx: -111, ty: 280, jump: 0, ring: 0, dir: 1 };
      this.heroBanner = null; this.drawerOpen = true;
      if (this.eventsOn) {
        // 事件ありは毎回ちがう展開にする（seed固定の決定論テストは events なしで実行）。
        this.randomState = (this.randomState ^ (Date.now() >>> 0)) >>> 0;
        this.chapterEvents = []; this.pickEvent();
      }
      if (this.options.showTitle) this.phase = 'title';
      this.notifyState(); this.render(); return true;
    }
    toggleQuestDrawer(force) {
      if (this.destroyed) return this;
      this.drawerOpen = typeof force === 'boolean' ? force : !this.drawerOpen;
      this.render(); return this;
    }
    inspectNearestLandmark(tx, ty) {
      const slots = [[-240,160],[-95,117],[60,111],[220,160],[-200,239],[-57,202],[95,200],[249,252],[80,294],[0,58]];
      let bestId = -1, bestDist = 72;
      slots.forEach(([sx, sy], id) => {
        const d = Math.hypot(sx - tx, sy - ty);
        if (d < bestDist) { bestDist = d; bestId = id; }
      });
      if (bestId >= 0) {
        const b = (this.buildings || []).find(v => v.id === bestId);
        const chap = CHAPTERS[bestId];
        if (b && b.level) {
          b.bounce = 0.28; b.velocity = 4.2; b.age = 0;
          this.heroBanner = { text: `🏯 ${b.name} (Lv.${b.level}) を視察・稼働ブースト！`, age: 0 };
        } else if (chap) {
          this.heroBanner = { text: `🗺️ 建設予定地：${chap.building}（${chap.year}年・第${bestId + 1}章）`, age: 0 };
        }
      }
      if (this.orbs) {
        for (const orb of this.orbs) {
          if (orb.cooldown <= 0 && Math.hypot(orb.x - tx, orb.y - ty) < 48) {
            orb.cooldown = 5.5;
            this.heroBanner = { text: '✨ 開拓オーブ回収！ 街の活気＆建設エネルギー充填！', age: 0 };
            this.emit(this.width / 2, (this.cityBottom || 240) * 0.65, 28, 'spark');
          }
        }
      }
    }
    moveHero(dx, dy, step = 44) {
      if (this.destroyed) return this;
      if (dx !== 0) this.hero.dir = dx > 0 ? 1 : -1;
      this.hero.tx = clamp(this.hero.tx + dx * step, -330, 330);
      this.hero.ty = clamp(this.hero.ty + dy * step, 85, 330);
      this.hero.x = this.hero.x + (this.hero.tx - this.hero.x) * 0.45;
      this.hero.y = this.hero.y + (this.hero.ty - this.hero.y) * 0.45;
      this.hero.jump = Math.max(this.hero.jump, 0.45);
      this.hero.ring = 1.1;
      this.inspectNearestLandmark(this.hero.tx, this.hero.ty);
      this.render(); return this;
    }
    dashHero() {
      if (this.destroyed) return this;
      this.hero.jump = 1.0; this.hero.ring = 1.5; this.shake = 0.3;
      this.emit(this.width / 2, (this.cityBottom || 260) * 0.62, 36, 'spark');
      this.inspectNearestLandmark(this.hero.tx, this.hero.ty);
      if (!this.heroBanner) this.heroBanner = { text: '⚡ 開拓ダッシュ＆全域調査を発動！', age: 0 };
      for (const b of this.buildings) { b.bounce = 0.22; b.velocity = 3.5; }
      this.render(); return this;
    }
    clickPioneerField(e) {
      if (this.destroyed || !e) return false;
      const r = this.canvas.getBoundingClientRect(); if (!r || !r.width || !r.height) return false;
      const sx = (e.clientX - r.left) * this.width / r.width, sy = (e.clientY - r.top) * this.height / r.height;
      const h = this.cityBottom || this.height * 0.64;
      if (sy < 67 || sy > h) return false;
      const scale = Math.min(this.width / 1030, h / 530) || 1;
      const ix = clamp((sx - this.width / 2) / scale, -330, 330);
      const iy = clamp((sy - (h - 10)) / scale + 380, 85, 330);
      if (ix !== this.hero.x) this.hero.dir = ix >= this.hero.x ? 1 : -1;
      this.hero.tx = ix; this.hero.ty = iy;
      this.hero.x = this.hero.x + (ix - this.hero.x) * 0.35;
      this.hero.y = this.hero.y + (iy - this.hero.y) * 0.35;
      this.hero.jump = 0.65; this.hero.ring = 1.3;
      this.emit(sx, sy, 18, 'spark');
      this.inspectNearestLandmark(ix, iy);
      this.render(); return true;
    }
    storyLines(value, width, size = 12) {
      const c = this.ctx; c.font = `800 ${size}px system-ui, sans-serif`;
      const lines = []; let line = '';
      for (const ch of String(value)) {
        if (line && c.measureText(line + ch).width > width) { lines.push(line); line = ''; }
        line += ch;
      }
      if (line) lines.push(line);
      return lines;
    }
    storyText(value, x, y, width, size = 12, color = '#d5e4ee') {
      const lines = this.storyLines(value, width, size);
      lines.forEach((line, i) => this.text(line, x, y + i * (size + 4), size, color, 'left'));
      return lines.length * (size + 4);
    }
    storyCard(x, y, w, h, accent, action, id) {
      const c = this.ctx, hover = this.hovered === id;
      c.save(); c.shadowColor = accent; c.shadowBlur = hover ? 22 : 0;
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, hover ? '#254568' : '#142c46'); g.addColorStop(1, '#091421');
      this.rect(x, y, w, h, g); c.strokeStyle = accent; c.lineWidth = hover ? 2.5 : 1;
      c.strokeRect(x, y, w, h); c.restore(); this.rect(x, y, 4, h, accent);
      this.buttons.push({ x, y, w, h, action, id });
    }
    drawStory() {
      const w = this.width, h = this.height, pad = 14, inner = w - pad * 2;
      const narrow = w < 760, gap = 8, cw = narrow ? inner : (inner - gap * 2) / 3;
      const chapter = this.chapterView(), ev = this.currentEvent, adult = this.playMode === 'adult';
      const deltaText = d => `HP ${d.hp > 0 ? '+' : ''}${d.hp}   絆 ${d.bond > 0 ? '+' : ''}${d.bond}   町 +${d.village} ｜ 資産 ${d.assetsMan >= 0 ? '+' : ''}${d.assetsMan.toLocaleString()}万   G ${d.gold > 0 ? '+' : ''}${d.gold.toLocaleString()}`;
      const rateText = i => {
        if (!ev) return null;
        const pct = Math.round(this.successRate(i) * 100), b = ev.boost[i];
        return `${adult ? '成功確率' : '成功しやすさ'} ${pct}% ｜ ${adult ? 'リターン倍率' : 'もらえるお金'} ×${b}${b > 1 ? ' ↑' : b < 1 ? ' ↓' : ''}`;
      };
      const cardLines = (choice, i) => [[`${i + 1}. ${choice.label}`, '#fff0c4'], [choice.action, '#fff'], ...(ev ? [[rateText(i), '#ffb98a']] : []),
        [`${adult ? '基本収支' : 'ふつうに成功したら'}：${deltaText(choice.delta)}`, '#bad4e3'], [`${choice.building} Lv.${choice.level} 建設`, '#87e3d6']];
      const eventLine = ev ? `${ev.name}　${adult ? ev.adult : ev.student}` : '';
      const cardHeight = Math.max(...chapter.choices.map((choice, i) => 24 +
        cardLines(choice, i).reduce((sum, [line]) => sum + this.storyLines(line, cw - 28).length * 16 + 4, 0)));
      const promptHeight = this.storyLines(chapter.prompt, inner - 24).length * 16 + (ev ? this.storyLines(eventLine, inner - 24).length * 16 + 8 : 0);
      const panelHeight = 55 + promptHeight + (narrow ? cardHeight * 3 + gap * 2 : cardHeight) + 24;
      this.cityBottom = this.phase === 'title' ? Math.max(90, h * 0.42) : this.phase === 'choice'
        ? (this.drawerOpen ? Math.max(Math.min(220, h * 0.4), h - panelHeight) : Math.max(120, h - 54))
        : Math.max(100, h * 0.56);
      this.ctx.save();
      if (this.shake) this.ctx.translate(Math.sin(this.time * 87) * this.shake * 8, Math.cos(this.time * 73) * this.shake * 4);
      this.drawPioneerWorld();
      for (const p of this.effects) {
        this.ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
        this.ellipse(p.x, p.y, 2, 4, '#ffe7a0');
      }
      this.ctx.restore();
      if (this.heroBanner && this.heroBanner.age < 3.2) {
        const by = Math.max(72, this.cityBottom - 34);
        this.rect(pad, by, inner, 28, '#071321e8');
        this.ctx.strokeStyle = '#f5d58a'; this.ctx.lineWidth = 1; this.ctx.strokeRect(pad, by, inner, 28);
        this.text(this.heroBanner.text, w / 2, by + 14, 12, '#ffe9a8', 'center', inner - 16);
      }
      // 固定HUDは描画座標を縮小しない。短い画面はダイアログ部分のみスクロール。
      this.rect(0, 0, w, 67, '#07131deb');
      this.text(`PIONEER / 富士の聖域${this.phase === 'title' ? '' : adult ? ' 💼社会人' : ' 🎒高校生'}`, pad, 18, 12, '#f5d58a', 'left');
      this.text(`${this.year} · 第${this.chapterIndex + 1}章 / 10`, w - pad, 18, 12, '#fff', 'right');
      this.text(`HP ${this.stats.hp}   絆 ${this.stats.bond}   町 ${this.stats.village}`, pad, 40, 12, '#deefef', 'left');
      this.text(`資産 ${this.stats.assets.toLocaleString()}万 ｜ G ${this.stats.gold.toLocaleString()}`, pad, 57, 12, '#ffe4a1', 'left');
      this.buttons = [];
      if (this.phase === 'choice') {
        if (!this.drawerOpen) {
          const top = Math.max(73, h - 54);
          this.rect(0, top, w, h - top, '#071321f5');
          this.storyCard(pad, top + 8, inner, 38, '#73d8cb', () => this.toggleQuestDrawer(true), 'drawer-open');
          this.text(`💬 第${this.chapterIndex + 1}章「${chapter.title}」の選択肢カードを開く（島クリック・十字キーで移動）`, w / 2, top + 27, 12, '#fff0c4', 'center', inner - 20);
          return;
        }
        const top = Math.max(73, this.cityBottom), available = h - top;
        this.storyScrollMax = Math.max(0, panelHeight - available);
        this.storyScroll = clamp(this.storyScroll || 0, 0, this.storyScrollMax);
        this.rect(0, top, w, available, '#071321fa');
        this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(0, top, w, available); this.ctx.clip();
        let y = top + 21 - this.storyScroll;
        this.text(chapter.title, pad + 12, y, 18, '#ffe4a1', 'left'); y += 27;
        if (ev) {
          const eh = this.storyLines(eventLine, inner - 24).length * 16;
          const pulse = 0.6 + Math.sin(this.time * 5) * 0.25;
          this.ctx.globalAlpha = pulse; this.rect(pad, y - 10, inner, eh + 4, '#7a2a1c'); this.ctx.globalAlpha = 1;
          this.rect(pad, y - 10, 4, eh + 4, '#ff8a5c');
          y += this.storyText(eventLine, pad + 12, y, inner - 24, 12, '#ffe0c8') + 8;
        }
        y += this.storyText(chapter.prompt, pad + 12, y, inner - 24) + 8;
        chapter.choices.forEach((choice, i) => {
          const x = narrow ? pad : pad + i * (cw + gap), cy = y + (narrow ? i * (cardHeight + gap) : 0);
          this.storyCard(x, cy, cw, cardHeight, ['#edcc7e', '#73d8cb', '#e5a0ac'][i], () => this.chooseOption(i), `choice-${i}`);
          let ty = cy + 18;
          for (const [line, color] of cardLines(choice, i)) {
            ty += this.storyText(line, x + 13, ty, cw - 26, 12, color) + 4;
          }
        });
        this.ctx.restore();
        this.buttons = this.buttons.map(b => ({ ...b, y: Math.max(top, b.y), h: Math.max(0, Math.min(h, b.y + b.h) - Math.max(top, b.y)) })).filter(b => b.h > 0);
        if (this.storyScrollMax > 0) {
          this.rect(w - 5, top, 4, available, '#2e4556');
          this.rect(w - 5, top + (available - 30) * this.storyScroll / this.storyScrollMax, 4, 30, '#f5d58a');
          this.text('↕ スクロール / キー1・2・3で選択', w / 2, top - 9, 12, '#fff');
        }
      } else if (this.phase === 'result') {
        const res = this.result, choice = res.choice, top = Math.max(74, Math.min(h * 0.58, h - 230));
        this.rect(0, top, w, h - top, '#071321f5');
        let y = top + 23;
        if (res.tier !== undefined) {
          const color = ['#ffe27a', '#bdf5d8', '#ff9a8a'][res.tier];
          y += this.storyText(TIER_TEXT[this.playMode][res.tier], pad, y, inner, 18, color) + 6;
          if (res.event) y += this.storyText(`事件：${res.event.name} ／ 選んだ道：${choice.label}`, pad, y, inner, 12, '#ffb98a') + 6;
          y += this.storyText(res.tier === 2 ? (adult ? '外部環境が逆風に。投資は回収しきれず、施設は最小規模に留まった。' : '事件のせいでうまくいかなかった…。でも次の章で取り返せる！') : choice.outcome, pad, y, inner, 14, '#fff') + 8;
        } else {
          y += this.storyText(['✨ CRITICAL SUCCESS!! 新施設建設＆資産急増！', '👍 GOOD CHOICE!', '💦 PINCH! 体力を消耗…'][res.index], pad, y, inner, 18, '#ffe4a1') + 12;
          y += this.storyText(choice.outcome, pad, y, inner, 14, '#fff') + 8;
        }
        this.storyText(`${choice.building} ｜ ${deltaText(res.delta || choice.delta)}`, pad, y, inner);
        this.storyCard(pad, h - 50, inner, 38, '#f5d58a', () => this.nextChapter(), 'next');
        this.text(this.chapterIndex === 9 ? '▶ エンディングへ進む（Enter）' : '▶ 次の章（次の年代）へ進む（Enter）', w / 2, h - 31, 12, '#fff0c4');
      } else if (this.phase === 'title') {
        const top = Math.max(74, this.cityBottom);
        this.rect(0, top, w, h - top, '#071321f5');
        this.text('2026 → 2076　50年開拓シミュレーション', w / 2, top + 24, narrow ? 15 : 20, '#ffe4a1', 'center', inner);
        this.text('モードを選んでスタート（キー1・2でも選べます）', w / 2, top + 50, 12, '#d5e4ee', 'center', inner);
        const modes = [
          ['student', '🎒 高校生モード', 'やさしい言葉で、町づくりと未来の仕事を体験。', '#73d8cb'],
          ['adult', '💼 社会人モード', '利回り・金利・人件費・補助金など実務の判断で、事業と資産を50年運用。', '#edcc7e']
        ];
        const bw = narrow ? inner : (inner - gap) / 2;
        const bh = narrow ? clamp((h - top - 70 - 30 - gap) / 2, 44, 96) : Math.max(64, Math.min(96, h - top - 110));
        modes.forEach(([key, name, desc, accent], i) => {
          const x = narrow ? pad : pad + i * (bw + gap), by = top + 70 + (narrow ? i * (bh + gap) : 0);
          this.storyCard(x, by, bw, bh, accent, () => this.setPlayMode(key), `mode-${key}`);
          this.text(`${i + 1}. ${name}`, x + 14, bh < 70 ? by + bh / 2 : by + 20, 16, '#fff0c4', 'left');
          if (bh >= 70) this.storyText(desc, x + 14, by + 44, bw - 28, 12, '#d5e4ee');
        });
        if (this.eventsOn) this.text('⚠️ 毎年ランダム事件（金利上昇・大地震・資材高騰…）が発生。同じ選択でも結果は毎回ちがう！', w / 2, h - 18, 12, '#ffb98a', 'center', inner);
      } else {
        const rank = this.endingRank(), top = Math.max(74, Math.min(h * 0.4, h - 240));
        this.rect(0, top, w, h - top, '#071321f2');
        this.text(`2076 · RANK ${rank}`, w / 2, top + 28, 28, '#ffe4a1');
        const titles = adult
          ? { S: '地域を100年動かす事業家', A: '堅実に資産を築いた経営者', B: '荒波を越えたプレイヤー', C: '次こそ勝ちにいく挑戦者' }
          : { S: '共創の聖域を築いた開拓王', A: '未来へ灯をつなぐ町の守り人', B: '歩み続けた開拓者', C: '再出発を選べる旅人' };
        this.text(titles[rank], w / 2, top + 64, 16, '#fff', 'center', inner);
        const greats = this.history.filter(r => r && r.tier === 0).length, fails = this.history.filter(r => r && r.tier === 2).length;
        this.text(`総資産 ${this.stats.assets.toLocaleString()}万円 · ${this.buildings.length}施設${this.eventsOn ? ` · 大成功${greats}回 / 失敗${fails}回` : ''}`, w / 2, top + 100, 14, '#9ee5db', 'center', inner);
        this.storyText(this.buildings.map(b => b.name).join(' / '), pad, top + 126, inner, 12);
        this.storyCard(pad, h - 50, inner, 38, '#f5d58a', () => this.restartGame(), 'restart');
        this.text('🔄 最初からもう一度プレイ', w / 2, h - 31, 12, '#fff0c4');
      }
    }
    random() { this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0; return this.randomState / 4294967296; }
    get year() { return this.state.year; }
    set year(v) { this.setState({ year: v }); }
    get choiceMode() { return this.state.choiceMode; }
    set choiceMode(v) { this.setState({ choiceMode: v }); }
    get era() { return clamp(Math.floor((this.year - 2025) / 10), 0, 4); }
    setState(next = {}) {
      if (this.destroyed) return this;
      const s = { ...this.state };
      if (next.year !== undefined) {
        if (!Number.isFinite(next.year)) throw new TypeError('year は有限の数値にしてください');
        s.year = clamp(Math.round(next.year), 2026, 2076);
      }
      if (next.choiceMode !== undefined) {
        if (!MODES.includes(next.choiceMode)) throw new RangeError('choiceMode が不正です');
        s.choiceMode = next.choiceMode;
      }
      if (next.season !== undefined) {
        if (next.season !== 'auto' && !SEASONS.includes(next.season)) throw new RangeError('season が不正です');
        s.season = next.season;
      }
      if (next.timeOfDay !== undefined) {
        if (next.timeOfDay !== null && !Number.isFinite(next.timeOfDay)) throw new TypeError('timeOfDay が不正です');
        s.timeOfDay = next.timeOfDay === null ? null : ((next.timeOfDay % 1) + 1) % 1;
      }
      const changedMode = s.choiceMode !== this.choiceMode;
      const changedYear = s.year !== this.year;
      this.state = s;
      if (changedYear) {
        this.target = s.year - 2026;
        if (this.scene === 'story') {
          this.chapterIndex = Math.max(0, CHAPTERS.findLastIndex(c => c.year <= s.year));
          this.result = this.history[this.chapterIndex] || null;
          if (this.result) this.result.age = 0;
          this.phase = this.result ? 'result' : 'choice'; this.storyScroll = 0;
          this.pickEvent();
          this.position = this.target;
        } else if (this.initialized) {
          this.dice = { age: 0, face: 1 + Math.floor(this.random() * 6) };
          this.transition = 2.4; this.scene = 'board';
          this.triggerBurst(`${s.year}年へ！ WORLD EVOLUTION`);
        }
      }
      if (this.initialized && this.scene !== 'story' && changedMode) { this.startBattle(); this.executeBattleCommand(s.choiceMode); }
      if (this.initialized) { this.notifyState(); this.render(); }
      return this;
    }
    resize() {
      if (this.destroyed) return;
      const r = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, r.width || this.original.width || 960);
      this.height = Math.max(1, r.height || this.original.height || 640);
      const cap = Number.isFinite(this.options.maxDpr) ? clamp(this.options.maxDpr, 1, 3) : 2;
      this.dpr = Math.min(global.devicePixelRatio || 1, cap);
      if (r.width === this.canvas.width && r.height === this.canvas.height) this.dpr = 1;
      this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
      this.short = this.height < 500;
      this.top = this.short ? (this.width < 720 ? 168 : 124) : (this.width < 720 ? 210 : 158);
      this.bottom = this.height - 78; this.chunk = this.short ? 8 : 12;
      this.mid = (this.top + this.bottom) / 2;
      this.render();
    }
    start() {
      if (this.running || this.destroyed) return this;
      this.running = true; this.last = null;
      const tick = stamp => {
        if (!this.running || this.destroyed) return;
        this.update(this.last === null ? 0 : Math.min((stamp - this.last) / 1000, 0.1));
        this.last = stamp; this.render(); this.frame = global.requestAnimationFrame(tick);
      };
      this.frame = global.requestAnimationFrame(tick); return this;
    }
    stop() { this.running = false; global.cancelAnimationFrame(this.frame); return this; }
    destroy() {
      if (this.destroyed) return;
      this.stop(); this.destroyed = true;
      if (this.observer) this.observer.disconnect();
      global.removeEventListener('resize', this.onResize);
      this.canvas.removeEventListener('wheel', this.onWheel);
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('keydown', this.onKey);
      if (this.canvas.setAttribute) {
        if (this.original.tabindex === null) this.canvas.removeAttribute('tabindex');
        else this.canvas.setAttribute('tabindex', this.original.tabindex);
      }
      this.canvas.removeEventListener('click', this.onClick);
      this.canvas.removeEventListener('pointermove', this.onMove);
      this.canvas.removeEventListener('pointerleave', this.onLeave);
      this.canvas.style.cursor = this.original.cursor;
      this.effects.length = this.popups.length = this.buttons.length = 0;
    }
    setGameScene(scene) {
      if (!['board', 'battle', 'roulette', 'story'].includes(scene)) throw new RangeError('scene が不正です');
      if (this.destroyed) return this;
      if (scene === 'battle' && !this.battle) return this.startBattle();
      if (scene === 'roulette' && !this.roulette) return this.spinRoulette();
      this.scene = scene; this.notifyState(); this.render(); return this;
    }
    rollDice() {
      if (this.destroyed) return false;
      this.scene = 'board';
      if (this.dice || Math.abs(this.position - this.target) > 0.001) return false;
      if (this.target >= 50) { this.triggerBurst('2076 LEGEND COMPLETE！'); return false; }
      const face = 1 + Math.floor(this.random() * 6);
      this.dice = { age: 0, face }; this.target = Math.min(50, this.target + face);
      const oldEra = this.era; this.state.year = this.target + 2026;
      if (oldEra !== this.era) this.transition = 2.4;
      this.notifyState(); return face;
    }
    startBattle(bossIndex = Math.min(this.era, 3)) {
      if (!Number.isInteger(bossIndex) || bossIndex < 0 || bossIndex >= BOSSES.length) throw new RangeError('bossIndex は0〜3です');
      if (this.destroyed) return this;
      this.scene = 'battle';
      if (this.battle && this.battle.hp > 0 && !this.battle.defeated && this.battle.index === bossIndex) return this;
      this.stats.hp = Math.max(50, this.stats.hp);
      this.battle = { index: bossIndex, hp: 9999, maxHp: 9999, age: 0, attack: null, victory: 0, defeated: false };
      this.shake = 0.5; this.notifyState(); return this;
    }
    executeBattleCommand(mode) {
      const commands = { antifragile: 'slash', standard: 'combo', relapse: 'barrier', slash: 'slash', combo: 'combo', barrier: 'barrier' };
      if (!commands[mode]) throw new RangeError('command が不正です');
      if (this.destroyed) return false;
      if (!this.battle) this.startBattle();
      this.scene = 'battle'; const b = this.battle;
      if (b.attack || b.hp <= 0 || b.defeated) return false;
      const kind = commands[mode], damage = kind === 'slash' ? 9999 : kind === 'combo' ? 3000 + this.stats.allies * 600 : 1800;
      b.attack = { kind, damage, age: 0, hit: false }; this.shake = 0.3; return true;
    }
    spinRoulette() {
      if (this.destroyed) return false;
      this.scene = 'roulette';
      if (this.roulette && !this.roulette.done) return false;
      const result = Math.floor(this.random() * 6), start = this.roulette ? this.roulette.angle : 0;
      const landing = -Math.PI / 2 - (result + 0.5) * TAU / 6;
      const end = start + TAU * 6 + ((landing - start) % TAU + TAU) % TAU;
      this.roulette = { age: 0, start, end, angle: start, result, done: false };
      this.notifyState(); return true;
    }
    tileType(i) { return i === 50 || i % 10 === 9 ? 4 : i % 7 === 5 ? 1 : i % 5 === 3 ? 2 : i % 4 === 2 ? 3 : 0; }
    land() {
      const i = this.target, type = this.tileType(i);
      if (this.claimed.has(i)) return;
      this.claimed.add(i); this.emit(this.width / 2, this.mid, 30, 'coin');
      if (type === 1) this.startBattle();
      else if (type === 2) this.spinRoulette();
      else if (type === 3) { this.stats.village++; this.stats.level++; this.triggerBurst(`神社＆町 LEVEL UP！ Lv.${this.stats.village}`); }
      else { this.stats.gold += type === 4 ? 10000 : 1500; this.stats.assets += 100;
        this.triggerBurst(i === 50 ? '2076 LEGEND COMPLETE！ +10,000 GOLD' : type === 4 ? 'MILESTONE！ +10,000 GOLD' : '+1,500 GOLD / 資産 +100万'); }
    }
    triggerBurst(text = 'LEVEL UP！') {
      if (this.destroyed) return this;
      this.popups.push({ text: String(text), age: 0 }); this.popups = this.popups.slice(-5);
      this.emit(this.width / 2 || 480, this.mid || 320, 24, 'spark'); this.shake = 0.25; return this;
    }
    emit(x, y, count, type) {
      for (let i = 0; i < count; i++) {
        const a = this.random() * TAU, speed = 80 + this.random() * 260;
        this.effects.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 170,
          age: 0, life: 1.5 + this.random(), color: COLORS[i % 6], type, phase: this.random() * TAU });
      }
      this.effects = this.effects.slice(-240);
    }
    update(dt) {
      if (this.destroyed || !Number.isFinite(dt) || dt <= 0) return;
      // 長いフレームも小刻みに処理し、着地・命中・報酬の一度だけの確定を保証。
      let remaining = Math.min(dt, 30);
      while (remaining > 0) { const step = Math.min(remaining, 0.05); this.step(step); remaining -= step; }
      this.notifyState();
    }
    step(dt) {
      this.time += dt; this.shake = Math.max(0, this.shake - dt); this.transition = Math.max(0, this.transition - dt);
      if (this.scene === 'board') {
        if (this.dice) { this.dice.age += dt; if (this.dice.age >= 1.35) this.dice = null; }
        else if (Math.abs(this.position - this.target) > 0.001) {
          const old = this.position, dir = Math.sign(this.target - old);
          this.position = dir > 0 ? Math.min(this.target, old + dt * 4) : Math.max(this.target, old - dt * 4);
          if (Math.abs(this.position - this.target) < 0.001) this.position = this.target;
          if (Math.floor(old) !== Math.floor(this.position)) { const p = this.tilePoint(Math.round(this.position)); this.emit(p.x, p.y - 30, 6, 'coin'); }
          if (this.position === this.target) this.land();
        }
      }
      for (const building of this.buildings) {
        building.age += dt;
        building.velocity += (-65 * building.bounce - 10 * building.velocity) * dt;
        building.bounce += building.velocity * dt;
      }
      if (this.hero) {
        const ease = Math.min(1, dt * 10);
        this.hero.x += (this.hero.tx - this.hero.x) * ease;
        this.hero.y += (this.hero.ty - this.hero.y) * ease;
        this.hero.jump = Math.max(0, this.hero.jump - dt * 2.2);
        this.hero.ring = Math.max(0, this.hero.ring - dt * 1.4);
      }
      if (this.heroBanner) {
        this.heroBanner.age += dt;
        if (this.heroBanner.age >= 3.2) this.heroBanner = null;
      }
      if (this.orbs) {
        for (const orb of this.orbs) if (orb.cooldown > 0) orb.cooldown = Math.max(0, orb.cooldown - dt);
      }
      if (this.scene === 'story' && this.phase === 'result') {
        this.result.age += dt;
        if (this.result.age >= 2.2 && !this.eventsOn) this.nextChapter();
      }
      const b = this.battle;
      if (b) {
        b.age += dt;
        if (b.attack) {
          const a = b.attack; a.age += dt;
          if (a.age >= 0.65 && !a.hit) {
            a.hit = true; b.hp = Math.max(0, b.hp - a.damage); this.shake = 0.65;
            if (a.kind === 'barrier') this.stats.hp = Math.min(100, this.stats.hp + 30);
            this.triggerBurst(`-${a.damage.toLocaleString('en-US')} DMG!!`);
            if (!b.hp) {
              b.victory = 0.001; this.stats.gold += 9999; this.stats.level++; this.stats.wins++;
              this.emit(this.width * 0.75, this.mid, 40, 'coin');
            } else { this.stats.hp = Math.max(0, this.stats.hp - (a.kind === 'barrier' ? 4 : 22)); b.defeated = this.stats.hp === 0; }
          }
          if (a.age >= 1.8) b.attack = null;
        }
        if (b.victory) b.victory += dt;
      }
      const r = this.roulette;
      if (r && r.done) r.age += dt;
      if (r && !r.done) {
        r.age += dt; const t = clamp(r.age / 4.8, 0, 1);
        r.angle = r.start + (r.end - r.start) * (1 - Math.pow(1 - t, 4));
        if (t === 1) {
          r.done = true;
          if (r.result === 0) this.stats.village *= 3;
          if (r.result === 1) this.stats.allies += 3;
          if (r.result === 2) this.stats.assets += 5000;
          if (r.result === 3) { this.stats.level += 3; this.stats.village++; }
          if (r.result === 4) this.stats.hp = 100;
          if (r.result === 5) { this.stats.gold += 50000; this.stats.assets += 10000; this.stats.level += 5; }
          this.emit(this.width / 2, this.bottom - 25, 65, 'coin'); this.emit(this.width / 2, this.mid, 65, 'confetti');
          this.triggerBurst(PRIZES[r.result]);
        }
      }
      for (const p of this.effects) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }
      this.effects = this.effects.filter(p => p.age < p.life);
      for (const p of this.popups) p.age += dt;
      this.popups = this.popups.filter(p => p.age < 2.8);
    }
    // 描画プリミティブ。文字は変形せず常に12 CSS px以上で描く。
    rect(x, y, w, h, color) { this.ctx.fillStyle = color; this.ctx.fillRect(x, y, w, h); }
    poly(points, color, stroke) {
      const c = this.ctx; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      c.fillStyle = color; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
    }
    ellipse(x, y, rx, ry, color) { const c = this.ctx; c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); c.fillStyle = color; c.fill(); }
    text(str, x, y, size = 16, color = '#fff', align = 'center', maxWidth) {
      const c = this.ctx; c.font = `800 ${Math.max(12, size)}px system-ui, sans-serif`; c.fillStyle = color;
      c.textAlign = align; c.textBaseline = 'middle';
      if (!maxWidth) { c.fillText(String(str), x, y); return; }
      let line = '', lines = [];
      for (const ch of String(str)) { if (line && c.measureText(line + ch).width > maxWidth) { lines.push(line); line = ''; } line += ch; }
      lines.push(line); lines.forEach((s, i) => c.fillText(s, x, y + (i - (lines.length - 1) / 2) * (size + 3)));
    }
    button(label, x, y, w, action, enabled = true, h = 36) {
      this.rect(x, y, w, h, enabled ? '#101c38ed' : '#273044aa');
      this.ctx.strokeStyle = enabled ? ERAS[this.era][3] : '#586175'; this.ctx.lineWidth = 1; this.ctx.strokeRect(x, y, w, h);
      this.text(label, x + w / 2, y + h / 2, 12, enabled ? '#fff' : '#a4aec5', 'center', w - 10);
      if (enabled) this.buttons.push({ x, y, w, h, action });
    }
    pick(e) {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
      const x = (e.clientX - r.left) * this.width / r.width, y = (e.clientY - r.top) * this.height / r.height;
      return this.buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    }
    render() {
      if (this.destroyed || !this.width) return;
      this.bottom = this.height - (this.width < 600 && this.scene === 'battle' ? 146 : 78);
      this.mid = (this.top + this.bottom) / 2;
      const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.width, this.height); this.buttons = [];
      if (this.scene === 'story') { this.drawStory(); return; }
      c.save(); if (this.shake) c.translate(Math.sin(this.time * 87) * this.shake * 12, Math.cos(this.time * 93) * this.shake * 7);
      this.world();
      if (this.scene === 'board') this.drawBoard();
      if (this.scene === 'battle') this.drawBattle();
      if (this.scene === 'roulette') this.drawRoulette();
      for (const p of this.effects) {
        c.globalAlpha = Math.max(0, 1 - p.age / p.life);
        if (p.type === 'coin') { this.ellipse(p.x, p.y, 3 + Math.abs(Math.sin(p.age * 12 + p.phase)) * 5, 9, '#ffdf69'); this.ellipse(p.x, p.y, 2, 6, '#fff2b0'); }
        else { c.save(); c.translate(p.x, p.y); c.rotate(p.age * 5); this.rect(-3, -5, 6, 10, p.color); c.restore(); }
      }
      c.globalAlpha = 1; c.restore();
      if (this.transition > 0) {
        c.globalAlpha = Math.min(0.45, this.transition / 5); this.rect(0, 0, this.width, this.height, ERAS[this.era][3]); c.globalAlpha = 1;
        this.text(`ERA ${this.era + 1} · WORLD EVOLUTION`, this.width / 2, this.mid - 60, this.width < 600 ? 20 : 36, '#fff', 'center', this.width - 24);
      }
      this.hud();
      const p = this.popups[this.popups.length - 1];
      if (p) { c.globalAlpha = Math.min(1, (2.8 - p.age) * 2); this.rect(12, this.bottom - 44, this.width - 24, 42, '#090f27e8');
        this.text(p.text, this.width / 2, this.bottom - 23, 16, '#ffeb9b', 'center', this.width - 40); c.globalAlpha = 1; }
    }
    world() {
      const c = this.ctx, w = this.width, h = this.height, e = this.era, theme = ERAS[e], t = this.time;
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, theme[1]); sky.addColorStop(1, theme[2]); this.rect(0, 0, w, h, sky);
      const cycle = Number.isFinite(this.options.cycleSeconds) && this.options.cycleSeconds > 0 ? this.options.cycleSeconds : 120;
      const tod = this.state.timeOfDay === null ? (t / cycle) % 1 : this.state.timeOfDay;
      this.rect(0, 0, w, h, `rgba(0,8,30,${0.18 * (1 - Math.cos(tod * TAU))})`);
      if (e >= 3) for (let i = 0; i < 70; i++) this.ellipse((i * 137.3) % w, (i * 73.9) % h, 1 + Math.sin(t * 2 + i) * 0.7, 1.3, '#f3e9ff');
      if (e === 4) for (let i = 0; i < 4; i++) {
        c.beginPath(); c.moveTo(-20, h * 0.3 + i * 30); c.bezierCurveTo(w * 0.3, Math.sin(t + i) * 100, w * 0.6, h * 0.5, w + 20, h * 0.2 + i * 35);
        c.strokeStyle = ['#65ffd933', '#b3a0ff44', '#ffd97944', '#95a9ff44'][i]; c.lineWidth = 25; c.stroke();
      }
      this.ellipse(w * 0.8, this.top + 28, e === 4 ? 27 : 42, e === 4 ? 27 : 42, e === 1 ? '#b6ffeb' : '#ffe2ae');
      if (e === 2) {
        this.poly([[w * 0.17, h * 0.6], [w * 0.52, this.top - 20], [w * 0.86, h * 0.6]], '#70658c');
        this.poly([[w * 0.43, this.top + 46], [w * 0.52, this.top - 20], [w * 0.61, this.top + 46], [w * 0.54, this.top + 28]], '#fff2db');
        this.rect(0, h * 0.6, w, h * 0.4, '#408d9b');
        for (let i = 0; i < 12; i++) this.rect(w * 0.2 + Math.sin(t + i) * 20, h * 0.62 + i * 12, w * 0.6, 1, '#ffdda744');
      }
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * w / 9, y = this.top + 65 + (i % 3) * 23 + (e === 4 ? Math.sin(t + i) * 15 : 0);
        if (e === 4) this.poly([[x - 50, y + 20], [x, y + 75], [x + 50, y + 20], [x, y - 3]], '#927240');
        this.building(x, y, e, 0.65 + (i % 3) * 0.12);
      }
      if (e === 0 || e === 2 || e === 4) this.torii(w * 0.16, this.top + 75, e === 2 ? 1.2 : 0.85, e === 4 ? '#f8ce61' : '#ee6245');
      if (e === 1) for (let i = 0; i < 3; i++) {
        const x = w * (0.18 + i * 0.3), y = this.top + 60 + Math.sin(t * 2 + i) * 15;
        this.actor(x, y, 1, 0.65); this.poly([[x, y + 5], [x - 30 + Math.sin(t * 4) * 20, y + 70], [x + 3, y + 5]], '#8affcf88');
      }
      if (e === 3) for (let i = 0; i < 4; i++) {
        const x = ((t * (28 + i * 4) + i * w / 4) % (w + 100)) - 50, y = this.top + 30 + i * 24;
        this.ellipse(x, y, 26, 8, '#e5f9ff'); this.rect(x - 40, y - 5, 80, 3, '#6cf7ff');
        for (const dx of [-34, 34]) this.ellipse(x + dx, y - 8, 13 + Math.sin(t * 40) * 3, 2, '#d4fffc');
        this.poly([[x - 10, y + 5], [x - 50, y + 15], [x - 14, y + 11]], '#75e9ff66');
      }
      const season = this.state.season === 'auto' ? SEASONS[Math.floor(t / 18) % 4] : this.state.season;
      for (let i = 0; i < (e === 4 ? 65 : 22); i++) {
        const x = ((i * 97 + t * (12 + i % 9)) % (w + 20)) - 10, y = (i * 59 + t * 17) % h;
        if (e === 2) { this.rect(x, h - y, 8, 12, '#ffd482aa'); this.ellipse(x + 4, h - y + 6, 11, 15, '#ffd48222'); }
        else this.ellipse(x, y, season === 'winter' ? 2 : 4, 2, season === 'winter' ? '#fff' : season === 'autumn' ? '#ffad67aa' : season === 'summer' ? '#95ffcd88' : '#ffd0e9bb');
      }
    }
    building(x, y, era, scale) {
      const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
      if (era === 1) {
        this.ellipse(0, 0, 40, 33, '#73e9d5'); this.rect(-40, 0, 80, 15, '#267d88');
        for (let j = 0; j < 5; j++) this.rect(-34 + j * 14, -15, 3, 24, '#e3fff6');
        this.rect(-48, -43, 96, 4, '#d9fff4'); this.rect(-48, -43, 4, 65, '#b2fff1'); this.rect(44, -43, 4, 65, '#b2fff1');
        this.rect(Math.sin(this.time * 3 + x) * 30, -38, 4, 31, '#ffdf88');
      } else if (era === 3) {
        this.rect(-18, -60, 36, 85, '#2f4b85');
        for (let j = 0; j < 6; j++) this.rect(-13, -53 + j * 12, 26, 4, '#68f8ff');
        this.poly([[-45, -62], [17, -82], [48, -63], [-14, -43]], '#173c70', '#75e6ff');
      } else {
        this.rect(-30, -20, 60, 45, era === 4 ? '#dfb656' : era === 2 ? '#ba4f42' : '#ddaa7e');
        this.poly([[-44, -22], [0, -52], [44, -22]], era === 4 ? '#ffe39a' : '#484761');
        if (era >= 2) this.poly([[-39, -49], [0, -72], [39, -49]], era === 4 ? '#e4b84b' : '#782e44');
        this.rect(-9, 0, 18, 25, '#4c3445'); this.rect(14, -11, 10, 12, '#ffe6a2');
      }
      c.restore();
    }
    torii(x, y, s, color) {
      const c = this.ctx; c.save(); c.translate(x, y); c.scale(s, s);
      this.rect(-36, -58, 9, 82, color); this.rect(27, -58, 9, 82, color);
      this.rect(-49, -63, 98, 10, color); this.rect(-42, -40, 84, 8, color);
      this.poly([[-56, -74], [0, -67], [56, -74], [48, -62], [-48, -62]], '#332844'); c.restore();
    }
    tilePoint(index) {
      const page = Math.floor(Math.min(50, this.position) / this.chunk) * this.chunk, n = index - page, row = Math.floor(n / 4);
      const col = row % 2 === 0 ? n % 4 : 3 - n % 4, spacing = Math.min(135, (this.width - 56) / 4.2);
      const pitch = Math.max(28, Math.min(74, (this.bottom - this.top - (this.short ? 100 : 145)) / (this.chunk / 4 - 1)));
      return { x: this.width / 2 + (col - 1.5) * spacing + (row - 1) * spacing * 0.24, y: this.top + (this.short ? 42 : 108) + row * pitch, u: spacing * 0.45 };
    }
    drawBoard() {
      const page = Math.floor(this.position / this.chunk) * this.chunk, end = Math.min(50, page + this.chunk - 1), c = this.ctx;
      for (let i = page; i < end; i++) {
        const a = this.tilePoint(i), b = this.tilePoint(i + 1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
        c.strokeStyle = '#fff1c990'; c.lineWidth = 9; c.stroke();
      }
      for (let i = page; i <= end; i++) {
        const { x, y, u } = this.tilePoint(i), type = this.tileType(i), v = u * 0.43;
        let color = COLORS[type];
        if (type === 4) { color = c.createLinearGradient(x - u, y, x + u, y); COLORS.forEach((co, j) => color.addColorStop(j / 5, co)); }
        this.poly([[x - u, y], [x, y + v], [x + u, y], [x + u, y + 17], [x, y + v + 17], [x - u, y + 17]], '#263853');
        this.poly([[x, y - v], [x + u, y], [x, y + v], [x - u, y]], color, i === this.target ? '#fff' : '#ffffff66');
        this.text(2026 + i, x, y - 3, 12, '#14203c');
        this.text(['資産', 'BOSS', '宝箱', '町UP', 'GOAL'][type], x, y + 14, 12, '#14203c');
      }
      const lo = Math.floor(this.position), hi = Math.min(50, lo + 1), f = this.position - lo;
      const a = this.tilePoint(lo), b = this.tilePoint(hi), moving = this.position !== this.target;
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f - 30 - (moving ? Math.sin(f * Math.PI) * 55 : Math.sin(this.time * 3) * 4);
      this.actor(x - 25, y - 6, 1, 0.72); this.actor(x + 25, y - 8, 2, 0.72); this.actor(x, y, 0, 1);
      this.text(`${2026 + page} — ${2026 + end} ｜ 青:資産 赤:戦闘 黄:宝箱 緑:町 虹:節目`, this.width / 2, this.top + 16, 12, '#fff', 'center', this.width - 24);
      if (this.dice) this.drawDie();
    }
    actor(x, y, kind, s = 1) {
      const c = this.ctx; c.save(); c.translate(x, y); c.scale(s, s);
      this.ellipse(0, 29, 18, 5, '#081b3555');
      this.poly([[-10, 0], [-20, 23], [16, 21], [9, 0]], kind === 0 ? '#e75565' : '#7175dd');
      this.rect(-9, -1, 18, 23, kind === 1 ? '#86e4ed' : kind === 2 ? '#b1a0ff' : '#446bdd');
      this.rect(-10, 19, 7, 12, '#24304e'); this.rect(3, 19, 7, 12, '#24304e');
      if (kind === 1) { this.rect(-13, -25, 26, 23, '#d4ffff'); this.rect(-9, -19, 18, 7, '#244375'); this.rect(-2, -33, 4, 8, '#6eeeff'); }
      else { this.ellipse(0, -14, 12, 14, '#ffceac'); this.poly([[-13, -16], [-10, -31], [11, -28], [16, -15], [0, -22]], kind === 0 ? '#302b4d' : '#ece1c3'); }
      this.rect(-6, -16, 3, 4, '#193344'); this.rect(5, -16, 3, 4, '#193344');
      if (kind === 0) { this.rect(16, -12, 5, 36, '#f8edbf'); this.rect(11, 10, 15, 4, '#ffd375'); }
      c.restore();
    }
    drawDie() {
      const c = this.ctx, d = this.dice, x = this.width / 2, y = this.mid - 20;
      c.save(); c.translate(x, y); c.rotate(d.age < 1 ? Math.sin(d.age * 16) * 0.6 : 0);
      this.poly([[-48, -48], [48, -48], [65, -63], [-31, -63]], '#f4d58e');
      this.poly([[48, -48], [65, -63], [65, 32], [48, 48]], '#b89465'); this.rect(-48, -48, 96, 96, '#fff9e9');
      const face = d.age < 1 ? 1 + Math.floor(d.age * 24) % 6 : d.face;
      const dots = { 1: [[0, 0]], 2: [[-23, -23], [23, 23]], 3: [[-23, -23], [0, 0], [23, 23]],
        4: [[-23, -23], [23, -23], [-23, 23], [23, 23]], 5: [[-23, -23], [23, -23], [0, 0], [-23, 23], [23, 23]],
        6: [[-23, -25], [23, -25], [-23, 0], [23, 0], [-23, 25], [23, 25]] };
      dots[face].forEach(([dx, dy]) => this.ellipse(dx, dy, 8, 8, '#d74757')); c.restore();
      this.text(d.age < 1 ? '運命のサイコロ！' : `${d.face}！ ${this.year}年へ進む`, x, y + 78, 20, '#fff', 'center', this.width - 24);
    }
    drawBattle() {
      const b = this.battle; if (!b) return;
      const c = this.ctx, w = this.width, narrow = w < 600, y = this.mid + 12;
      this.rect(0, this.top, w, this.bottom - this.top, '#160d32a8');
      for (let i = 0; i < 18; i++) { const off = (this.time * 190 + i * 47) % w; this.poly([[off, this.top + i * 16], [off + 100, this.top + i * 16 + 2], [off, this.top + i * 16 + 4]], '#bc7dce33'); }
      this.text(BOSSES[b.index], w * 0.65, this.top + 24, narrow ? 14 : 20, '#fff', 'center', w * 0.62);
      this.rect(w * 0.39, this.top + 49, w * 0.55, 14, '#331a3d'); this.rect(w * 0.39, this.top + 49, w * 0.55 * b.hp / b.maxHp, 14, '#ff6686');
      this.text(`BOSS HP ${b.hp} / ${b.maxHp}`, w * 0.66, this.top + 78, 12);
      this.actor(w * 0.17, y + 35, 0, narrow ? 1.1 : 1.7); this.actor(w * 0.27, y + 67, 1, narrow ? 0.9 : 1.3); this.actor(w * 0.09, y + 83, 2, 1);
      if (b.hp > 0) {
        c.save(); c.translate(w * 0.74 + Math.sin(this.time * 3) * 7, y + Math.sin(this.time * 2) * 9);
        const s = Math.min(1.25, w / 650, Math.max(0.45, (this.bottom - this.top) / 320)); c.scale(s, s);
        const color = ['#7e7289', '#a64a72', '#6456af', '#3b8c9c'][b.index];
        this.ellipse(0, 88, 100, 16, '#0006');
        if (b.index === 2) { this.poly([[-35, -40], [-165, -100], [-132, 54], [-44, 13]], '#a67cd5'); this.poly([[35, -40], [165, -100], [132, 54], [44, 13]], '#a67cd5'); }
        this.poly([[-65, -45], [-90, 40], [-50, 83], [55, 83], [94, 35], [62, -47]], color, '#e4b2e6');
        this.rect(-115, -14, 37, 75, color); this.rect(80, -14, 37, 75, color);
        this.poly([[-52, -53], [-62, -115], [-23, -83], [25, -83], [63, -118], [51, -52], [45, -8], [-45, -8]], color, '#e4b2e6');
        this.rect(-35, -57, 24, 10, '#ffdf60'); this.rect(11, -57, 24, 10, '#ffdf60'); this.poly([[-25, -26], [25, -26], [0, -14]], '#25162f');
        if (b.index === 1) for (let i = -1; i <= 1; i++) this.poly([[i * 38 - 24, 27], [i * 38, 2], [i * 38 + 24, 27]], '#e2bb91');
        if (b.index === 3) { this.ellipse(0, 35, 24, 24, '#81f6fc'); this.rect(-4, -128, 8, 28, '#ffcb79'); }
        c.restore();
      }
      if (b.attack) {
        const a = b.attack, intensity = Math.sin(clamp(a.age / 1.8, 0, 1) * Math.PI);
        if (a.kind === 'barrier') { c.strokeStyle = '#8cffff'; c.lineWidth = 8; c.beginPath(); c.ellipse(w * 0.18, y + 25, w * 0.16, 85, 0, 0, TAU); c.stroke(); }
        else {
          c.globalAlpha = intensity;
          for (let i = 0; i < (a.kind === 'combo' ? 5 : 3); i++) this.poly([[w * 0.12, y + 100 - i * 25], [w * 0.95, this.top + 75 + i * 25], [w * 0.53, y + 15 + i * 18]], i % 2 ? '#65f4ff' : '#fff2c6');
          c.globalAlpha = 1;
        }
        this.text(a.kind === 'slash' ? '1と9集中！ AI召喚斬り' : a.kind === 'combo' ? '仲間の絆コンボ！' : '聖域バリア！ HP回復', w / 2, y - 45, narrow ? 20 : 30, '#fff5b5', 'center', w - 30);
      }
      if (b.victory) { this.rect(0, y - 48, w, 95, '#21173de8'); this.text('VICTORY!! LEVEL UP!', w / 2, y - 15, narrow ? 24 : 42, '#ffe48a'); this.text('+9,999 GOLD · ボス撃破！', w / 2, y + 25, 16, '#fff'); }
      if (b.defeated) this.text('力尽きた… 再挑戦でHP回復', w / 2, y, 20, '#ffd4df', 'center', w - 24);
    }
    drawRoulette() {
      const r = this.roulette; if (!r) return;
      const c = this.ctx, w = this.width, split = w >= 600;
      const radius = Math.max(36, Math.min(w * 0.25, (this.bottom - this.top - (split ? 40 : 190)) / 2, 170));
      const x = w * (split ? 0.67 : 0.5), y = this.top + radius + 20;
      this.rect(0, this.top, w, this.bottom - this.top, '#140c36a8');
      for (let i = 0; i < 6; i++) {
        const a = r.angle + i * TAU / 6; c.beginPath(); c.moveTo(x, y); c.arc(x, y, radius, a, a + TAU / 6); c.closePath(); c.fillStyle = COLORS[i]; c.fill();
        const mid = a + TAU / 12; this.text(i + 1, x + Math.cos(mid) * radius * 0.73, y + Math.sin(mid) * radius * 0.73, 20, '#17203b');
      }
      c.strokeStyle = '#ffeab0'; c.lineWidth = 7; c.beginPath(); c.arc(x, y, radius, 0, TAU); c.stroke();
      this.ellipse(x, y, radius * 0.24, radius * 0.24, '#17213e'); this.text('運命', x, y, 14, '#ffe49b');
      this.poly([[x - 13, y - radius - 14], [x + 13, y - radius - 14], [x, y - radius + 17]], '#fff9df');
      const chestX = split ? w * 0.88 : x, chestY = split ? this.bottom - 42 : y + radius + 23;
      const open = r.done ? clamp((r.age - 4.8) * 3, 0, 1) : 0;
      this.rect(chestX - 35, chestY, 70, 32, '#c78b32'); this.rect(chestX - 31, chestY + 4, 62, 24, '#f5c75f');
      this.poly([[chestX - 35, chestY], [chestX - 35, chestY - 18 - open * 24], [chestX + 35, chestY - 18 - open * 24], [chestX + 35, chestY]], '#ffe09a', '#c18a34');
      this.rect(chestX - 6, chestY + 6, 12, 17, '#fff1b6');
      if (r.done) this.ellipse(chestX, chestY - 8, 28, 9, '#fff3c5');
      const legendY = split ? this.top + 18 : chestY + 47, pitch = split ? Math.min(29, (this.bottom - this.top - 30) / 6) : 17;
      PRIZES.forEach((p, i) => this.text(`${i + 1}. ${p}`, 14, legendY + i * pitch, 12, r.done && i === r.result ? '#fff1a0' : '#fff', 'left'));
    }
    drawPioneerWorld() {
      const c = this.ctx, w = this.width, h = this.cityBottom || this.height * 0.64, t = this.time;
      c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
      const sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#142942'); sky.addColorStop(0.48, '#6c8997'); sky.addColorStop(0.85, '#f3ce9b'); sky.addColorStop(1, '#95bdaf');
      this.rect(0, 0, w, h, sky);
      const sun = c.createRadialGradient(w * 0.73, h * 0.15, 0, w * 0.73, h * 0.15, w * 0.62);
      sun.addColorStop(0, '#fff9dcdd'); sun.addColorStop(0.15, '#ffe3a54a'); sun.addColorStop(1, '#ffe3a500'); this.rect(0, 0, w, h, sun);
      c.save(); c.globalCompositeOperation = 'screen';
      for (let i = 0; i < 9; i++) {
        const x = w * (0.12 + i * 0.14) + Math.sin(t * 0.15 + i) * 16;
        this.poly([[w * 0.73, -h * 0.1], [x, h], [x + w * 0.065, h]], '#ffe9ae0b');
      }
      c.restore();
      for (let layer = 0; layer < 3; layer++) {
        const ridge = c.createLinearGradient(0, h * 0.2, 0, h * 0.62); ridge.addColorStop(0, ['#6a7a94', '#647f87', '#426b72'][layer]); ridge.addColorStop(1, '#9ab4ae');
        const pts = [[0, h * 0.65]];
        for (let i = 0; i <= 16; i++) pts.push([w * i / 16, h * (0.43 + layer * 0.047 - Math.sin(i * 1.93 + layer) * 0.08)]);
        pts.push([w, h * 0.65]); this.poly(pts, ridge);
      }
      const fx = w * 0.43, fy = h * 0.12, fw = w * 0.29;
      const fuji = c.createLinearGradient(fx - fw, fy, fx + fw, h * 0.6); fuji.addColorStop(0, '#d8c5c0'); fuji.addColorStop(0.4, '#9dabb9'); fuji.addColorStop(0.62, '#7c91a8'); fuji.addColorStop(1, '#b7c7c1');
      this.poly([[fx - fw, h * 0.6], [fx - fw * 0.23, fy + 27], [fx - 15, fy], [fx + 20, fy + 2], [fx + fw * 0.28, fy + 32], [fx + fw, h * 0.6]], fuji);
      this.poly([[fx - fw * 0.23, fy + 27], [fx - 15, fy], [fx + 20, fy + 2], [fx + fw * 0.28, fy + 32], [fx + 25, fy + 24], [fx + 8, fy + 42], [fx - 8, fy + 25], [fx - 30, fy + 34]], '#f7ece0');
      this.poly([[fx + 20, fy + 2], [fx + fw * 0.28, fy + 32], [fx + fw, h * 0.6], [fx + 28, fy + 57]], '#5d748733');
      for (let i = 0; i < 10; i++) {
        const x = ((i * w * 0.21 + t * (2 + i % 3)) % (w * 1.3)) - w * 0.15, y = h * (0.19 + (i % 3) * 0.08);
        c.save(); c.translate(x, y); c.scale(1, 0.24);
        const cloud = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.16); cloud.addColorStop(0, '#fff5df61'); cloud.addColorStop(1, '#fff5df00');
        this.ellipse(0, 0, w * 0.16, w * 0.16, cloud); c.restore();
      }
      const lake = c.createLinearGradient(0, h * 0.48, 0, h); lake.addColorStop(0, '#a8c9c0'); lake.addColorStop(0.3, '#427e89'); lake.addColorStop(1, '#193e53');
      this.rect(0, h * 0.49, w, h * 0.51, lake);
      for (let i = 0; i < 65; i++) {
        const y = h * 0.5 + i * h * 0.009, x = w * 0.73 + Math.sin(i * 2.8 + t) * (i + 5) * 2;
        this.rect(x - 8 - i * 0.4, y, 16 + i * 0.8, 1, '#ffe7b145');
        this.rect((i * 113.2 + Math.sin(t + i) * 7) % w, y + 5, 15 + i % 17, 1, '#c5f4eb30');
      }
      const scale = Math.min(w / 1030, h / 530);
      c.translate(w / 2, h - 10); c.scale(scale, scale); c.translate(0, -380);
      // The entire settlement rests on a sculpted, shaded island, not a flat tile grid.
      this.ellipse(4, 363, 439, 64, '#071d3266');
      this.poly([[-465, 201], [0, 42], [465, 201], [0, 408]], '#374f4a');
      this.poly([[-465, 201], [0, 361], [465, 201], [441, 245], [0, 410], [-440, 244]], '#244943');
      this.poly([[-465, 201], [0, 42], [465, 201], [0, 365]], '#78976b', '#c0c399');
      for (let i = 0; i < 34; i++) {
        const x = Math.sin(i * 12.91) * 390, y = 204 + Math.cos(i * 9.71) * 85;
        this.ellipse(x, y, 2.5, 1, '#d3d6a749');
      }
      this.poly([[-400, 191], [-377, 181], [370, 206], [347, 219]], '#c1bb97');
      this.poly([[-230, 301], [-251, 292], [225, 108], [246, 117]], '#c6c1a1');
      // Water-filled rice terraces, stone banks, and fine planted rows.
      for (let n = 0; n < 3; n++) {
        const x = -340 + n * 37, y = 245 + n * 18;
        this.poly([[x - 55, y], [x, y - 22], [x + 60, y], [x, y + 23]], '#4e6950', '#a0b884');
        this.poly([[x - 47, y - 1], [x, y - 18], [x + 49, y], [x, y + 17]], '#79bdc6');
        for (let row = 0; row < 5; row++) for (let k = 0; k < 5; k++) {
          const px = x - 32 + k * 10 + row * 5, py = y - 5 + row * 4 - k * 2;
          this.rect(px, py - 5, 1.5, 6, '#5d813e'); this.rect(px + 2, py - 3, 1, 4, '#afd77b');
        }
        this.poly([[x - 38, y], [x + 13, y - 12], [x + 37, y - 3], [x - 11, y + 10]], '#f9f7cd24');
      }
      const slots = [[-240,160],[-95,117],[60,111],[220,160],[-200,239],[-57,202],[95,200],[249,252],[80,294],[0,58]];
      const ordered = slots.map((p,id) => ({p,id})).sort((a,b) => a.p[1]-b.p[1]);
      for (const {p,id} of ordered) {
        const b = (this.buildings || []).find(v => v.id === id);
        c.save(); c.translate(p[0], p[1]);
        if (!b || !b.level) { this.poly([[-38,0],[0,-15],[38,0],[0,15]], '#d4dccb30', '#b7c7ae40'); c.restore(); continue; }
        const bounce = typeof b.bounce === 'number' ? b.bounce : 0;
        c.translate(0, -Math.sin(t * 0.8) * (id === 9 ? 5 : 0));
        c.scale(1 + bounce * 0.06, 1 + bounce * 0.1);
        this.drawPioneerLandmark(id, b.level);
        if (b.age < 3) this.drawPioneerPillar(b.age, id);
        c.restore();
      }
      for (let i = 0; i < 14; i++) {
        const x = Math.cos(i * 3.93) * 380, y = 187 + Math.sin(i * 3.93) * 102;
        this.ellipse(x + 3, y + 4, 17, 5, '#183e3d40'); this.rect(x - 2, y - 21, 4, 24, '#765a46');
        this.ellipse(x, y - 25, 15, 17, this.state.season === 'autumn' ? '#c98451' : '#467d59'); this.ellipse(x - 6, y - 31, 10, 12, '#89a96b'); this.ellipse(x + 7, y - 21, 10, 11, '#315e48');
      }
      if (this.orbs) {
        for (const orb of this.orbs) {
          if (orb.cooldown > 0) continue;
          const bob = Math.sin(t * 4 + orb.id) * 4;
          this.ellipse(orb.x, orb.y + 4, 11, 4, '#ffd76644');
          this.ellipse(orb.x, orb.y - 8 + bob, 9, 9, '#ffe88a66');
          this.poly([[orb.x, orb.y - 16 + bob], [orb.x + 6, orb.y - 8 + bob], [orb.x, orb.y + bob], [orb.x - 6, orb.y - 8 + bob]], '#fff3b8', '#e6a832');
        }
      }
      const hx = this.hero ? this.hero.x : -111, hy = this.hero ? this.hero.y : 280;
      const hJump = this.hero ? Math.sin(this.hero.jump * Math.PI) * 28 : 0;
      this.ellipse(hx, hy + 5, 22 + Math.sin(t * 5) * 3, 8, '#66ffdc44');
      if (this.hero && this.hero.ring > 0) {
        const r = 18 + (1.5 - this.hero.ring) * 24;
        this.ellipse(this.hero.tx, this.hero.ty + 4, r, r * 0.36, '#ffe48a55');
        this.poly([[this.hero.tx - 5, this.hero.ty - 24], [this.hero.tx + 5, this.hero.ty - 24], [this.hero.tx, this.hero.ty - 12]], '#ffe48a');
      }
      [[hx, hy - hJump, 0], [hx + 36, hy - 12 - hJump * 0.65, 1], [-163, 260, 2], [-20, 290, 3]].forEach(([x,y,k]) => this.drawPioneerCharacter(x,y,k));
      if (this.era >= 3) { c.save(); c.translate(305 + Math.sin(t * 0.23) * 80, 49 + Math.sin(t * 1.6) * 5); this.drawPioneerAircraft(); c.restore(); }
      c.restore();
    }
    pioneerBlock(x, y, w, d, h, color = '#e3cfaa') {
      const c = this.ctx, shade = c.createLinearGradient(x-w,y-h,x+w,y); shade.addColorStop(0,color); shade.addColorStop(1,'#8a866e');
      this.poly([[x-w,y-d-h],[x,y-h],[x,y],[x-w,y-d]], shade);
      this.poly([[x,y-h],[x+w,y-d-h],[x+w,y-d],[x,y]], '#526b69');
      this.poly([[x-w,y-d-h],[x,y-d*2-h],[x+w,y-d-h],[x,y-h]], '#ecdfbd');
    }
    pioneerRoof(y, width = 57, color = '#344b52') {
      const c = this.ctx, g = c.createLinearGradient(0,y-33,0,y+14); g.addColorStop(0,'#9da58a');g.addColorStop(0.25,color);g.addColorStop(1,'#152c37');
      c.beginPath(); c.moveTo(-width,y+8); c.quadraticCurveTo(-width+17,y+10,-15,y-24); c.lineTo(0,y-33); c.lineTo(18,y-23); c.quadraticCurveTo(width-17,y+10,width,y+8);c.lineTo(width-5,y+16);c.quadraticCurveTo(19,y+11,0,y-17);c.quadraticCurveTo(-20,y+11,-width+5,y+16);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#d6bc77';c.lineWidth=2;c.stroke();
      for(let i=-3;i<=3;i++)this.poly([[i*10,y-8-Math.abs(i)*-3],[i*13+4,y+8],[i*13+7,y+8]],'#d3decb26');
      this.rect(-2,y-38,4,13,'#ffe1a2');
      for(const dir of [-1,1]) { c.beginPath();c.moveTo(0,y-27);c.lineTo(dir*14,y-46);c.strokeStyle='#eed395';c.lineWidth=3;c.stroke(); }
      for(let i=-1;i<=1;i++)this.ellipse(i*10,y-29,6,2,'#eac878');
    }
    drawPioneerLandmark(id, level) {
      const c=this.ctx,t=this.time;
      this.ellipse(8,4,54,16,'#173b4155');
      this.pioneerBlock(0,7,49,19,6,'#bdbca0');
      if(id===3) {
        const g=c.createLinearGradient(-45,-90,40,0);g.addColorStop(0,'#e7f6d7');g.addColorStop(0.4,'#92d5cd');g.addColorStop(1,'#327d87');
        c.beginPath();c.ellipse(0,-10,45,49,0,Math.PI,TAU);c.lineTo(45,0);c.quadraticCurveTo(0,25,-45,0);c.closePath();c.fillStyle=g;c.fill();
        for(let row=0;row<3;row++)for(let k=0;k<5;k++) {
          const y=-12-row*15,x=-38+k*19+row%2*9;
          this.poly([[x,y],[x+18,y],[x+9,y-16]],(k+row)%2?'#efffd531':'#0a6e8135','#c4ab70');
        }
        this.rect(-8,-12,16,24,'#254e55');this.rect(-5,-8,10,18,'#f8e8a4');
      } else if(id===6) {
        for(let n=-1;n<=1;n++) {
          this.pioneerBlock(n*29,0,10,7,51+n*8,'#c6d6c5');
          this.poly([[n*29-24,-62-n*8],[n*29+7,-77-n*8],[n*29+28,-61-n*8],[n*29-3,-45-n*8]],'#214e72','#87e2e4');
          for(let k=0;k<4;k++)this.poly([[n*29-18+k*7,-62-n*8],[n*29+6+k*5,-51-n*8],[n*29+7+k*5,-52-n*8]],'#5d9bb6');
          this.rect(n*29-1,-131,2,62,'#82fff47a');this.ellipse(n*29,-73-n*8,5,3,'#d2fff5');
        }
      } else if(id===8) {
        this.pioneerBlock(0,0,47,21,16,'#b9d2cb');this.ellipse(0,-29,32,14,'#345c68');this.ellipse(0,-29,25,10,'#bde1cd');this.rect(-12,-31,24,3,'#477888');
        c.save();c.translate(0,-42+Math.sin(t*2)*2);this.drawPioneerAircraft();c.restore();
      } else {
        if(id===9) {
          this.poly([[-57,5],[0,43],[57,5],[32,54],[0,84],[-35,51]],'#6b6174','#c4a86c');
          for(let i=0;i<5;i++)this.poly([[-40+i*17,13],[0,75],[-23+i*15,18]],'#d6a74b24');
          this.ellipse(0,30,49,13,'#f4d58c45');
        }
        const shrine=id===7||id===9, tall=id===1||id===5;
        this.pioneerBlock(0,0,36,18,tall?68:42,shrine?'#bc6550':id===4?'#a27b56':'#e2d0a4');
        for(let i=0;i<5;i++) {
          this.rect(-32+i*7,-29-(tall?24:0),5,20,'#ffd884');this.rect(-31+i*7,-27-(tall?24:0),1,16,'#fff1b2');
          this.rect(-32+i*7,-20-(tall?24:0),5,1,'#7f745a');
        }
        this.rect(-36,-5,36,4,'#876747');
        for(let k=0;k<4;k++)this.rect(-34+k*11,-40,3,36,'#70513f');
        this.pioneerRoof(tall?-82:-55,50,shrine?'#315660':id===2?'#756950':'#405f68');
        if(level>1||shrine) {this.pioneerBlock(0,-61,23,12,22,'#f0d8a1');this.pioneerRoof(-94,36,'#465f65');}
        if(id===7) {
          c.save();c.translate(2,28);this.rect(-42,-54,6,55,'#a74832');this.rect(36,-54,6,55,'#bb5338');this.rect(-49,-55,98,6,'#dc7950');this.rect(-45,-39,90,4,'#c96640');
          c.beginPath();c.moveTo(-55,-67);c.quadraticCurveTo(0,-56,55,-67);c.lineTo(50,-57);c.quadraticCurveTo(0,-48,-50,-57);c.closePath();c.fillStyle='#31454b';c.fill();
          c.beginPath();c.moveTo(-36,-38);c.quadraticCurveTo(0,-18,36,-38);c.strokeStyle='#e7cd91';c.lineWidth=3;c.stroke();
          for(let i=-1;i<=1;i++)this.poly([[i*17-3,-28],[i*17+3,-24],[i*17,-17],[i*17-5,-21]],'#fff0d1');c.restore();
        }
        if(id===4) {this.rect(39,-20,22,4,'#dab77a');this.rect(43,-16,3,17,'#795c41');this.rect(57,-16,3,17,'#795c41');}
      }
      // Warm window bloom and the roof's glancing golden light.
      const glow=c.createRadialGradient(-11,-26,0,-11,-26,40);glow.addColorStop(0,'#ffdc7824');glow.addColorStop(1,'#ffdc7800');this.ellipse(-11,-26,40,40,glow);
    }
    drawPioneerAircraft() {
      const c=this.ctx,t=this.time;
      this.ellipse(0,13,39,7,'#0e324944');
      this.poly([[-34,-1],[34,-1],[29,3],[-29,3]],'#c7ece4');this.poly([[-23,-12],[23,12],[19,15],[-27,-9]],'#acd6d6');
      for(const [x,y] of [[-34,-4],[34,-4],[-24,11],[24,11]]) {
        this.ellipse(x,y,14,4,'#173d50');this.ellipse(x,y,12+Math.sin(t*65)*1.5,2,'#c3f8f997');this.ellipse(x,y,3,3,'#edf9e4');
      }
      this.ellipse(0,-1,22,9,'#dfefe3');this.ellipse(5,-4,12,6,'#2d657a');this.ellipse(7,-6,7,2,'#91d8de');this.rect(-18,0,6,2,'#ffe0a0');this.rect(16,0,5,2,'#76ffe1');
    }
    drawPioneerCharacter(x,y,kind) {
      const c=this.ctx,t=this.time,sway=Math.sin(t*3+kind);c.save();c.translate(x,y+(kind===1?Math.sin(t*3)*3:0));
      this.ellipse(1,5,12,4,'#19393d69');
      if(kind===1) {
        const g=c.createLinearGradient(-10,-30,12,0);g.addColorStop(0,'#f0ffed');g.addColorStop(1,'#4d9caa');
        this.ellipse(0,9+Math.sin(t*10),5,8,'#6cffff36');this.poly([[-5,0],[0,16],[5,0]],'#7fffee7a');
        this.pioneerBlock(0,0,8,4,13,'#b8e4dc');this.ellipse(0,-21,11,9,g);this.rect(-8,-24,16,6,'#16485c');this.rect(-6,-22,12,2,'#80fff3');this.ellipse(0,-33,2,2,'#b3ffec');
        this.rect(-15,-12,4,11,'#b2ded7');this.rect(11,-12,4,11,'#b2ded7');
      } else {
        const cape=kind===0?'#ad4255':kind===2?'#c8b789':'#487d91';
        this.poly([[-8,-18],[-17+sway*3,1],[-6,7],[10,2],[6,-17]],cape,'#ffffff18');
        this.rect(-6,-8,5,13,'#263a49');this.rect(3,-8,5,13,'#263a49');this.ellipse(-4,5,4,2,'#493b38');this.ellipse(6,5,4,2,'#493b38');
        this.pioneerBlock(1,-5,7,4,17,kind===0?'#45657e':kind===2?'#a38758':'#6b8c79');
        this.rect(-10,-21,4,13,'#edc298');this.rect(8,-19,4,12,'#edc298');this.ellipse(0,-29,8,10,'#f2c89e');
        this.poly([[-8,-27],[-9,-36],[-2,-42],[7,-37],[10,-27],[4,-32],[-4,-31]],kind===2?'#dedcc9':'#283747');
        this.rect(-4,-29,2,2,'#293a44');this.rect(3,-29,2,2,'#293a44');
        if(kind===2){this.poly([[-4,-25],[4,-25],[0,-16]],'#e9e3c9');this.rect(11,-25,3,27,'#8b603d');this.rect(6,-27,13,5,'#c6c0a2');}
        if(kind===0){c.save();c.translate(12,-11);c.rotate(-0.19);this.rect(0,-15,2,31,'#e7f3e2');this.rect(-3,9,8,2,'#e5bc6f');this.rect(0,11,2,9,'#463d48');c.restore();this.rect(-6,-12,13,2,'#e5c57e');}
        if(kind===3){this.rect(11,-32,2,35,'#a88655');this.ellipse(12,-33,4,4,'#e5e4a9');}
      }
      c.restore();
    }
    drawPioneerPillar(age,id) {
      const c=this.ctx,t=this.time,alpha=Math.max(0,Math.sin(Math.min(1,age/3)*Math.PI));c.save();c.globalAlpha=alpha;c.globalCompositeOperation='screen';
      const g=c.createLinearGradient(0,-340,0,10);g.addColorStop(0,'#fff0bd00');g.addColorStop(0.3,'#ffdc7d42');g.addColorStop(1,'#fff3b8cd');
      this.poly([[-12,-350],[12,-350],[43,4],[-43,4]],g);this.poly([[-3,-350],[3,-350],[8,5],[-8,5]],'#fffbd37a');this.ellipse(0,4,47,14,'#ffe6a378');this.ellipse(0,4,34,9,'#fffadc91');
      for(let i=0;i<22;i++){const phase=(age*63+i*17)%190,x=Math.sin(i*13+id)*33,y=-phase,s=1.5+Math.sin(t*9+i);this.poly([[x-s,y],[x,y-s*3],[x+s,y],[x,y+s*3]],'#fff0a6');}
      c.restore();
    }
    hud() {
      const w = this.width, theme = ERAS[this.era], compact = w < 720;
      this.rect(0, 0, w, this.top - 10, '#09132beF'); this.rect(0, 0, 6, this.top - 10, theme[3]);
      this.text(`ERA 0${this.era + 1}  /  ${this.year}`, 18, this.short ? 17 : 24, 20, theme[3], 'left');
      this.text(theme[0], 18, this.short ? 45 : 61, compact ? 17 : 24, '#fff', 'left', w - 36);
      this.rect(18, this.short ? 66 : 88, w - 36, 7, '#34405d'); this.rect(18, this.short ? 66 : 88, (w - 36) * (this.year - 2026) / 50, 7, theme[3]);
      const labels = ['🎲 サイコロ進行', '⚔️ ボスバトル', '🎰 逆転ルーレット', '🗺️ すごろくマップ'];
      const actions = [() => this.rollDice(), () => this.startBattle(), () => this.spinRoulette(), () => this.setGameScene('board')];
      const columns = compact ? 2 : 4, bw = Math.min(166, (w - 36 - (columns - 1) * 6) / columns), left = w - 18 - columns * bw - (columns - 1) * 6;
      labels.forEach((label, i) => this.button(label, left + (i % columns) * (bw + 6), (this.short ? 80 : 106) + Math.floor(i / columns) * 43, bw, actions[i]));
      this.rect(0, this.bottom, w, this.height - this.bottom, '#09132bf2');
      this.text(`Lv.${this.stats.level}  HP ${this.stats.hp}  仲間 ${this.stats.allies}  町Lv.${this.stats.village}`, 12, this.bottom + 15, 12, '#dcecff', 'left');
      this.text(`G ${this.stats.gold.toLocaleString('en-US')} ｜ 資産 ${this.stats.assets.toLocaleString('en-US')}万`, w - 12, this.bottom + 33, 12, '#ffe59a', 'right');
      if (this.scene === 'battle' && this.battle) {
        const b = this.battle, ready = !b.attack && b.hp > 0 && !b.defeated;
        if (b.hp > 0 && !b.defeated) {
          ['⚡ 必殺：1と9集中＆AI召喚斬り', '🤝 仲間の絆コンボ', '🛡️ 聖域バリア'].forEach((label, i) => {
            const narrow = w < 600, bw = narrow ? w - 24 : (w - 24) / 3;
            this.button(label, narrow ? 12 : 6 + i * (bw + 4), this.bottom + 43 + (narrow ? i * 34 : 0), bw, () => this.executeBattleCommand(MODES[i]), ready, 30);
          });
        } else this.button(b.defeated ? '再挑戦する' : '🗺️ 勝利！ マップへ', 12, this.bottom + 43, w - 24, () => b.defeated ? this.startBattle(b.index) : this.setGameScene('board'), true, 30);
      } else if (this.scene === 'roulette') this.button(this.roulette && !this.roulette.done ? '運命の抽選中…' : '🎰 もう一度まわす', 12, this.bottom + 43, w - 24, () => this.spinRoulette(), !!this.roulette && this.roulette.done, 30);
      else this.text(this.target === 50 && this.position === 50 ? '伝説達成！ バトルとルーレットは引き続き遊べます' : 'サイコロを振って未来へ。止まったマスで運命が動く！', w / 2, this.bottom + 59, 12, '#cbd9f2', 'center', w - 24);
    }
  }
  global.CodexIsometricRpgEngine = CodexIsometricRpgEngine;
})(window);
