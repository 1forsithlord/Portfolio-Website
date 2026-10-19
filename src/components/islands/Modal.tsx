import { useEffect, useRef, type ReactNode } from "react";
import "../../styles/overlay.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  children: ReactNode;
}

/**
  A dialog built on the native <dialog> element. showModal() gives focus
  trapping, an inert page behind it, Escape handling and focus return for free.
  Children mount only while open, so every opening starts fresh.
*/
export function Modal({ open, onClose, label, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={label}
      onCancel={(event) => {
        // Escape: let React state close the dialog, so state and DOM never disagree.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog itself, not on its content.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}