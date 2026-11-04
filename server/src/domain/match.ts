export interface Match {
  giverId: string;
  receiverId: string;
}

export type Shuffle = <T>(items: readonly T[]) => T[];

export const shuffleInPlace = <T>(items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = items[i]!;
    items[i] = items[j]!;
    items[j] = current;
  }
  return items;
};

export const defaultShuffle: Shuffle = (items) => shuffleInPlace([...items]);

// Assigns every giver exactly one distinct receiver, never themselves, and never
// anyone on that giver's exclusion list. Returns null when no such assignment exists.
export const assignMatches = (
  participantIds: readonly string[],
  exclusionsByGiver: ReadonlyMap<string, ReadonlySet<string>>,
  shuffle: Shuffle = defaultShuffle
): Match[] | null => {
  if (participantIds.length < 2) {
    return null;
  }

  const givers = shuffle(participantIds);
  const receivers = new Set(participantIds);

  const search = (index: number, remaining: Set<string>): Match[] | null => {
    if (index === givers.length) {
      return [];
    }
    const giverId = givers[index]!;
    const excluded = exclusionsByGiver.get(giverId) ?? new Set<string>();
    for (const receiverId of shuffle([...remaining])) {
      if (receiverId === giverId || excluded.has(receiverId)) {
        continue;
      }
      remaining.delete(receiverId);
      const rest = search(index + 1, remaining);
      if (rest) {
        return [{ giverId, receiverId }, ...rest];
      }
      remaining.add(receiverId);
    }
    return null;
  };

  return search(0, receivers);
};
