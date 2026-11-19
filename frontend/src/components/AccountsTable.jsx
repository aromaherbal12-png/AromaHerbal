import { Key } from "lucide-react";

export function AccountsTable({ accounts, currentUserId, isLoading, onUpdatePassword }) {
  if (isLoading) {
    return (
      <div className="accounts-list">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="account-item skeleton-item">
            <div className="skeleton-line" style={{ width: "40%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="empty-state">
        No accounts found.
      </div>
    );
  }

  return (
    <div className="accounts-list">
      {accounts.map((account) => (
        <div key={account._id} className="account-item">
          <div className="account-email-wrapper">
            <span className="account-email">{account.email}</span>
            {account._id === currentUserId && (
              <span className="you-tag">You</span>
            )}
          </div>
          <button
            className="update-password-btn"
            onClick={() => onUpdatePassword(account)}
            title={`Update password for ${account.email}`}
          >
            <Key size={16} />
            Update
          </button>
        </div>
      ))}
    </div>
  );
}
