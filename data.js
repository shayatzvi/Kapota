/* ============================================================
   Kapota Day — data: communities, levels, stances, events
   Events are keyed by HEBREW date so they work every year.
   Month keys follow Intl: Tishri Heshvan Kislev Tevet Shevat
   "Adar I" Adar Nisan Iyar Sivan Tamuz Av Elul
   (Adar II is normalised to "Adar".)
   For fun + convenience: double-check dates with your Rov/luach.
   ============================================================ */

const CH = ['chabad', 'breslov', 'belz', 'bobov', 'bostoner', 'gur', 'satmar', 'skver'];

/* kapota = how strong the kapota culture is (0-1)
   daily  = how likely it is to be a normal weekday garment (0-1) */
const GROUPS = [
  { id: 'chabad',   label: 'Chabad-Lubavitch',          kapota: .8,  daily: .2,  blurb: 'Farbrengens, mivtzoim, neshek byadeinu. Yud Tes Kislev.' },
  { id: 'bostoner', label: 'Bostoner Chassidus',        kapota: 1,   daily: 1,   blurb: 'No Tachanun, every day. The mikvah is an experience.' },
  /* ETA: not open yet. People can click through the prompts to unlock them. */
  { id: 'breslov',  label: 'Breslov',                   kapota: .75, daily: .5,  locked: true },
  { id: 'satmar',   label: 'Satmar',                    kapota: 1,   daily: .9,  locked: true },
  { id: 'belz',     label: 'Belz',                      kapota: 1,   daily: .9,  locked: true },
  { id: 'bobov',    label: 'Bobov',                     kapota: 1,   daily: .8,  locked: true },
  { id: 'gur',      label: 'Gur (Ger)',                 kapota: .9,  daily: .7,  locked: true },
  { id: 'skver',    label: 'Skver / other Chassidish',  kapota: 1,   daily: .8,  locked: true },
  { id: 'litvish',  label: 'Litvish / Yeshivish',       kapota: .35, daily: .05, locked: true },
  { id: 'sefardi',  label: 'Sefardi / Edot HaMizrach',  kapota: .3,  daily: 0,   locked: true },
  { id: 'modern',   label: 'Modern / Religious Zionist', kapota: .25, daily: 0,  locked: true },
  { id: 'other',    label: 'Other / not sure',          kapota: .15, daily: 0,   locked: true },
];

const LEVELS = [
  { v: 0, label: 'Minimal' },
  { v: 1, label: 'Occasional' },
  { v: 2, label: 'Casual' },
  { v: 3, label: 'Regular' },
  { v: 4, label: 'Serious' },
  { v: 5, label: 'Full-time' },
];

/* The form re-words itself for each community */
const GROUP_KIND = { chabad: 'chabad', bostoner: 'bostoner', breslov: 'chassidish', satmar: 'chassidish', belz: 'chassidish', bobov: 'chassidish', gur: 'chassidish', skver: 'chassidish', litvish: 'litvish', sefardi: 'sefardi', modern: 'modern', other: 'modern' };
const LEVEL_FLAVOR = {
  chabad:     { sub: 'How Chassidish is your day to day?',
                descs: ['Not really connected to Chabad.', 'Comes to a farbrengen now and then.', 'Kapota for Shabbos and the big dates.', 'Shabbos, Yom Tov, Chabad dates and some weekdays.', 'Davens and learns in a kapota or rekel most days.', 'Kapota nearly every day.'] },
  bostoner:   { sub: 'How much of the full Bostoner experience are you in for?',
                descs: ['Comes for the kiddush.', 'Shabbos at the shtiebel.', 'Regular, but skips the early mikvah.', 'No Tachanun, and the mikvah most days.', 'Full Bostoner. Never skips the mikvah.', 'The works, every single day.'] },
  chassidish: { sub: 'How closely do you keep to your court’s dress?',
                descs: ['Outside the usual standard.', 'Shabbos only.', 'Shabbos and Yom Tov.', 'Most of the time.', 'Full standard, including on the street.', 'Full standard every day, bekishe included.'] },
  litvish:    { sub: 'How would you describe your usual dress?',
                descs: ['Casual.', 'Suit for Shabbos.', 'Black hat and suit on Shabbos.', 'Black hat and jacket daily.', 'Frock for Shabbos and Yom Tov.', 'Frock regularly.'] },
  sefardi:    { sub: 'How would you describe your usual dress?',
                descs: ['Casual.', 'Suit on Shabbos.', 'Suit and tie for shul.', 'Suit daily; bisht on special occasions.', 'Bisht for Yom Tov and simchas.', 'Traditional dress daily.'] },
  modern:     { sub: 'How would you describe your usual dress?',
                descs: ['Casual.', 'Dressier for shul.', 'Suit on Shabbos.', 'Suit and hat on Shabbos and Yom Tov.', 'Hat and jacket regularly.', 'Black hat and jacket daily.'] },
};

