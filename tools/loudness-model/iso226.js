// ISO 226:2003 equal-loudness contours (the 2023 edition differs by up to 0.6 dB).
const F = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500];
const AF = [0.532, 0.506, 0.480, 0.455, 0.432, 0.409, 0.387, 0.367, 0.349, 0.330, 0.315, 0.301, 0.288, 0.276, 0.267, 0.259, 0.253, 0.250, 0.246, 0.244, 0.243, 0.243, 0.243, 0.242, 0.242, 0.245, 0.254, 0.271, 0.301];
const LU = [-31.6, -27.2, -23.0, -19.1, -15.9, -13.0, -10.3, -8.1, -6.2, -4.5, -3.1, -2.0, -1.1, -0.4, 0.0, 0.3, 0.5, 0.0, -2.7, -4.1, -1.0, 1.7, 2.5, 1.2, -2.1, -7.1, -11.2, -10.7, -3.1];
const TF = [78.5, 68.7, 59.5, 51.1, 44.0, 37.5, 31.5, 26.5, 22.1, 17.9, 14.4, 11.4, 8.6, 6.2, 4.4, 3.0, 2.2, 2.4, 3.5, 1.7, -1.3, -4.2, -6.0, -5.4, -1.5, 6.0, 12.6, 13.9, 12.3];

// SPL of a tone at table frequency i with loudness level phon
function splAt(i, phon) {
  const af = AF[i], lu = LU[i], tf = TF[i];
  const A = 4.47e-3 * (Math.pow(10, 0.025 * phon) - 1.15) + Math.pow(0.4 * Math.pow(10, (tf + lu) / 10 - 9), af);
  return (10 / af) * Math.log10(A) - lu + 94;
}
// interpolated in log frequency
function spl(f, phon) {
  if (f <= F[0]) return splAt(0, phon);
  if (f >= F[F.length - 1]) return splAt(F.length - 1, phon);
  let i = 0;
  while (F[i + 1] < f) i++;
  const t = Math.log(f / F[i]) / Math.log(F[i + 1] / F[i]);
  return splAt(i, phon) * (1 - t) + splAt(i + 1, phon) * t;
}
// loudness level (phon) of a tone at f with SPL L (bisection)
function phonOf(f, L) {
  let lo = -10, hi = 130;
  if (L <= spl(f, 0)) return 0;
  for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (spl(f, mid) > L) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
const sone = phon => (phon >= 40 ? Math.pow(2, (phon - 40) / 10) : Math.pow(phon / 40, 2.642));
module.exports = { F, spl, phonOf, sone };

if (require.main === module) {
  for (const p of [40, 60, 80, 100]) console.log(p + ' phon:', [31.5, 63, 100, 125, 250, 500, 1000, 2000, 3150, 4000, 8000].map(f => f + ':' + spl(f, p).toFixed(1)).join('  '));
}
