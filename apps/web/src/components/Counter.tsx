import { Button } from "@trilleo/ui";
import { useState } from "react";

/** Scaffold smoke check: a hydrated React island using @trilleo/ui. Replaced in Phase 2. */
export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <Button
      onClick={() => {
        setCount((n) => n + 1);
      }}
    >
      Clicked {count} {count === 1 ? "time" : "times"}
    </Button>
  );
}