/* Only used when community = Chabad */
const STANCES = [
  { id: 'meshichist', label: 'Meshichist',        desc: 'Yechi is part of the vocabulary.' },
  { id: 'neutral',    label: 'Neutral',           desc: 'Prefers not to say.' },
  { id: 'anti',       label: 'Anti-meshichist',   desc: 'Prefers a quieter style on Rebbe-centered days.' },
  { id: 'detroiter',  label: 'Detroiter',         desc: 'Hardcore anti, from the Detroit yeshiva. The farbrengens run long.' },
];

/* chabad = bonus on Chabad days (if Chabad), gen = general tilt */
const YESHIVAS = [
  { id: 'tmimim770',       label: 'Tomchei Tmimim — 770 (Crown Heights)', chabad: 1.0, gen: .3, for: ['chabad', 'other'] },
  { id: 'tmimimOther',     label: 'Tomchei Tmimim — another branch (Morristown, Chicago, Montreal, Kfar Chabad, ', chabad: .7, gen: .2, for: ['chabad', 'other'] },
  { id: 'detroitLub',      label: 'Lubavitch Yeshiva Gedolah of Detroit', chabad: .6, gen: .2, for: ['chabad'] },
  { id: 'acheiTmimim',     label: 'Achei Tmimim — Lubavitch yeshiva in Brookline', desc: 'Lubavitch, in Bostoner territory.', chabad: .5, gen: .2, for: ['chabad', 'bostoner'] },
  { id: 'bostonerY',       label: 'Bostoner yeshiva (Brookline, Har Nof)', chabad: -.2, gen: .5, for: ['bostoner'] },
  { id: 'detroitBY',       label: 'Yeshivas Beth Yehudah (Detroit)', chabad: -.4, gen: -.1, for: ['litvish'] },
  { id: 'chabadOther',     label: 'Other Lubavitch institution or Chabad day school', chabad: .3, gen: 0, for: ['chabad', 'other'] },
  { id: 'satmarY',         label: 'Satmar yeshiva (Williamsburg, Monroe, Kiryas Joel)', chabad: -.2, gen: .5, for: ['satmar'] },
  { id: 'belzY',           label: 'Belz yeshiva / talmud torah', chabad: -.2, gen: .5, for: ['belz'] },
  { id: 'breslovY',        label: 'Breslov yeshiva (Jerusalem, Uman kollel)', chabad: -.2, gen: .5, for: ['breslov'] },
  { id: 'chassidicOther',  label: 'Other Chassidish yeshiva (Bobov, Gur, Skver, Vizhnitz…)', chabad: -.2, gen: .4, for: ['breslov', 'satmar', 'belz', 'bobov', 'bostoner', 'gur', 'skver', 'other'] },
  { id: 'litvish',         label: 'Litvish / Yeshivish (Lakewood, Mir, Ponevezh…)', chabad: -.5, gen: -.3, for: ['litvish', 'modern', 'sefardi', 'other', 'chabad'] },
  { id: 'modern',          label: 'Modern / Hesder / YU / Midreshet', chabad: -.6, gen: -.5, for: ['modern', 'sefardi', 'other', 'litvish'] },
  { id: 'none',            label: 'No yeshiva / Baal Teshuva', chabad: -.2, gen: -.2 },
];

