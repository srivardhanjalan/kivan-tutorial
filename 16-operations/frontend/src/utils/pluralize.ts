/** "1 follower" / "3 followers": a count and its noun, pluralized with a
    plain trailing "s". One spelling of a counted label (formatCost's sibling
    for whole counts): a store's products, a user's followers. */
export function pluralize(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
