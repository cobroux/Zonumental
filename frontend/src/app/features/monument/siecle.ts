const ROMAINS: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

function romain(n: number): string {
  let reste = n;
  return ROMAINS.reduce((s, [v, r]) => {
    while (reste >= v) {
      s += r;
      reste -= v;
    }
    return s;
  }, '');
}

/** 17 -> « XVIIe siècle », -1 -> « Ier siècle av. J.-C. », null -> « — » (R1-72b). */
export function formaterSiecle(siecle: number | null): string {
  if (siecle === null) return '—';
  const n = Math.abs(siecle);
  return `${romain(n)}${n === 1 ? 'er' : 'e'} siècle${siecle < 0 ? ' av. J.-C.' : ''}`;
}