const SHLICHUS = [
  { id: 'shliach',   label: 'Shliach / Shlucha — on shlichus', pub: 1.2, chabad: .6, gen: .3, for: ['chabad'] },
  { id: 'training',  label: 'Shliach in training (Merkos, kollel, bein hazmanim)', pub: .8, chabad: .4, gen: .2, for: ['chabad'] },
  { id: 'volunteer', label: 'Mivtzoim / Chabad House volunteer', pub: .6, chabad: .3, gen: 0, for: ['chabad'] },
  { id: 'kiruv',     label: 'Kiruv professional or community rabbi', pub: .8, chabad: 0, gen: .2 },
  { id: 'none',      label: 'No', pub: 0, chabad: 0, gen: 0 },
];

const CATS = {
  chag:      { label: 'Yom Tov & Chagim' },
  fast:      { label: 'Fasts' },
  chabad:    { label: 'Chabad' },
  chassidic: { label: 'Other Chassidic courts' },
  yeshivish: { label: 'Litvish / Yeshivish' },
  israel:    { label: 'Israel days' },
  shabbat:   { label: 'Shabbos' },
  general:   { label: 'General' },
};

/* ---- Events ----
   e(id, name, month, day(s), cat, weight 1-10, extras)
   extras: groups (native communities), bias {group: delta}, tags
           ['rebbe','yechi','geulah'], pub (public/community-facing),
           il: 'only' | 'not' (Israel vs Diaspora), note, match(ctx)
*/
function e(id, n, m, d, cat, w, x) { return Object.assign({ id, n, m, d, cat, w }, x || {}); }

