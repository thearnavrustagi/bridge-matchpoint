export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type PlayerPosition = 0 | 1 | 2 | 3; // West, North, East, South

export interface CardType {
  suit: Suit;
  rank: number; // 0-12 (2-Ace, where 12 is Ace)
}

const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of suits) {
    for (let rank = 0; rank <= 12; rank++) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: CardType[]): CardType[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealHands(deck: CardType[]): CardType[][] {
  const hands: CardType[][] = [[], [], [], []];
  deck.forEach((card, i) => {
    hands[i % 4].push(card);
  });
  return hands;
}

export function sortHand(hand: CardType[]): CardType[] {
  const suitOrder: Record<Suit, number> = {
    spades: 0,
    hearts: 1,
    clubs: 2,
    diamonds: 3,
  };

  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.rank - a.rank; // Higher ranks first
  });
}
