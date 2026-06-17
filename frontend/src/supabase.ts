import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { API_URL, fetchJson } from './api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = !supabaseUrl || 
                      supabaseUrl.includes('your-supabase-project-url') || 
                      !supabaseUrl.startsWith('https://') ||
                      !supabaseAnonKey ||
                      supabaseAnonKey.includes('your-supabase-anon-key');

if (isPlaceholder) {
  console.warn('⚠️ WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is placeholder. Running frontend in local Mock Database Mode.');
}

// Build a base64-encoded mock JWT containing user identity so the backend can isolate per-user data
function buildMockToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || '',
    avatar_url: user.user_metadata?.avatar_url || '',
    gender: user.user_metadata?.gender || ''
  };
  return `mock-jwt-token-${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
}

function buildSession(user: any) {
  return {
    user,
    access_token: buildMockToken(user),
    expires_at: 9999999999,
    expires_in: 3600,
    token_type: 'bearer',
    refresh_token: 'mock-refresh-token'
  };
}

function getStoredUsers(): any[] {
  try { return JSON.parse(localStorage.getItem('mock_db_users') || '[]'); } catch { return []; }
}

function saveStoredUsers(users: any[]) {
  localStorage.setItem('mock_db_users', JSON.stringify(users));
}

function getCurrentUser(): any | null {
  try {
    const raw = localStorage.getItem('mock_supabase_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCurrentUser(user: any) {
  localStorage.setItem('mock_supabase_user', JSON.stringify(user));
}

class MockSupabaseClient {
  isMock = true;

  private listeners: any[] = [];

  private notifyListeners(event: string, session: any) {
    this.listeners.forEach(cb => {
      try { cb(event, session); } catch { /* ignore */ }
    });
  }

  auth = {
    _self: this as MockSupabaseClient,

    async getSession() {
      const user = getCurrentUser();
      if (!user) return { data: { session: null }, error: null };
      return { data: { session: buildSession(user) }, error: null };
    },

    onAuthStateChange(callback: any) {
      const self = this._self;
      self.listeners.push(callback);
      // Fire immediately with current session
      this.getSession().then(({ data: { session } }) => {
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              self.listeners = self.listeners.filter(cb => cb !== callback);
            }
          }
        }
      };
    },

    // Google-style OAuth — in demo mode we just create/find the user by email directly
    async signInWithOAuth(options: any) {
      const email = options?.options?.queryParams?.email || 'candidate@weintern.com';
      const name = email.split('@')[0];
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

      const users = getStoredUsers();
      let user = users.find((u: any) => u.email === email);

      if (!user) {
        user = {
          id: `mock-user-${Math.random().toString(36).substr(2, 9)}`,
          email,
          user_metadata: {
            full_name: capitalizedName,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
            gender: ''
          }
        };
        users.push(user);
        saveStoredUsers(users);
      }

      saveCurrentUser(user);
      const session = buildSession(user);
      this._self.notifyListeners('SIGNED_IN', session);

      return { data: { provider: 'google', url: '' }, error: null };
    },

    async signOut() {
      localStorage.removeItem('mock_supabase_user');
      this._self.notifyListeners('SIGNED_OUT', null);
      return { error: null };
    },

    async signUp(credentials: { email: string; password?: string; options?: any }) {
      const { email, password, options } = credentials;
      const fullName = options?.data?.full_name || '';

      const users = getStoredUsers();
      if (users.some((u: any) => u.email === email)) {
        return { data: { user: null, session: null }, error: { message: 'User already registered' } };
      }

      const mockUser = {
        id: `mock-user-${Math.random().toString(36).substr(2, 9)}`,
        email,
        password,
        user_metadata: {
          full_name: fullName,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
          gender: ''
        }
      };

      users.push(mockUser);
      saveStoredUsers(users);
      saveCurrentUser(mockUser);

      const session = buildSession(mockUser);
      this._self.notifyListeners('SIGNED_IN', session);

      return { data: { user: mockUser as any, session }, error: null };
    },

    async signInWithPassword(credentials: { email: string; password?: string }) {
      const { email, password } = credentials;
      const users = getStoredUsers();
      const user = users.find((u: any) => u.email === email);

      if (!user) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }
      if (user.password !== password) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }

      saveCurrentUser(user);
      const session = buildSession(user);
      this._self.notifyListeners('SIGNED_IN', session);

      return { data: { user: user as any, session }, error: null };
    },

    async updateUser(attributes: { data?: any }) {
      const user = getCurrentUser();
      if (!user) return { data: { user: null }, error: { message: 'No active session' } };

      user.user_metadata = {
        ...(user.user_metadata || {}),
        ...(attributes.data || {})
      };

      saveCurrentUser(user);

      // Sync in users registry too
      const users = getStoredUsers();
      const idx = users.findIndex((u: any) => u.id === user.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], user_metadata: user.user_metadata };
        saveStoredUsers(users);
      }

      const session = buildSession(user);
      this._self.notifyListeners('USER_UPDATED', session);

      return { data: { user }, error: null };
    }
  };

  from(table: string) {
    return {
      select: () => {
        return {
          eq: (column: string, value: any) => {
            const builder = {
              single: async () => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
                const item = data.find((row: any) => row[column] === value);
                return { data: item || null, error: item ? null : { message: 'Not found' } };
              },
              order: async (col: string, opt?: { ascending?: boolean }) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
                let filtered = data.filter((row: any) => row[column] === value);

                // Fallback for session_answers: fetch from backend if not in localStorage
                if (filtered.length === 0 && table === 'session_answers' && column === 'session_id') {
                  try {
                    const currentUser = getCurrentUser();
                    const token = currentUser ? buildMockToken(currentUser) : 'mock-jwt-token-fallback';
                    try {
                      const payload = await fetchJson(`${API_URL}/api/sessions/${value}/answers`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (payload?.answers?.length > 0) {
                        filtered = payload.answers;
                        const existing = JSON.parse(localStorage.getItem('mock_db_session_answers') || '[]');
                        const merged = existing.filter((a: any) => a.session_id !== value);
                        localStorage.setItem('mock_db_session_answers', JSON.stringify([...merged, ...payload.answers]));
                      }
                    } catch (err) {
                      console.error('Error fetching answers fallback:', err);
                    }
                  } catch (err) {
                    console.error('Error fetching answers fallback:', err);
                  }
                }

                if (col) {
                  filtered.sort((a: any, b: any) => {
                    const valA = a[col], valB = b[col];
                    if (valA < valB) return opt?.ascending ? -1 : 1;
                    if (valA > valB) return opt?.ascending ? 1 : -1;
                    return 0;
                  });
                }
                return { data: filtered, error: null };
              },
              then: async (resolve: any) => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
                const filtered = data.filter((row: any) => row[column] === value);
                resolve({ data: filtered, error: null });
              }
            };
            return builder;
          },
          then: async (resolve: any) => {
            const data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
            resolve({ data, error: null });
          }
        };
      },
      insert: (rows: any) => {
        const rowArray = Array.isArray(rows) ? rows : [rows];
        const existing = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');

        const newRows = rowArray.map((row: any) => {
          const newRow = {
            id: row.id || `mock-${table}-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            ...row
          };
          existing.push(newRow);
          return newRow;
        });

        localStorage.setItem(`mock_db_${table}`, JSON.stringify(existing));

        return {
          select: () => ({
            single: async () => ({ data: newRows[0], error: null }),
            then: async (resolve: any) => resolve({ data: newRows, error: null })
          }),
          then: async (resolve: any) => resolve({ data: newRows, error: null })
        };
      },
      update: (attrs: any) => {
        return {
          eq: (column: string, value: any) => ({
            then: async (resolve: any) => {
              const data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
              const updated = data.map((row: any) =>
                row[column] === value ? { ...row, ...attrs } : row
              );
              localStorage.setItem(`mock_db_${table}`, JSON.stringify(updated));
              resolve({ data: updated.filter((r: any) => r[column] === value), error: null });
            }
          })
        };
      }
    };
  }
}

export const supabase = (isPlaceholder
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey)) as SupabaseClient;