const EVENTS = [
  /* ---------- Tishrei ---------- */
  e('rh',      'Rosh Hashana',                         'Tishri', [1, 2], 'chag', 8, { note: 'Two days.' }),
  e('gedalia', 'Tzom Gedalia',                         'Tishri', 3, 'fast', 3, { note: 'If the 3rd is Shabbos, the fast moves to the 4th — check your luach.' }),
  e('yk',      'Yom Kippur',                           'Tishri', 10, 'chag', 7.5, { note: 'Kittel. No leather shoes.' }),
  e('maharash-y', 'Yahrzeit of the Rebbe Maharash',    'Tishri', 13, 'chabad', 5, { note: 'The fourth Lubavitcher Rebbe.' }),
  e('sukkos1', 'Sukkos',                               'Tishri', 15, 'chag', 8, {}),
  e('sukkos2', 'Sukkos — 2nd Day',                     'Tishri', 16, 'chag', 8, { il: 'not' }),
  e('chm-sukkos-il', 'Chol HaMoed Sukkos',             'Tishri', 16, 'chag', 4.5, { il: 'only' }),
  e('chm-sukkos', 'Chol HaMoed Sukkos',                'Tishri', [17, 18, 19, 20], 'chag', 4.5, { note: 'Dressy-casual.' }),
  e('nachman-y', 'Yahrzeit of Rebbe Nachman of Breslov', 'Tishri', 18, 'chassidic', 6.5, { groups: ['breslov'], note: '18 Tishrei — Breslov gathers in Uman and around the world.' }),
  e('vilna',   'Yahrzeit of the Vilna Gaon',           'Tishri', 19, 'yeshivish', 4.5, { groups: ['litvish'] }),
  e('hoshana', 'Hoshana Rabba',                        'Tishri', 21, 'chag', 6, { note: 'Kittel is common.' }),
  e('shemini-il', 'Shemini Atzeres / Simchas Torah',   'Tishri', 22, 'chag', 9, { il: 'only' }),
  e('shemini', 'Shemini Atzeres',                      'Tishri', 22, 'chag', 8, { il: 'not' }),
  e('simchas', 'Simchas Torah',                        'Tishri', 23, 'chag', 9, { il: 'not', note: 'Hakafos.' }),
  e('berditchev', 'Yahrzeit of Reb Levi Yitzchok of Berditchev', 'Tishri', 25, 'chassidic', 5, { groups: CH }),
  e('chasamsofer', 'Yahrzeit of the Chasam Sofer',     'Tishri', 25, 'yeshivish', 4.5, { groups: ['litvish', 'satmar', 'gur', 'belz'] }),

  /* ---------- Cheshvan ---------- */
  e('rachel',  'Yahrzeit of Rachel Imeinu',            'Heshvan', 11, 'general', 3),
  e('rashab-b', 'Birthday of the Rebbe Rashab',        'Heshvan', 20, 'chabad', 6, { note: 'Yom Huledes of the fifth Lubavitcher Rebbe.' }),

  /* ---------- Kislev ---------- */
  e('mitteler', 'Hillula & Birthday of the Mitteler Rebbe', 'Kislev', 9, 'chabad', 5),
  e('mitteler-lib', 'Liberation of the Mitteler Rebbe', 'Kislev', 10, 'chabad', 5),
  e('wedding', 'Wedding of the Rebbe & Rebbetzin',     'Kislev', 14, 'chabad', 5, { tags: ['rebbe'], note: 'Chof-Daled Kislev, 5689.' }),
  e('yudtes',  'Yud Tes Kislev',                       'Kislev', 19, 'chabad', 9.5, { pub: true, note: 'Rosh Hashana of Chassidus. Alter Rebbe’s liberation. The big one.' }),
  e('maggid',  'Yahrzeit of the Maggid of Mezritch',   'Kislev', 19, 'chassidic', 5, { groups: CH }),
  e('yudkislev', 'Yud Kislev',                         'Kislev', 20, 'chabad', 7, { note: 'Yom Tov Sheni of Chassidus — the farbrengens roll on.' }),
  e('chanukah', 'Chanukah',                            null, null, 'chag', 6, {
    pub: true, note: 'Public menorah lightings.',
    match: (h) => {
      if (h.m === 'Kislev' && h.d >= 25) return h.d - 24;
      if (h.m === 'Tevet' && h.d <= 3) { const n = h.d + h.kislevLen - 24; return n <= 8 ? n : null; }
      return null;
    }, dayLabel: (n) => 'Day ' + n,
  }),

  /* ---------- Tevet ---------- */
  e('didan',   'Didan Notzach (Hei Teves)',            'Tevet', 5, 'chabad', 6, { pub: true, note: 'Victory of the Seforim — 5687 / 5747.' }),
  e('asara',   'Asara B’Teves',                        'Tevet', 10, 'fast', 3),
  e('rambam',  'Yahrzeit of the Rambam',               'Tevet', 20, 'general', 3),
  e('alter-y', 'Yahrzeit of the Alter Rebbe (24 Teves)', 'Tevet', 24, 'chabad', 8, { note: 'Baal HaTanya & Shulchan Aruch HaRav.' }),

  /* ---------- Shevat ---------- */
  e('yudshvat', 'Yud Shevat',                          'Shevat', 10, 'chabad', 9, { pub: true, tags: ['rebbe'], note: 'Yahrzeit of the Rebbe Rayatz; the Rebbe’s accepting of the Nesius.' }),
  e('tubshvat', 'Tu BiShvat',                          'Shevat', 15, 'general', 2.5, {}),
  e('rebbetzin', 'Yahrzeit of Rebbetzin Chaya Mushka', 'Shevat', 22, 'chabad', 6, { tags: ['rebbe'] }),
  e('salanter', 'Yahrzeit of Rav Yisrael Salanter',    'Shevat', 25, 'yeshivish', 4.5, { groups: ['litvish'], note: 'Mussar-movement founder.' }),

  /* ---------- Adar ---------- */
  e('purimkatan', 'Purim Katan',                       'Adar I', 14, 'chag', 4, { note: 'Leap years only.' }),
  e('moshe',   'Yahrzeit of Moshe Rabbeinu (7 Adar)',  'Adar', 7, 'general', 4),
  e('esther',  'Taanis Esther',                        'Adar', 13, 'fast', 3),
  e('purim',   'Purim',                                'Adar', 14, 'chag', 7, { pub: true, note: 'Many dress up; some wear a kapota as usual.' }),
  e('shushan', 'Shushan Purim',                        'Adar', 15, 'chag', 4.5),
  e('elimelech', 'Yahrzeit of Reb Elimelech of Lizhensk', 'Adar', 21, 'chassidic', 5, { groups: CH }),
  e('chidushei', 'Yahrzeit of the Chiddushei HaRim (Gur)', 'Adar', 23, 'chassidic', 6, { groups: ['gur'] }),

  /* ---------- Nisan ---------- */
  e('nachman-b', 'Birthday of Rebbe Nachman',          'Nisan', 1, 'chassidic', 5, { groups: ['breslov'] }),
  e('rashab-y', 'Yahrzeit of the Rebbe Rashab',        'Nisan', 2, 'chabad', 6),
  e('yudalef', 'Yud Alef Nissan',                      'Nisan', 11, 'chabad', 9, { pub: true, tags: ['rebbe', 'yechi'], note: 'Birthday of the Lubavitcher Rebbe, Rabbi Menachem Mendel Schneerson.' }),
  e('tzemach', 'Yahrzeit of the Tzemach Tzedek',       'Nisan', 13, 'chabad', 5),
  e('erev-pesach', 'Erev Pesach',                      'Nisan', 14, 'chag', 4, { note: 'Day of cleaning and the firstborn fast.' }),
  e('pesach1', 'Pesach — Day 1',                       'Nisan', 15, 'chag', 8.5, { note: 'Seder night. Many wear a kittel.' }),
  e('pesach2', 'Pesach — Day 2',                       'Nisan', 16, 'chag', 8.5, { il: 'not' }),
  e('chm-pesach-il', 'Chol HaMoed Pesach',             'Nisan', 16, 'chag', 4.5, { il: 'only' }),
  e('chm-pesach', 'Chol HaMoed Pesach',                'Nisan', [17, 18, 19, 20], 'chag', 4.5),
  e('pesach7', 'Shvi’i Shel Pesach',                   'Nisan', 21, 'chag', 8, {}),
  e('pesach8', 'Acharon Shel Pesach — Moshiach’s Seudah', 'Nisan', 22, 'chag', 8, { il: 'not', groups: ['chabad'], tags: ['geulah'], note: 'The Baal Shem Tov’s Moshiach’s Seudah.' }),
  e('shoah',   'Yom HaShoah',                          'Nisan', 27, 'general', 2),

  /* ---------- Iyar ---------- */
  e('maharash-b', 'Birthday of the Rebbe Maharash',    'Iyar', 2, 'chabad', 5),
  e('zikaron', 'Yom HaZikaron',                        'Iyar', 4, 'israel', 2.5, { bias: { modern: 1, satmar: -1 } }),
  e('atzmaut', 'Yom HaAtzmaut',                        'Iyar', 5, 'israel', 4, { bias: { modern: 3, sefardi: 1.5, satmar: -4, belz: -1.5, gur: -1, skver: -2.5, bobov: -1.5, breslov: -.5 } }),
  e('lagbaomer', 'Lag BaOmer',                         'Iyar', 18, 'general', 5, { pub: true, groups: ['chabad', 'breslov', 'bobov', 'belz', 'gur'], note: 'Bonfires, parades and upsherin, mostly outdoors.' }),
  e('yerushalayim', 'Yom Yerushalayim',                'Iyar', 28, 'israel', 3, { bias: { modern: 3, satmar: -3, skver: -2, belz: -1 } }),

  /* ---------- Sivan ---------- */
  e('shavuos', 'Shavuos',                              'Sivan', 6, 'chag', 8.5, { note: 'Also the Baal Shem Tov’s yahrzeit.' }),
  e('shavuos2', 'Shavuos — Day 2',                     'Sivan', 7, 'chag', 8.5, { il: 'not' }),
  e('bst-y',   'Yahrzeit of the Baal Shem Tov',        'Sivan', 6, 'chassidic', 6, { groups: CH }),
  e('chofches', 'Chof Ches Sivan',                     'Sivan', 28, 'chabad', 5, { tags: ['rebbe'], note: 'The Rebbe’s arrival in America (5701).' }),

  /* ---------- Tammuz ---------- */
  e('gimmel',  'Gimmel Tammuz',                        'Tamuz', 3, 'chabad', 9, { tags: ['rebbe'], note: 'Yahrzeit of the Lubavitcher Rebbe. Ohel visits worldwide.' }),
  e('yudbeis', 'Yud Beis Tammuz',                      'Tamuz', 12, 'chabad', 8, { pub: true, note: 'Chag HaGeulah of the Rebbe Rayatz.' }),
  e('yudgimmel', 'Yud Gimmel Tammuz',                  'Tamuz', 13, 'chabad', 6, { pub: true }),
  e('17tammuz', 'Shiva Asar B’Tammuz',                 'Tamuz', 17, 'fast', 3),

  /* ---------- Av ---------- */
  e('9av',     'Tisha B’Av',                           'Av', 9, 'fast', 3.5, { note: 'Fast day; leather shoes are not worn.' }),
  e('tubav',   'Tu B’Av',                              'Av', 15, 'general', 2.5),
  e('satmar-y', 'Yahrzeit of the Satmar Rebbe (Reb Yoel)', 'Av', 26, 'chassidic', 6.5, { groups: ['satmar'] }),

  /* ---------- Elul ---------- */
  e('chaielul', 'Chai Elul',                           'Elul', 18, 'chassidic', 7, { groups: CH, pub: true, note: 'Birthdays of the Baal Shem Tov and the Alter Rebbe.' }),
  e('chofetz', 'Yahrzeit of the Chofetz Chaim',        'Elul', 24, 'yeshivish', 4.5, { groups: ['litvish'] }),
  e('erev-rh', 'Erev Rosh Hashana',                    'Elul', 29, 'general', 5, { note: 'Selichos and hatoras nedarim.' }),

  /* ---------- Rosh Chodesh (any month) ---------- */
  e('rc', 'Rosh Chodesh', null, null, 'general', 3, {
    match: (h) => ((h.d === 1 && h.m !== 'Tishri') || h.d === 30) ? (h.d === 30 ? 1 : 2) : null,
    dayLabel: (n) => (n === 1 ? 'Erev Rosh Chodesh · Day 1' : 'Day 2 / 1st of the month'),
    note: 'Hallel is said.',
  }),

  /* ---------- Weekly ---------- */
  e('shabbos', 'Shabbos Kodesh', null, null, 'shabbat', 5.3, { match: (h) => h.dow === 6 ? 1 : null, note: 'The standard kapota day.' }),
  e('erev-shabbos', 'Erev Shabbos', null, null, 'shabbat', 2.5, { match: (h) => h.dow === 5 ? 1 : null, note: 'Many change after the mikvah, before Shabbos.' }),
];

