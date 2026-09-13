export class RingWindow<Item> {
  private readonly items: Item[] = [];

  constructor(private readonly capacity: number) {}

  push(item: Item): void {
    this.items.push(item);
    if (this.items.length > this.capacity) this.items.shift();
  }

  all(): Item[] {
    return [...this.items];
  }
}
