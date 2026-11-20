import type { NodeView, PlanView, ShardInfo } from "./engine";
import { formatHours, formatNumber } from "./format";
import { ShardIcon } from "../ShardBrowser";
import { shardPath } from "../meta";

/** A shard's icon and name, linking its page. */
export function ShardName({
  shard,
  quantity,
}: {
  shard: ShardInfo | undefined;
  quantity?: number;
}) {
  if (!shard) return <span>?</span>;
  return (
    <a
      href={shardPath(shard.slug)}
      className="group inline-flex items-center gap-1.5 align-middle"
    >
      <ShardIcon shard={shard} size={24} />
      <span>
        {quantity !== undefined && (
          <span className="tabular-nums">{formatNumber(quantity)} </span>
        )}
        <span className="link-wipe">{shard.name}</span>
      </span>
    </a>
  );
}

export interface PlanTreeProps {
  plan: PlanView;
  /** Opens the other ways to get a shard. */
  onChange: (shard: string) => void;
  /** Goes back to the cheapest way for a shard chosen by hand. */
  onReset: (shard: string) => void;
}

const changeButton =
  "press border border-ink px-2 py-0.5 type-label hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Node({
  node,
  plan,
  onChange,
  onReset,
  root = false,
}: PlanTreeProps & { node: NodeView; root?: boolean }) {
  const shard = plan.shards[node.shard];
  const name = shard?.name ?? node.shard;
  if (node.kind === "hunt")
    return (
      <li className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="type-label text-muted">Hunt</span>
          <ShardName shard={shard} quantity={node.quantity} />
          <span className="text-sm text-muted">{formatHours(node.hours)}</span>
          {!root && (
            <button
              type="button"
              className={changeButton}
              aria-label={`Change how to get ${name}`}
              onClick={() => {
                onChange(node.shard);
              }}
            >
              Change
            </button>
          )}
        </div>
      </li>
    );
  if (node.kind === "fuse") {
    const a = plan.shards[node.recipe.a];
    const b = plan.shards[node.recipe.b];
    return (
      <li className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="type-label text-muted">Fuse</span>
          <ShardName shard={shard} quantity={node.quantity} />
          <span className="text-sm text-muted">
            {formatNumber(node.crafts)}× ({a?.fuse ?? 1} {a?.name} +{" "}
            {b?.fuse ?? 1} {b?.name}
            {node.recipe.reptile ? ", reptile" : ""})
          </span>
          {node.chosen && (
            <span className="type-label text-accent">Chosen</span>
          )}
          <button
            type="button"
            className={changeButton}
            aria-label={`Change how to get ${name}`}
            onClick={() => {
              onChange(node.shard);
            }}
          >
            Change
          </button>
          {node.chosen && (
            <button
              type="button"
              className="type-label underline"
              aria-label={`Cheapest way for ${name}`}
              onClick={() => {
                onReset(node.shard);
              }}
            >
              Cheapest
            </button>
          )}
        </div>
        <ul className="ml-3 flex flex-col gap-2 border-l border-hair pl-4">
          {node.inputs.map((input, i) => (
            <Node
              key={i}
              node={input}
              plan={plan}
              onChange={onChange}
              onReset={onReset}
            />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="type-label text-muted">Loop</span>
        <ShardName shard={shard} quantity={node.quantity} />
        <span className="text-sm text-muted">
          {formatNumber(node.crafts)} fusions, {node.steps.length} a lap
          {node.multiplier !== 1
            ? `, ×${formatNumber(node.multiplier)} from Crocodile`
            : ""}
        </span>
        <button
          type="button"
          className="type-label underline"
          aria-label={`Undo the loop for ${name}`}
          onClick={() => {
            onReset(node.shard);
          }}
        >
          Undo
        </button>
      </div>
      <ul className="ml-3 flex flex-col gap-2 border-l border-hair pl-4 text-sm">
        {node.steps.map((step) => (
          <li key={step.output} className="flex flex-wrap items-center gap-x-2">
            <span className="type-label text-muted">Step</span>
            <ShardName shard={plan.shards[step.output]} />
            <span className="text-muted">
              = {plan.shards[step.recipe.a]?.name} +{" "}
              {plan.shards[step.recipe.b]?.name}
            </span>
          </li>
        ))}
        <li className="flex flex-col gap-2">
          <span className="type-label text-muted">To start the loop</span>
          <ul className="flex flex-col gap-2">
            <Node
              node={node.entry}
              plan={plan}
              onChange={onChange}
              onReset={onReset}
            />
          </ul>
        </li>
        {node.inputs.map((input, i) => (
          <Node
            key={i}
            node={input}
            plan={plan}
            onChange={onChange}
            onReset={onReset}
          />
        ))}
      </ul>
    </li>
  );
}

/** The plan as a tree, top down: what's made, from what. */
export function PlanTree({ plan, onChange, onReset }: PlanTreeProps) {
  return (
    <ul className="flex flex-col gap-2" data-testid="calc-tree">
      <Node
        node={plan.tree}
        plan={plan}
        onChange={onChange}
        onReset={onReset}
        root
      />
    </ul>
  );
}
