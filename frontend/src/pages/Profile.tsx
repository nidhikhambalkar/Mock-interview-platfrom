import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { API_URL } from '../api';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Link as LinkIcon,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  GraduationCap,
  Code2,
  Target,
  Calendar,
  Shield,
  Trash2,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileData {
  full_name: string;
  phone: string;
  bio: string;
  location: string;
  job_title: string;
  company: string;
  education: string;
  years_experience: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  skills: string;
  target_roles: string;
  target_domains: string;
  gender: string;
}

const defaultProfile: ProfileData = {
  full_name: '',
  phone: '',
  bio: '',
  location: '',
  job_title: '',
  company: '',
  education: '',
  years_experience: '',
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  skills: '',
  target_roles: '',
  target_domains: '',
  gender: '',
};

const AVATAR_OPTIONS: Record<string, string[]> = {
  Male: [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Buddy',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Christian',
  ],
  Female: [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sara',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bella',
  ],
  Other: [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Charlie',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jordan',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Taylor',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Morgan',
  ]
};

export const Profile: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'career' | 'links'>('personal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser(u);
        
        let meta = u.user_metadata || {};
        
        try {
          const response = await fetch(`${API_URL}/api/users/profile`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data?.profile) {
              meta = { ...meta, ...data.profile };
            }
          }
        } catch (err) {
          console.warn('Could not load profile from backend database:', err);
        }

        setProfile({
          full_name: meta.full_name || meta.name || '',
          phone: meta.phone || '',
          bio: meta.bio || '',
          location: meta.location || '',
          job_title: meta.job_title || '',
          company: meta.company || '',
          education: meta.education || '',
          years_experience: meta.years_experience || '',
          linkedin_url: meta.linkedin_url || '',
          github_url: meta.github_url || '',
          portfolio_url: meta.portfolio_url || '',
          skills: meta.skills || '',
          target_roles: meta.target_roles || '',
          target_domains: meta.target_domains || '',
          gender: meta.gender || '',
        });
        setAvatarPreview(meta.avatar_url || null);
      }
    });
  }, []);
  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => {
      const nextProfile = { ...prev, [field]: value };
      if (field === 'gender') {
        const genderKey = (value === 'Male' || value === 'Female' || value === 'Other') ? value : 'Other';
        const currentIsDefault = !avatarPreview || Object.values(AVATAR_OPTIONS).flat().includes(avatarPreview);
        if (currentIsDefault) {
          const defaultAvatar = AVATAR_OPTIONS[genderKey][0];
          setAvatarPreview(defaultAvatar);
        }
      }
      return nextProfile;
    });
    setSaveStatus('idle');
  };
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...profile,
          avatar_url: avatarPreview,
        },
      });

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch(`${API_URL}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            ...profile,
            avatar_url: avatarPreview
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save profile to remote database.');
        }
      }

      setSaveStatus('success');
      setSaveMessage('Profile saved successfully!');
    } catch (err: any) {
      console.error('Profile save failed:', err);
      if (user?.id) {
        localStorage.setItem(`weintern_profile_${user.id}`, JSON.stringify(profile));
        setSaveStatus('success');
        setSaveMessage('Profile saved locally (demo mode backup).');
      } else {
        setSaveStatus('error');
        setSaveMessage(err.message || 'Failed to save profile.');
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const displayEmail = user?.email?.includes('@phone.weintern.com')
    ? user.email.replace('@phone.weintern.com', '') + ' (phone)'
    : user?.email || '';

  const displayName = profile.full_name || user?.user_metadata?.name || displayEmail.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const tabs = [
    { id: 'personal' as const, label: 'Personal', icon: User },
    { id: 'career' as const, label: 'Career', icon: Briefcase },
    { id: 'links' as const, label: 'Links & Skills', icon: LinkIcon },
  ];

  return (
    <div className="min-h-screen bg-dark-950 py-10 px-4">
      {/* Ambient glow */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent-orange/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">My Profile</h1>
            <p className="text-dark-400 text-sm mt-1">Manage your personal information and preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-400 to-accent-orange text-dark-950 font-bold rounded-xl hover:from-brand-500 hover:to-brand-600 transition-all transform active:scale-[0.97] text-sm shadow-lg shadow-brand-500/20 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Save Status Toast */}
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border animate-fade-in ${
            saveStatus === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {saveStatus === 'success'
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />
            }
            {saveMessage}
          </div>
        )}

        {/* Avatar + Identity Card */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              onClick={handleAvatarClick}
              className="w-24 h-24 rounded-2xl border-2 border-brand-500/30 bg-brand-500/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-500/60 transition-all group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-brand-400">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={handleAvatarClick}
              className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shadow-lg hover:bg-brand-400 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Identity */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-dark-400 text-sm mt-0.5">{displayEmail}</p>
            {profile.job_title && (
              <p className="text-brand-400 text-sm font-medium mt-1">
                {profile.job_title}{profile.company ? ` @ ${profile.company}` : ''}
              </p>
            )}
            <p className="text-dark-500 text-xs mt-2 flex items-center justify-center sm:justify-start gap-1">
              <Calendar className="w-3 h-3" />
              Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex sm:flex-col gap-4 sm:gap-2 text-center">
            <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2">
              <div className="text-brand-400 font-extrabold text-lg">
                {JSON.parse(localStorage.getItem(`weintern_profile_${user?.id}`) || '{}')?.skills?.split(',')?.filter(Boolean)?.length || 0}
              </div>
              <div className="text-dark-500 text-[10px] uppercase tracking-wide">Skills</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === id
                  ? 'bg-gradient-to-r from-brand-400 to-accent-orange text-dark-950 shadow-md'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 space-y-5">

          {/* ── Personal Tab ── */}
          {activeTab === 'personal' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle icon={User} label="Basic Information" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  icon={User}
                  label="Full Name"
                  placeholder="e.g. Priya Sharma"
                  value={profile.full_name}
                  onChange={v => handleChange('full_name', v)}
                />
                <Field
                  icon={Phone}
                  label="Phone Number"
                  placeholder="e.g. +91 9876543210"
                  value={profile.phone}
                  onChange={v => handleChange('phone', v)}
                />
              </div>

              <Field
                icon={Mail}
                label="Email"
                value={displayEmail}
                disabled
                placeholder="Your login email"
              />

              <TextareaField
                icon={User}
                label="Bio / About Me"
                placeholder="Write a short bio about yourself, your background, and career aspirations..."
                value={profile.bio}
                onChange={v => handleChange('bio', v)}
                rows={4}
              />
              <Field
                icon={MapPin}
                label="Location"
                placeholder="e.g. Bengaluru, India"
                value={profile.location}
                onChange={v => handleChange('location', v)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Gender</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
                    <User className="w-4 h-4" />
                  </div>
                  <select
                    value={profile.gender}
                    onChange={e => handleChange('gender', e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/8 focus:border-brand-500/50 hover:border-white/15 rounded-xl text-sm text-white placeholder-dark-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-dark-900 text-dark-400">Select Gender</option>
                    <option value="Male" className="bg-dark-900 text-white">Male</option>
                    <option value="Female" className="bg-dark-900 text-white">Female</option>
                    <option value="Other" className="bg-dark-900 text-white">Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-dark-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wide block">Choose Profile Picture</label>
                <div className="flex flex-wrap gap-3 p-4 bg-white/3 border border-white/5 rounded-2xl">
                  {AVATAR_OPTIONS[profile.gender || 'Other'].map((avatarUrl) => {
                    const isSelected = avatarPreview === avatarUrl;
                    return (
                      <button
                        key={avatarUrl}
                        type="button"
                        onClick={() => setAvatarPreview(avatarUrl)}
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden transition-all transform active:scale-90 hover:scale-105 cursor-pointer flex-shrink-0 ${
                          isSelected 
                            ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20' 
                            : 'border-white/5 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        <img src={avatarUrl} alt="Avatar option" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className={`w-14 h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all transform active:scale-90 hover:scale-105 cursor-pointer flex-shrink-0 ${
                      avatarPreview && !Object.values(AVATAR_OPTIONS).flat().includes(avatarPreview)
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                        : 'border-white/10 hover:border-white/20 text-dark-400 hover:text-white bg-white/3'
                    }`}
                    title="Upload Custom Image"
                  >
                    <Camera className="w-4 h-4 text-brand-400" />
                    <span className="text-[9px]">Custom</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Career Tab ── */}
          {activeTab === 'career' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle icon={Briefcase} label="Career Details" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  icon={Briefcase}
                  label="Job Title / Role"
                  placeholder="e.g. Software Engineer Intern"
                  value={profile.job_title}
                  onChange={v => handleChange('job_title', v)}
                />
                <Field
                  icon={Briefcase}
                  label="Company / Organization"
                  placeholder="e.g. WeIntern Technologies"
                  value={profile.company}
                  onChange={v => handleChange('company', v)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  icon={GraduationCap}
                  label="Education"
                  placeholder="e.g. B.Tech Computer Science, IIT Delhi"
                  value={profile.education}
                  onChange={v => handleChange('education', v)}
                />
                <Field
                  icon={Calendar}
                  label="Years of Experience"
                  placeholder="e.g. 0 - 1 year (Fresher)"
                  value={profile.years_experience}
                  onChange={v => handleChange('years_experience', v)}
                />
              </div>

              <SectionTitle icon={Target} label="Interview Goals" />

              <Field
                icon={Target}
                label="Target Job Roles"
                placeholder="e.g. Frontend Developer, Product Manager, Data Analyst"
                value={profile.target_roles}
                onChange={v => handleChange('target_roles', v)}
              />
              <Field
                icon={Target}
                label="Target Domains / Industries"
                placeholder="e.g. FinTech, EdTech, SaaS"
                value={profile.target_domains}
                onChange={v => handleChange('target_domains', v)}
              />
            </div>
          )}

          {/* ── Links & Skills Tab ── */}
          {activeTab === 'links' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle icon={Code2} label="Skills" />

              <TextareaField
                icon={Code2}
                label="Technical & Soft Skills (comma-separated)"
                placeholder="e.g. React, Python, SQL, Communication, Problem Solving, Leadership..."
                value={profile.skills}
                onChange={v => handleChange('skills', v)}
                rows={3}
              />

              {/* Skills Tags Preview */}
              {profile.skills && (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.split(',').filter(s => s.trim()).map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-medium">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              )}

              <SectionTitle icon={LinkIcon} label="Social Links" />

              <Field
                icon={LinkIcon}
                label="LinkedIn Profile URL"
                placeholder="https://linkedin.com/in/yourname"
                value={profile.linkedin_url}
                onChange={v => handleChange('linkedin_url', v)}
                type="url"
              />
              <Field
                icon={LinkIcon}
                label="GitHub Profile URL"
                placeholder="https://github.com/yourname"
                value={profile.github_url}
                onChange={v => handleChange('github_url', v)}
                type="url"
              />
              <Field
                icon={LinkIcon}
                label="Portfolio / Website URL"
                placeholder="https://yourportfolio.com"
                value={profile.portfolio_url}
                onChange={v => handleChange('portfolio_url', v)}
                type="url"
              />
            </div>
          )}
        </div>

        {/* Account & Security Section */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 space-y-4">
          <SectionTitle icon={Shield} label="Account & Security" />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-xs text-dark-500 mb-0.5">Account ID</p>
              <p className="text-xs text-dark-300 font-mono truncate">{user?.id || 'Loading...'}</p>
            </div>
            <div className="flex-1 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-xs text-dark-500 mb-0.5">Auth Provider</p>
              <p className="text-xs text-dark-300 capitalize">{user?.app_metadata?.provider || 'email'}</p>
            </div>
          </div>
          <p className="text-xs text-dark-500 flex items-center gap-1.5">
            <Trash2 className="w-3 h-3 text-red-500/50" />
            To delete your account or change your password, contact support.
          </p>
        </div>

        {/* Bottom Save */}
        <div className="flex justify-end pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-400 to-accent-orange text-dark-950 font-extrabold rounded-xl hover:from-brand-500 hover:to-brand-600 transition-all transform active:scale-[0.97] text-sm shadow-xl shadow-brand-500/20 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Reusable sub-components ──

interface SectionTitleProps {
  icon: React.FC<{ className?: string }>;
  label: string;
}
const SectionTitle: React.FC<SectionTitleProps> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 pb-1 border-b border-white/5">
    <Icon className="w-4 h-4 text-brand-400" />
    <span className="text-sm font-bold text-white">{label}</span>
  </div>
);

interface FieldProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  placeholder?: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  type?: string;
}
const Field: React.FC<FieldProps> = ({ icon: Icon, label, placeholder, value, onChange, disabled, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-dark-400 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
        <Icon className="w-4 h-4" />
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-sm text-white placeholder-dark-500 outline-none transition-all ${
          disabled
            ? 'border-white/3 text-dark-400 cursor-not-allowed opacity-60'
            : 'border-white/8 focus:border-brand-500/50 hover:border-white/15'
        }`}
      />
    </div>
  </div>
);

interface TextareaFieldProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}
const TextareaField: React.FC<TextareaFieldProps> = ({ icon: Icon, label, placeholder, value, onChange, rows = 3 }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-dark-400 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none text-dark-500">
        <Icon className="w-4 h-4" />
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/8 focus:border-brand-500/50 hover:border-white/15 rounded-xl text-sm text-white placeholder-dark-500 outline-none transition-all resize-none"
      />
    </div>
  </div>
);

export default Profile;
