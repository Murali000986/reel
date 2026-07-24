import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { ArrowLeft, UserCircle, LogOut, Save, Loader2 } from 'lucide-react';

export function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { authFetch } = useApi();
  const [, setLocation] = useLocation();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setUsername(profile.username);
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await authFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, username, bio }),
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: any) {
      alert(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24" id="settings-page">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200 shadow-sm">
        <button onClick={() => setLocation('/')} className="text-gray-500 hover:text-gray-900 p-1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-gray-900 font-bold text-lg flex-1">Edit Profile</h1>
      </div>

      <div className="px-5 pt-8 space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/20 ring-offset-2"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <UserCircle className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <p className="text-gray-400 text-xs">Avatar from Google account</p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[
            { label: 'Display Name', value: displayName, set: setDisplayName, id: 'input-displayname', placeholder: 'Your name' },
            { label: 'Username', value: username, set: setUsername, id: 'input-username', placeholder: '@username' },
          ].map(f => (
            <div key={f.id}>
              <label className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 block">{f.label}</label>
              <input
                id={f.id}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
          ))}

          <div>
            <label className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 block">Bio</label>
            <textarea
              id="input-bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="Tell people about yourself..."
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm resize-none"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          id="save-profile-btn"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
          style={{ background: success ? '#00a86b' : '#e60023' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? '✓ Saved!' : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>

        {/* Sign Out */}
        <div className="pt-4 border-t border-gray-200">
          <button
            id="signout-btn"
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-2xl text-red-500 font-bold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-red-50 bg-white border border-red-100 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
