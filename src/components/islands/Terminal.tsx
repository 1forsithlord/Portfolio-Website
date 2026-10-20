import { useEffect, useId, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { runCommand, type Action, type Line } from "../../lib/terminal";
import { GALAXY_RESET_EVENT } from "../../lib/events";
import "../../styles/terminal.css";

const START: Line[] = [{ kind: "output", text: "Type help to see what you can run." }];

/**
  A small command line that offers shortcuts around the site. Command logic
  lives in lib/terminal.ts; this component keeps the history and the log.
*/
export function Terminal() {
  const [lines, setLines] = useState<Line[]>(START);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  // Position in history while using the arrow keys. null means "not browsing".
  const [cursor, setCursor] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  const perform = (action: Action) => {
    if (action.type === "navigate") window.location.assign(action.href);
    else if (action.type === "galaxy-reset") window.dispatchEvent(new Event(GALAXY_RESET_EVENT));
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = value.trim();
    setValue("");
    setCursor(null);
    if (!input) return;

    setHistory((previous) => [...previous, input]);
    const result = runCommand(input, { pathname: window.location.pathname });

    if (result.action?.type === "clear") {
      setLines([]);
      return;
    }
    setLines((previous) => [...previous, { kind: "input", text: input }, ...result.lines]);
    if (result.action) perform(result.action);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      if (history.length === 0) return;
      event.preventDefault();
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setValue(history[next] ?? "");
    } else if (event.key === "ArrowDown") {
      if (cursor === null) return;
      event.preventDefault();
      if (cursor >= history.length - 1) {
        setCursor(null);
        setValue("");
      } else {
        setCursor(cursor + 1);
        setValue(history[cursor + 1] ?? "");
      }
    }
  };

  return (
    <section className="terminal" aria-label="Terminal">
      <div ref={logRef} className="term-log" role="log" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        {lines.map((line, index) => (
          <div
            key={index}
            className={line.kind === "input" ? "term-input-line" : line.kind === "error" ? "term-error" : "term-output"}
          >
            {line.kind === "input" ? (
              <>
                <span className="term-prompt" aria-hidden="true">
                  ${" "}
                </span>
                {line.text}
              </>
            ) : (
              line.text
            )}
          </div>
        ))}
      </div>
      <form className="term-form" onSubmit={submit}>
        <label htmlFor={inputId} className="term-prompt" aria-hidden="true">
          $
        </label>
        <input
          id={inputId}
          type="text"
          className="term-input"
          aria-label="Command"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </form>
    </section>
  );
}
