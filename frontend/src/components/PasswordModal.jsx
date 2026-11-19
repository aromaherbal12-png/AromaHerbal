import { useState, useEffect, useRef } from "react";
import { Key, Eye, EyeOff, Check, X } from "lucide-react";

export function PasswordModal({ account, onClose, onSubmit, isLoading }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });
  const firstInputRef = useRef(null);

  const password = newPassword;
  const minLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const isValid = minLength && hasLetter && hasNumber && passwordsMatch;

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      setError("");
      await onSubmit({ newPassword, confirmPassword });
      setNewPassword("");
      setConfirmPassword("");
      setTouched({ newPassword: false, confirmPassword: false });
    } catch (err) {
      setError(err.message || "Failed to update password");
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="password-modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className="password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
        {/* Header */}
        <div className="password-modal-header">
          <div className="password-modal-header-content">
            <div className="password-modal-icon">
              <Key size={24} />
            </div>
            <div>
              <h2 id="password-modal-title">Update password</h2>
              <p className="password-modal-email">{account.email}</p>
              <div className="password-modal-role">
                <span className="role-pill">{account.role}</span>
              </div>
            </div>
          </div>
          <button
            className="password-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* You note */}
        {account.isOwnAccount && (
          <div className="password-modal-note">
            You are changing your own password.
          </div>
        )}

        {/* Error message */}
        {error && <div className="password-modal-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="password-modal-form">
          {/* New Password Field */}
          <div className="password-field">
            <label htmlFor="new-password">
              New password
              <div className="password-input-wrapper">
                <input
                  ref={firstInputRef}
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex="-1"
                >
                  {showNewPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>
            {touched.newPassword && newPassword && (
              <div className="password-error">
                {!minLength && "At least 8 characters"}
                {!hasLetter && "At least one letter"}
                {!hasNumber && "At least one number"}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="password-field">
            <label htmlFor="confirm-password">
              Confirm password
              <div className="password-input-wrapper">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                  placeholder="Confirm password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>
            {touched.confirmPassword && confirmPassword && !passwordsMatch && (
              <div className="password-error">
                Passwords do not match
              </div>
            )}
          </div>

          {/* Strength Checker & Checklist */}
          <div className="password-checker">
            <div className="password-strength">
              <label>Password strength</label>
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${(
                      (minLength ? 1 : 0) +
                      (hasLetter ? 1 : 0) +
                      (hasNumber ? 1 : 0)
                    ) * 33.33}%`,
                  }}
                />
              </div>
              <span className="strength-label">
                {minLength && hasLetter && hasNumber
                  ? "Strong"
                  : minLength && hasLetter
                  ? "Fair"
                  : "Weak"}
              </span>
            </div>

            <div className="password-checklist">
              <div
                className={`checklist-item ${minLength ? "met" : ""}`}
              >
                <Check size={16} />
                <span>At least 8 characters</span>
              </div>
              <div
                className={`checklist-item ${hasLetter ? "met" : ""}`}
              >
                <Check size={16} />
                <span>At least one letter</span>
              </div>
              <div
                className={`checklist-item ${hasNumber ? "met" : ""}`}
              >
                <Check size={16} />
                <span>At least one number</span>
              </div>
              <div
                className={`checklist-item ${passwordsMatch && newPassword ? "met" : ""}`}
              >
                <Check size={16} />
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="password-modal-footer">
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
