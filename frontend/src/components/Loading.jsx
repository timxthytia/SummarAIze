import React from "react";
import "../styles/Loading.css";

export default function Loading({ message = "Loading..." }) {
  return (
    <div className="loading-overlay">
      <div className="loading-box">
        <div className="spinner" aria-label="loading" />
        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
}