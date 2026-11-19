import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PasswordModal } from "../components/PasswordModal.jsx";
import { AccountsTable } from "../components/AccountsTable.jsx";
import api from "../services/api.js";
import { AlertCircle } from "lucide-react";

export function ManagePasswords() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  // Check if user is admin
  const isAdmin = user?.role === "Administrator";

  // Fetch users
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.get("/users");
      setAccounts(data || []);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to load accounts");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAccounts();
    }
  }, [isAdmin, fetchAccounts]);

  // Handle update password
  const handleUpdatePassword = (account) => {
    setSelectedAccount({
      ...account,
      isOwnAccount: account._id === user._id,
    });
    setIsModalOpen(true);
  };

  const handlePasswordSubmit = async ({ newPassword, confirmPassword }) => {
    if (!selectedAccount) return;

    setIsSubmitting(true);
    try {
      await api.put(`/users/${selectedAccount._id}/password`, {
        newPassword,
        confirmPassword,
      });

      // Show success toast
      setToast(`Password updated for ${selectedAccount.email}`);
      setTimeout(() => setToast(""), 4000);

      // Close modal
      setIsModalOpen(false);
      setSelectedAccount(null);

      // Refresh accounts list
      await fetchAccounts();
    } catch (err) {
      throw new Error(err?.data?.message || err?.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(null);
  };

  if (!isAdmin) {
    return (
      <div className="main-area">
        <div className="topbar">
          <div>
            <p className="breadcrumb">Aroma workspace / Roles & access</p>
            <h1>Access Denied</h1>
          </div>
          <div className="role-pill">{user?.role}</div>
        </div>

        <div className="panel" style={{ maxWidth: "600px", textAlign: "center" }}>
          <div style={{ marginBottom: "20px" }}>
            <AlertCircle size={48} style={{ color: "#a3332b", margin: "0 auto 12px", display: "block" }} />
          </div>
          <h2>Access Denied</h2>
          <p style={{ color: "#59675f", marginBottom: "24px" }}>
            Only administrators can access this page. If you believe this is an error, please contact your admin.
          </p>
          <button
            className="primary"
            onClick={() => window.location.href = "/"}
            style={{ display: "inline-flex" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="toast-notification">
          ✓ {toast}
        </div>
      )}

      <div className="panel" style={{ maxWidth: "600px" }}>
        {/* Subtitle and info */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "#59675f", fontSize: "14px", lineHeight: "1.5" }}>
            Set a new password for any account. Existing passwords are stored securely and can't be viewed.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <div>
              <strong>{error}</strong>
              <button
                className="secondary"
                onClick={fetchAccounts}
                style={{ marginLeft: "auto", marginTop: 0 }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <AccountsTable
          accounts={accounts}
          currentUserId={user?._id}
          isLoading={isLoading && accounts.length === 0}
          onUpdatePassword={handleUpdatePassword}
        />
      </div>

      {/* Password Modal */}
      {isModalOpen && selectedAccount && (
        <PasswordModal
          account={selectedAccount}
          onClose={handleCloseModal}
          onSubmit={handlePasswordSubmit}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}
