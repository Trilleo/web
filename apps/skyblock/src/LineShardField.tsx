import { fieldClasses } from "@trilleo/ui";
import { useRef, useSyncExternalStore } from "react";
import { ShardPicker, type PickerShard } from "./ShardPicker";

export interface LineShardFieldProps {
  /** The shards on a fusion line. */
  shards: PickerShard[];
  /** The centred shard's slug. */
  value: string;
}

/**
 * Fusion lines' "Centre on": a plain <select> in the form until the page's script
 * runs (so it works without JavaScript), then the shard picker, whose pick sends the
 * form at once.
 */
const noSubscription = () => () => undefined;

export function LineShardField({ shards, value }: LineShardFieldProps) {
  // False on the server and while hydrating, true once the browser has the page.
  const enhanced = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const input = useRef<HTMLInputElement>(null);
  const chosen = shards.find((shard) => shard.slug === value);

  if (!enhanced)
    return (
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Centre on</span>
        <select
          name="shard"
          defaultValue={value}
          className={`${fieldClasses} h-11 px-3`}
        >
          {[...shards]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((shard) => (
              <option key={shard.slug} value={shard.slug}>
                {shard.name}
              </option>
            ))}
        </select>
      </label>
    );
  // A fragment, so the picker is the field in its row (the island's element is
  // display: contents).
  return (
    <>
      <ShardPicker
        label="Centre on"
        shards={shards}
        value={chosen?.id ?? null}
        onChange={(shard) => {
          const field = input.current;
          if (!field) return;
          field.value = shard.slug;
          field.form?.requestSubmit();
        }}
        testId="lines-shard"
      />
      <input ref={input} type="hidden" name="shard" defaultValue={value} />
    </>
  );
}
