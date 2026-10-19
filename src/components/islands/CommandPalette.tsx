import { useEffect, useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Modal } from "./Modal";
import { buildCommands, filterCommands, type Command } from "../../lib/commands";

/**
  Ctrl/⌘ K opens a jump list of pages, projects and links. It also has a visible
  button, so phones and mouse users can reach it too.
*/
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const commands = useMemo(() => buildCommands(), []);
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  const openPalette = () => {
    setQuery("");
    setActive(0);
    setOpen(true);
  };
  const closePalette = () => setOpen(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
      if (combo && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // openPalette and closePalette only set state, so they do not need to be dependencies.
  }, [open]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const run = (command: Command) => {
    closePalette();
    if (command.external) window.open(command.href, "_blank", "noopener,noreferrer");
    else window.location.assign(command.href);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = results[active];
      if (choice) run(choice);
    }
  };

  return (
    <>
      <button type="button" className="palette-trigger" onClick={openPalette} aria-keyshortcuts="Control+K Meta+K">
        Search <kbd>Ctrl/⌘ K</kbd>
      </button>

      <Modal open={open} onClose={closePalette} label="Command palette">
        <div className="palette">
          <input
            type="text"
            className="palette-input"
            role="combobox"
            aria-label="Search pages and projects"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Jump to a page or project…"
            value={query}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <ul id={listId} role="listbox" aria-label="Results" className="palette-list">
            {results.length === 0 ? (
              <li role="presentation" className="palette-empty">
                No matches
              </li>
            ) : (
              results.map((command, index) => (
                <li
                  key={command.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  className="palette-item"
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(command)}
                >
                  <span>{command.title}</span>
                  <span className="palette-group">{command.group}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>
    </>
  );
}