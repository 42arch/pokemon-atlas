export const TYPE_COLORS: Record<string, string> = {
  normal: '#9fa19f',
  fighting: '#ff8000',
  flying: '#81b9ef',
  poison: '#9141cb',
  ground: '#915121',
  rock: '#afa981',
  bug: '#91a119',
  ghost: '#704170',
  steel: '#60a1b8',
  fire: '#e62829',
  water: '#2980ef',
  grass: '#3fa129',
  electric: '#fac000',
  psychic: '#ef4179',
  ice: '#3fd8ff',
  dragon: '#5060e1',
  dark: '#50413f',
  fairy: '#ef70ef',
  unknown: '#44685e',
}

export const TYPES_LIST = Object.keys(TYPE_COLORS).filter(t => t !== 'unknown')

export const TYPE_NAME_MAP: Record<string, string> = {
  // Chinese
  '一般': 'normal', '格斗': 'fighting', '飞行': 'flying', '毒': 'poison', '地面': 'ground', '岩石': 'rock', '虫': 'bug', '幽灵': 'ghost', '钢': 'steel', '火': 'fire', '水': 'water', '草': 'grass', '电': 'electric', '超能力': 'psychic', '冰': 'ice', '龙': 'dragon', '恶': 'dark', '妖精': 'fairy',
  // Japanese
  'ノーマル': 'normal', 'かくとう': 'fighting', 'ひこう': 'flying', 'どく': 'poison', 'じめん': 'ground', 'いわ': 'rock', 'むし': 'bug', 'ゴースト': 'ghost', 'はがね': 'steel', 'ほのお': 'fire', 'みず': 'water', 'くさ': 'grass', 'でんき': 'electric', 'エスパー': 'psychic', 'こおり': 'ice', 'ドラゴン': 'dragon', 'あく': 'dark', 'フェアリー': 'fairy',
  // English (Identity mapping)
  'Normal': 'normal', 'Fighting': 'fighting', 'Flying': 'flying', 'Poison': 'poison', 'Ground': 'ground', 'Rock': 'rock', 'Bug': 'bug', 'Ghost': 'ghost', 'Steel': 'steel', 'Fire': 'fire', 'Water': 'water', 'Grass': 'grass', 'Electric': 'electric', 'Psychic': 'psychic', 'Ice': 'ice', 'Dragon': 'dragon', 'Dark': 'dark', 'Fairy': 'fairy'
}

export const POKEMON_COLORS: Record<string, string> = {
  red: '#ec8384',
  blue: '#94dbee',
  green: '#aad15e',
  yellow: '#ffff99',
  purple: '#c596bd',
  pink: '#ffdcff',
  brown: '#cc9966',
  black: '#bbbbbb',
  gray: '#eeeeee',
  white: '#ffffff',
}

export const SPRITE_URL_PREFIX = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'

export const GENERATIONS_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9]
