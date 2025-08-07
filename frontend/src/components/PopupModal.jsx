import React from 'react';
import '../styles/PopupModal.css';

const PopupModal = ({
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText
}) => {
  return (
    <div className="popup-modal-overlay">
      <div className="popup-modal">
        <p>{message}</p>
        <div>
          {cancelText ? (
            <>
              <button onClick={onConfirm} className="popup-close-button">{confirmText || 'OK'}</button>
              <button onClick={onCancel} className="popup-close-button">{cancelText}</button>
            </>
          ) : (
            <button onClick={onConfirm} className="popup-close-button">{confirmText || 'OK'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupModal;