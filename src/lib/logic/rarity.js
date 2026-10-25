// Rarity of serial numbers. Pure functions.
// "count" = copies of a serial number that are out in the market (delivered - returned).
// A number is judged against the average of the numbers that exist there at all:
//   absent    -> no copies at all
//   very_rare -> less than half the average
//   rare      -> less than 85% of the average
//   common    -> up to 130% of the average
//   abundant  -> more than that

export const LEVELS = ['absent', 'very_rare', 'rare', 'common', 'abundant'];

export function classify(count, mean) {
  if (!(count > 0)) return 'absent';
  const ratio = mean > 0 ? count / mean : 1;
  if (ratio < 0.5) return 'very_rare';
  if (ratio < 0.85) return 'rare';
  if (ratio <= 1.3) return 'common';
  return 'abundant';
}

// counts: { serial: n }, serials: the serial numbers that are in scope (printed numbers)
// rank 1 = the rarest number.
export function rarityTable(counts, serials) {
  const values = serials.map((s) => Math.max(0, Number(counts?.[s]) || 0));
  const presentCount = values.filter((v) => v > 0).length;
  const total = values.reduce((a, b) => a + b, 0);
  const mean = presentCount ? total / presentCount : 0;
  const rows = serials.map((serial, i) => ({
    serial,
    count: values[i],
    ratio: mean > 0 ? values[i] / mean : 0,
    level: classify(values[i], mean),
    rank: 0,
  }));
  [...rows]
    .sort((a, b) => a.count - b.count || a.serial - b.serial)
    .forEach((r, i) => {
      r.rank = i + 1;
    });
  const levelCounts = { absent: 0, very_rare: 0, rare: 0, common: 0, abundant: 0 };
  for (const r of rows) levelCounts[r.level] += 1;
  return { rows, mean, total, presentCount, levelCounts };
}