import { useState, useRef } from "react";
import AppHeader from "../components/AppHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import api, { receiptImageUrl as imageUrl } from "../lib/api";

const inputCls = "mt-1.5 w-full rounded-xl border border-ink/15 dark:border-white/10 bg-white/50 dark:bg-black/20 text-ink dark:text-white px-4 py-2.5 text-sm outline-none focus:border-cover focus:ring-2 focus:ring-cover/20 transition-all backdrop-blur-sm";
const labelCls = "text-[10px] font-mono uppercase tracking-widest text-ink/50 dark:text-white/50";
const btnCls = "w-full bg-cover text-paper rounded-[1rem] py-3 text-sm font-medium hover:bg-cover-light transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60";

export default function Profile() {
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingInfo, setSavingInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleUpdateInfo(e) {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await api.put("/user/profile", { name, email });
      updateUser(res.data.user);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match");
    }
    
    setSavingPassword(true);
    try {
      await api.put("/user/password", { currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const uploadRes = await api.post("/uploads/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newAvatarUrl = uploadRes.data.url;
      
      const res = await api.put("/user/profile", { avatarUrl: newAvatarUrl });
      updateUser(res.data.user);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    try {
      const res = await api.put("/user/profile", { avatarUrl: null });
      updateUser(res.data.user);
      toast.success("Avatar removed");
    } catch (err) {
      toast.error("Failed to remove avatar");
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-dark-bg transition-colors flex flex-col">
      <AppHeader crumb="Profile" />
      
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-8 pb-32">
        <h1 className="text-3xl font-display font-medium text-ink dark:text-dark-ink mb-8">
          Your Profile
        </h1>

        <div className="space-y-8">
          {/* Avatar Section */}
          <section className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-medium text-ink dark:text-dark-ink mb-6">Avatar</h2>
            <div className="flex items-center gap-6">
              <div className="relative group">
                {user?.avatarUrl ? (
                  <img src={imageUrl(user.avatarUrl)} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-dark-surface shadow-md" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-cover flex items-center justify-center text-white text-3xl font-medium border-4 border-white dark:border-dark-surface shadow-md">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? "..." : "Change"}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 bg-ink/5 dark:bg-white/5 hover:bg-ink/10 dark:hover:bg-white/10 text-ink dark:text-dark-ink text-sm font-medium rounded-xl transition-colors"
                >
                  Upload New
                </button>
                {user?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2 text-owe/80 hover:text-owe hover:bg-owe/10 text-sm font-medium rounded-xl transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Personal Info */}
          <section className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-medium text-ink dark:text-dark-ink mb-6">Personal Details</h2>
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <label className="block">
                <span className={labelCls}>Name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </label>
              
              <label className="block">
                <span className={labelCls}>Email Address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </label>

              <div className="pt-2">
                <button type="submit" disabled={savingInfo} className={btnCls}>
                  {savingInfo ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>

          {/* Security */}
          <section className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-ink/10 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-medium text-ink dark:text-dark-ink mb-6">Security</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <label className="block">
                <span className={labelCls}>Current Password</span>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputCls}
                />
              </label>
              
              <label className="block">
                <span className={labelCls}>New Password</span>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="block">
                <span className={labelCls}>Confirm New Password</span>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls}
                />
              </label>

              <div className="pt-2">
                <button type="submit" disabled={savingPassword} className={btnCls}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
