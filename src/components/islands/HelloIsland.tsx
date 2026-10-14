import { useState } from "react";

export function HelloIsland() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      React island is hydrated. Clicks: {count}
    </button>
  );
}