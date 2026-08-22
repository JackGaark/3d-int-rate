export const SCENES = [
  {
    id: 'intro', hed: 'Reading the curve',
    text: '<p>Each slice of this surface is a yield curve: what the U.S. government pays to borrow for one month out to 30 years, on a single day. Stacked over 25 years, the curves form a landscape of interest-rate history.</p><p>The curve is a forecast in disguise — its shape encodes what markets expect from growth and inflation.</p>',
    view: { azi: 1.24, phi: 0.758999, fov: 30, width: 60, lookat_x: 4.05, lookat_y: 5.03, lookat_z: -6.174 },
    hideGrids: [], hideLabels: [], highlightDate: false, highlightProduct: null,
  },
  {
    id: 'side', hed: 'The view from today',
    text: '<p>Seen head-on, the front edge is the most recent curve. Short-term rates sit near zero and long rates are historically low — the lingering mark of the financial crisis.</p><p>A gently rising curve like this one suggests investors expect slow, steady growth ahead.</p>',
    view: { azi: 1.57061, phi: 0, fov: 0.5, width: 35, lookat_x: 0, lookat_y: 7.97333, lookat_z: 0.21667 },
    hideGrids: ['front'], hideLabels: ['x'], highlightDate: true, highlightProduct: null,
  },
  {
    id: 'valley', hed: 'Down in the valley',
    text: '<p>The deep trench in the near corner is the era of zero interest-rate policy. After 2008 the Federal Reserve pinned short-term rates to the floor for years — a valley with no precedent in the modern record.</p>',
    view: { azi: 1.32395, phi: 0.5172, fov: 30, width: 37, lookat_x: 15, lookat_y: -10, lookat_z: -3.74 },
    hideGrids: [], hideLabels: [], highlightDate: false, highlightProduct: null,
  },
  {
    id: '2004-valley', hed: 'An earlier puzzle',
    text: '<p>There is a shallower valley around 2003–2004. When the Fed then raised short rates, long rates barely moved — a flattening that puzzled policymakers at the time and foreshadowed trouble.</p>',
    view: { azi: 1.495391927, phi: 1.613071831, fov: 25, width: 30.70962433, lookat_x: 20.99316857, lookat_y: 8.035308981, lookat_z: -2.063544815 },
    hideGrids: ['product'], hideLabels: [], highlightDate: false, highlightProduct: null,
  },
  {
    id: 'low-now', hed: 'The long slide of long rates',
    text: '<p>Follow the 10-year ridge across the decades: it has been falling since 1990. Cheaper long-term borrowing reflects expectations of lower inflation and slower growth — a structural decline, not a blip.</p>',
    view: { azi: 1.570796327, phi: 1.570796327, fov: 0.1, width: 36.66054489, lookat_x: 9.908797131, lookat_y: 11.38378803, lookat_z: 0 },
    hideGrids: ['product', 'date', 'front'], hideLabels: ['y'], highlightDate: false, highlightProduct: 'X10Y',
  },
  {
    id: 'top', hed: 'The whole landscape',
    text: '<p>From above, color does the work: dark blue where borrowing was expensive, pale where it was cheap. The entire right half of the map fades toward white — a quarter-century of rates drifting down.</p>',
    view: { azi: 0, phi: 1.570796327, fov: 0.1, width: 50, lookat_x: 0, lookat_y: 7, lookat_z: 0 },
    hideGrids: ['date', 'front', 'bottom'], hideLabels: ['z'], highlightDate: false, highlightProduct: null,
  },
];
