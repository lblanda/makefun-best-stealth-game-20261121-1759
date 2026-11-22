// Night Vault — configuration: canvas, tiles, the museum floor plan,
// guard patrols, cameras and tuning. All values are the game's own.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Map legend:
//   # wall (blocks movement and sight)
//   . floor
//   C crate (cover: blocks movement and sight)
//   H hedge (hide spot: blocks sight, player inside is hidden; walkable)
//   D exit door (locked until all three cores are taken)
//   1 2 3 archive cores to steal
//   P player start
export const MAP = [
  '##############################',
  '#......H..........CC......1..#',
  '#.P....H....####......H......#',
  '#......H....#..#....CC...#...#',
  '#..###.....#..#.........#....#',
  '#..#......#..#..H....####..2.#',
  '#..#..CC...#..####.......#...#',
  '#.....H.........#...CC...#...#',
  '#.####...CC....#....H....#...#',
  '#.#.......H....#........#....#',
  '#.#..CC.....####..CC....#....#',
  '#....H..........#....H.......#',
  '#.####.....CC...#.....####...#',
  '#......H........#..H......#..#',
  '#..H......####..#....CC......#',
  '#.####..CC.....#..H.....##...#',
  '#....H....#..3...CC.....#....#',
  '#..CC....H......#....H...D...#',
  '#......####...CC....#....D...#',
  '##############################',
];

export const SEED = 20261121;

// Guard patrol routes, in tile coordinates. Each guard walks its
// waypoints in order and waits briefly at each one.
export const GUARDS = [
  {
    name: 'Hall Warden',
    waypoints: [[6, 1], [9, 1], [9, 4], [6, 4]],
    speed: 62,
    wait: 1.4,
  },
  {
    name: 'Gallery Warden',
    waypoints: [[7, 10], [10, 10], [10, 13], [7, 13]],
    speed: 58,
    wait: 1.8,
  },
  {
    name: 'East Warden',
    waypoints: [[20, 8], [20, 13], [23, 13], [23, 15], [20, 15]],
    speed: 66,
    wait: 1.2,
  },
  {
    name: 'Vault Warden',
    waypoints: [[6, 17], [14, 17], [14, 13], [6, 13]],
    speed: 60,
    wait: 1.6,
  },
];

// Fixed security cameras: a tile, a base facing and a sweep.
export const CAMERAS = [
  { tile: [16, 3], baseAngle: Math.PI / 2, sweep: 1.1, period: 5 },
  { tile: [20, 12], baseAngle: Math.PI, sweep: 1.0, period: 6 },
];

// Vision and detection tuning.
export const VISION = {
  range: 185,
  halfAngle: 0.62, // ~35 degrees each side
  cameraRange: 165,
  cameraHalfAngle: 0.5,
  fillRate: 1.35, // detection per second at point blank, standing
  runMultiplier: 1.6,
  crouchMultiplier: 0.45,
  hedgeMultiplier: 0.12,
  hedgeNear: 46, // inside a hedge, only seen this close
  decayRate: 0.55, // detection lost per second while unseen
  suspicionAt: 0.35, // guard turns to investigate
  chaseSpeed: 108,
  searchTime: 4.5,
  catchDistance: 20,
};

// Player movement, in pixels per second.
export const PLAYER = {
  walkSpeed: 118,
  runSpeed: 178,
  sneakSpeed: 62,
  radius: 11,
  coins: 3,
};

export const GAME_NAME = 'Night Vault';
export const GAME_SUBTITLE = 'a shadow-archive heist';