/* Short lines by tier index (0 = strongest yes) */
const QUIPS = [
  ['One of the main days on the calendar.', 'A full-dress day.', 'This is what the kapota is for.'],
  ['Wear it.', 'Strongly recommended today.', 'A day where it is expected.'],
  ['More yes than no.', 'A good day for it.', 'Worth wearing if you have it ready.'],
  ['Up to you.', 'Either way is fine.', 'Optional.'],
  ['Probably not needed.', 'Not today.', 'A suit jacket is enough.'],
  ['No kapota needed.', 'A regular day.', 'Dress comfortably.'],
];

const TIERS = [
  { key: 'max',   min: 8,   label: 'Kapota day',        short: 'Kapota' },
  { key: 'yes',   min: 6,   label: 'Yes, wear it',      short: 'Yes' },
  { key: 'lean',  min: 4.5, label: 'Leaning yes',       short: 'Lean yes' },
  { key: 'maybe', min: 3,   label: 'Your call',         short: 'Your call' },
  { key: 'lno',   min: 1.5, label: 'Probably not',      short: 'Probably not' },
  { key: 'no',    min: -99, label: 'No kapota today',   short: 'No' },
];

const OUTFITS = {
  kapota: ['Kapota, gartel and hat', 'Kapota and hat', 'Kapota, or a good long jacket', 'Dark jacket; kapota if you prefer', 'Suit jacket and hat', 'Anything clean and comfortable'],
  plain:  ['Your best suit and hat', 'Suit and hat', 'Jacket and tie', 'Button-down and kippa', 'Smart casual', 'Casual'],
  sefardi:['Bisht or your best suit', 'Suit and a white shirt', 'Jacket, tie optional', 'Button-down and kippa', 'Smart casual', 'Casual'],
};

/* Shown under the verdict for the Detroiter stance */
const DETROITER_COMMENT = 'Just do it, Tzvi B.';
