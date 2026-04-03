// Card image CDN URLs for all face cards, aces, specials
export const CARD_IMAGES: Record<string, string> = {
  'K-spades': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/king_spades-HCC6T9Lt7Stcg2HWtGZWKF.webp',
  'K-hearts': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/king_hearts-dGSbCuFRRSKkMUbBzJedWL.webp',
  'K-diamonds': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/king_diamonds-bx3mXvKBc98QJSaBju4pSk.webp',
  'K-clubs': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/king_clubs-fdUDF93ZkbJhEJRxMFGYoM.webp',
  'Q-spades': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/queen_spades-Fork2nqPDXYKSKjbpZihHY.webp',
  'Q-hearts': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/queen_hearts-4EvoTQMZjcZARvhadcxG5V.webp',
  'Q-diamonds': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/queen_diamonds-PZvTgYMxtypPPuskiCgipn.webp',
  'Q-clubs': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/queen_clubs-iUZX8JPz49ti3TCpPiWESr.webp',
  'J-spades': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/jack_spades-jREFBeEDt2wmuRDAygfq4E.webp',
  'J-hearts': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/jack_hearts-nW3K7EUTLkJE9ViGy62Xz3.webp',
  'J-diamonds': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/jack_diamonds-5YK8THewcTgi9coxRRxEx2.webp',
  'J-clubs': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/jack_clubs-fZiG9vfe2FCEZ8P7Ua5ip6.webp',
  'A-spades': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/ace_spades-2yUtc5setz4W3G8NatbFNo.webp',
  'A-hearts': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/ace_hearts-atLyq8Ng474qAdLwxZ6BEF.webp',
  'A-diamonds': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/ace_diamonds-HuKNAotfw9LsSDDKHxedB3.webp',
  'A-clubs': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/ace_clubs-UM9BjM668KcCdcKRRCRo2T.webp',
  '777': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/card_777-FrG2yDo9nWFYjaXivAPZBY.webp',
};

export const CARD_BACK_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/card_back-kqTDCf9Jwvt75TYv8Mh5D3.webp';
export const GAME_TABLE_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663506723312/TbGkXKwS7vrkz8cwb2Zvno/game_table-9KeBRLr2mzuAL8uVYsQsVq.webp';

export const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_COLORS: Record<string, string> = {
  spades: '#1a1a2e',
  hearts: '#c41e3a',
  diamonds: '#c41e3a',
  clubs: '#1a1a2e',
};

export function getCardImageKey(rank: string, suit: string | null): string | null {
  if (rank === '777') return '777';
  if (['J', 'Q', 'K', 'A'].includes(rank) && suit) return `${rank}-${suit}`;
  return null;
}
