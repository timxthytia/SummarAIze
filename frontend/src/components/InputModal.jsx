import React, { useEffect, useRef } from "react";
import "../styles/InputModal.css";

export default function InputModal({
  isOpen,
  title,
  placeholder = "Enter text…",
  value,
  onChange,
  onClose,
  onSubmit,
  submitText = "Save",
  disableConfirm = false,
  autoFocus = true,
  showCancel = true,
  closeOnOverlay = true,
  children,
}) {
  const inputRef = useRef(null);
  const dialogTitleId = "input-modal-title";
  const isSubmitDisabled = () => disableConfirm || !String(value || "").trim();

  useEffect(() => {
    if (!isOpen) return;
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [isOpen, autoFocus]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter" && !isSubmitDisabled()) onSubmit?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, disableConfirm, value, onClose, onSubmit]);

  if (!isOpen) return null;

  return (
    <div
      className="input-modal-overlay"
      onClick={() => closeOnOverlay && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
    >
      <div
        className="input-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 id={dialogTitleId}>{title}</h3>}

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          autoComplete="off"
        />

        {children}

        <div className="input-modal-actions">
          {showCancel && (
            <button
              type="button"
              className="input-modal-button"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="input-modal-button"
            onClick={onSubmit}
            disabled={isSubmitDisabled()}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}