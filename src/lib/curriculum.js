// The Shorinkan curriculum, in order. Drives the grouped kata view.
//
// Each series lists its kata by the EXACT `name` they are seeded under in the
// `kata` table (see README seed). At render time we match DB kata rows to a
// member by that name to attach the row id (for navigation) and the
// segment / bunkai counts. `title` is the short label shown on the card;
// `sup` is the tracked superscript (the series name) above it.
//
// `solo: true` series render as a single full-width row instead of a rail.

export const CURRICULUM = [
  {
    rank: '01', name: 'Wansu', kanji: '汪楫', sub: 'SOLO KATA', solo: true,
    members: [{ db: 'Wansu', title: 'Wansu', sup: '' }],
  },
  {
    rank: '02', name: 'Naihanchi', kanji: 'ナイハンチ', sub: 'SHODAN · NIDAN · SANDAN',
    members: [
      { db: 'Naihanchi Shodan', title: 'Shodan', sup: 'NAIHANCHI' },
      { db: 'Naihanchi Nidan', title: 'Nidan', sup: 'NAIHANCHI' },
      { db: 'Naihanchi Sandan', title: 'Sandan', sup: 'NAIHANCHI' },
    ],
  },
  {
    rank: '03', name: 'Pinan', kanji: '平安', sub: 'SHODAN → GODAN',
    members: [
      { db: 'Pinan Shodan', title: 'Shodan', sup: 'PINAN' },
      { db: 'Pinan Nidan', title: 'Nidan', sup: 'PINAN' },
      { db: 'Pinan Sandan', title: 'Sandan', sup: 'PINAN' },
      { db: 'Pinan Yondan', title: 'Yondan', sup: 'PINAN' },
      { db: 'Pinan Godan', title: 'Godan', sup: 'PINAN' },
    ],
  },
  {
    rank: '04', name: 'Passai', kanji: '抜塞', sub: 'SHO · DAI',
    members: [
      { db: 'Passai Sho', title: 'Sho', sup: 'PASSAI' },
      { db: 'Passai Dai', title: 'Dai', sup: 'PASSAI' },
    ],
  },
  {
    rank: '05', name: 'Kusanku', kanji: '公相君', sub: 'SHO · DAI',
    members: [
      { db: 'Kusanku Sho', title: 'Sho', sup: 'KUSANKU' },
      { db: 'Kusanku Dai', title: 'Dai', sup: 'KUSANKU' },
    ],
  },
  {
    rank: '06', name: 'Chinto', kanji: '鎮東', sub: 'SOLO KATA', solo: true,
    members: [{ db: 'Chinto', title: 'Chinto', sup: '' }],
  },
  {
    rank: '07', name: 'Gojushiho', kanji: '五十四歩', sub: 'SOLO KATA', solo: true,
    members: [{ db: 'Gojushiho', title: 'Gojushiho', sup: '' }],
  },
]
