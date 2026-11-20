/**
 * A Dataset indexed for pages: shards by key, address and name, and each shard's
 * recipes both ways, grouped so thousands of pairs read as a few lines ("Phanpyre +
 * any of 70 shards"). Built once per version of the data (the site keeps one).
 */
import type { Dataset, RecipeRow, ShardRecord } from "./dataset";
import { rarityRank } from "./rarity";

/** Pairs that make a shard, grouped by a shard they share: `with` + any of `others`. */
export interface PairGroup {
  with: string;
  others: string[];
}

export interface MadeFrom {
  quantity: number;
  pairs: number;
  groups: PairGroup[];
}

/** One output a shard goes into, with every partner that works. */
export interface UsedIn {
  output: string;
  quantity: number;
  partners: string[];
}

/**
 * Groups unordered pairs: the shard in the most pairs takes all of its pairs, then the
 * next, until none are left. Partners keep the dataset's order.
 */
export function groupPairs(
  pairs: readonly (readonly [string, string])[],
): PairGroup[] {
  const left = new Set(pairs.map((_, i) => i));
  const groups: PairGroup[] = [];
  while (left.size > 0) {
    const counts = new Map<string, number>();
    for (const i of left) {
      const [a, b] = pairs[i] ?? ["", ""];
      counts.set(a, (counts.get(a) ?? 0) + 1);
      if (b !== a) counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    let best = "";
    let most = -1;
    for (const [key, count] of counts)
      if (count > most) {
        best = key;
        most = count;
      }
    const others: string[] = [];
    for (const i of [...left]) {
      const [a, b] = pairs[i] ?? ["", ""];
      if (a !== best && b !== best) continue;
      others.push(a === best ? b : a);
      left.delete(i);
    }
    groups.push({ with: best, others });
  }
  return groups;
}

export class ShardCatalog {
  readonly shards: readonly ShardRecord[];
  private readonly byKey = new Map<string, ShardRecord>();
  private readonly bySlug = new Map<string, ShardRecord>();
  private readonly byName = new Map<string, ShardRecord>();
  /** Recipe rows by output key. */
  private readonly rowsFor = new Map<string, RecipeRow[]>();
  /** Recipe rows (with the pair's offset) by input key, built on first use. */
  private uses: Map<string, { row: RecipeRow; at: number }[]> | null = null;

  constructor(readonly dataset: Dataset) {
    this.shards = dataset.shards;
    for (const shard of dataset.shards) {
      this.byKey.set(shard.key, shard);
      this.bySlug.set(shard.slug, shard);
      this.byName.set(shard.name.toLowerCase(), shard);
    }
    for (const row of dataset.recipes) {
      const out = dataset.shards[row[0] ?? -1];
      if (!out) continue;
      const rows = this.rowsFor.get(out.key) ?? [];
      rows.push(row);
      this.rowsFor.set(out.key, rows);
    }
  }

  get(key: string): ShardRecord | undefined {
    return this.byKey.get(key);
  }

  bySlugOf(slug: string): ShardRecord | undefined {
    return this.bySlug.get(slug);
  }

  /** By name, any case ("Lizard King"; a trailing " Shard" is ignored). */
  named(name: string): ShardRecord | undefined {
    return this.byName.get(
      name
        .replace(/ shard$/i, "")
        .trim()
        .toLowerCase(),
    );
  }

  private keyAt(index: number | undefined): string {
    return this.dataset.shards[index ?? -1]?.key ?? "";
  }

  /** The recipes that make `key`, most made first. */
  madeFrom(key: string): MadeFrom[] {
    return (this.rowsFor.get(key) ?? [])
      .map((row) => {
        const pairs: [string, string][] = [];
        for (let i = 2; i + 1 < row.length; i += 2)
          pairs.push([this.keyAt(row[i]), this.keyAt(row[i + 1])]);
        return {
          quantity: row[1] ?? 1,
          pairs: pairs.length,
          groups: groupPairs(pairs),
        };
      })
      .sort((a, b) => b.quantity - a.quantity);
  }

  /** How many pairs make `key` (any quantity). */
  pairsMaking(key: string): number {
    let n = 0;
    for (const row of this.rowsFor.get(key) ?? [])
      n += Math.floor((row.length - 2) / 2);
    return n;
  }

  private usesIndex(): Map<string, { row: RecipeRow; at: number }[]> {
    if (this.uses) return this.uses;
    const uses = new Map<string, { row: RecipeRow; at: number }[]>();
    for (const row of this.dataset.recipes)
      for (let i = 2; i + 1 < row.length; i += 2) {
        const a = this.keyAt(row[i]);
        const b = this.keyAt(row[i + 1]);
        for (const key of a === b ? [a] : [a, b]) {
          const list = uses.get(key) ?? [];
          list.push({ row, at: i });
          uses.set(key, list);
        }
      }
    this.uses = uses;
    return uses;
  }

  /**
   * Everything `key` fuses into, with its partners: rarest outputs first, then by
   * name. A shard fused with itself lists itself as the partner.
   */
  usedIn(key: string): UsedIn[] {
    const byOutput = new Map<string, UsedIn>();
    for (const { row, at } of this.usesIndex().get(key) ?? []) {
      const output = this.keyAt(row[0]);
      const quantity = row[1] ?? 1;
      const a = this.keyAt(row[at]);
      const b = this.keyAt(row[at + 1]);
      const partner = a === key ? b : a;
      const id = `${output}:${String(quantity)}`;
      const entry = byOutput.get(id) ?? { output, quantity, partners: [] };
      if (!entry.partners.includes(partner)) entry.partners.push(partner);
      byOutput.set(id, entry);
    }
    return [...byOutput.values()].sort((a, b) => {
      const x = this.get(a.output);
      const y = this.get(b.output);
      if (!x || !y) return 0;
      return (
        rarityRank(y.rarity) - rarityRank(x.rarity) ||
        x.name.localeCompare(y.name) ||
        b.quantity - a.quantity
      );
    });
  }
}
