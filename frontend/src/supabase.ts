import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

class MockSupabaseClient {
  isMock = true;

  auth = {
    async getSession() {
      const userJson = localStorage.getItem('mock_supabase_user');
      if (!userJson) return { data: { session: null }, error: null };
      const user = JSON.parse(userJson);
      return {
        data: {
          session: {
            user,
            access_token: 'mock-jwt-token-12345',
            expires_at: 9999999999,
            expires_in: 3600,
            token_type: 'bearer',
            refresh_token: 'mock-refresh-token'
          }
        },
        error: null
      };
    },
    onAuthStateChange(callback: any) {
      this.getSession().then(({ data: { session } }) => {
        callback('SIGNED_IN', session);
      });
      return {
        data: {
          subscription: {
            unsubscribe() {}
          }
        }
      };
    },
    async signInWithOAuth(options: any) {
      const mockUser = {
        id: 'mock-user-123',
        email: 'candidate@weintern.com',
        user_metadata: {
          full_name: 'Demo Candidate',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        }
      };
      localStorage.setItem('mock_supabase_user', JSON.stringify(mockUser));
      setTimeout(() => {
        window.location.href = options?.options?.redirectTo || window.location.origin;
      }, 500);
      return { data: { provider: 'google', url: '' }, error: null };
    },
    async signOut() {
      localStorage.removeItem('mock_supabase_user');
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return { error: null };
    },
    async signUp(credentials: { email: string; password?: string; options?: any }) {
      const { email, password, options } = credentials;
      const fullName = options?.data?.full_name || '';
      
      const users = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
      const exists = users.some((u: any) => u.email === email);
      if (exists) {
        return { data: { user: null, session: null }, error: { message: 'User already exists' } };
      }
      
      const mockUser = {
        id: `mock-user-${Math.random().toString(36).substr(2, 9)}`,
        email,
        password,
        user_metadata: {
          full_name: fullName,
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        }
      };
      
      users.push(mockUser);
      localStorage.setItem('mock_db_users', JSON.stringify(users));
      localStorage.setItem('mock_supabase_user', JSON.stringify(mockUser));
      
      return { 
        data: { 
          user: mockUser as any, 
          session: { 
            user: mockUser as any, 
            access_token: `mock-jwt-token-${mockUser.id}`,
            expires_at: 9999999999,
            expires_in: 3600,
            token_type: 'bearer',
            refresh_token: 'mock-refresh-token'
          } 
        }, 
        error: null 
      };
    },
    async signInWithPassword(credentials: { email: string; password?: string }) {
      const { email, password } = credentials;
      const users = JSON.parse(localStorage.getItem('mock_db_users') || '[]');
      
      const user = users.find((u: any) => u.email === email);
      if (!user) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }
      if (user.password !== password) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }
      
      localStorage.setItem('mock_supabase_user', JSON.stringify(user));
      
      return { 
        data: { 
          user: user as any, 
          session: { 
            user: user as any, 
            access_token: `mock-jwt-token-${user.id}`,
            expires_at: 9999999999,
            expires_in: 3600,
            token_type: 'bearer',
            refresh_token: 'mock-refresh-token'
          } 
        }, 
        error: null 
      };
    }
  };

  from(table: string) {
    return {
      select: (_fields: string = '*') => {
        return {
          eq: (column: string, value: any) => {
            const builder = {
              single: async () => {
                const data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
                const item = data.find((row: any) => row[column] === value);
                return { data: item || null, error: item ? null : { message: 'Not found' } };
              },
              order: async (col: string, opt?: { ascending?: boolean }) => {
                let data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
                let filtered = data.filter((row: any) => row[column] === value);

                // Fallback for session_answers when not cached in localStorage
                if (filtered.length === 0 && table === 'session_answers' && column === 'session_id') {
                  try {
                    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                    const res = await fetch(`${backendUrl}/api/sessions/${value}/answers`, {
                      headers: {
                        'Authorization': `Bearer mock-jwt-token-12345`
                      }
                    });
                    if (res.ok) {
                      const payload = await res.json();
                      if (payload && payload.answers && payload.answers.length > 0) {
                        filtered = payload.answers;
                        const existing = JSON.parse(localStorage.getItem('mock_db_session_answers') || '[]');
                        const filteredExisting = existing.filter((ans: any) => ans.session_id !== value);
                        localStorage.setItem('mock_db_session_answers', JSON.stringify([...filteredExisting, ...payload.answers]));
                      }
                    }
                  } catch (err) {
                    console.error('Error fetching answers fallback:', err);
                  }
                }

                if (col) {
                  filtered.sort((a: any, b: any) => {
                    const valA = a[col];
                    const valB = b[col];
                    if (valA < valB) return opt?.ascending ? -1 : 1;
                    if (valA > valB) return opt?.ascending ? 1 : -1;
                    return 0;
                  });
                }
                return { data: filtered, error: null };
              },
              then: async (resolve: any) => {
                const res = await builder.order('', {});
                resolve(res);
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
        
        const builder = {
          select: () => {
            return {
              single: async () => {
                return { data: newRows[0], error: null };
              },
              then: async (resolve: any) => {
                resolve({ data: newRows, error: null });
              }
            };
          },
          then: async (resolve: any) => {
            resolve({ data: newRows, error: null });
          }
        };
        return builder;
      }
    };
  }
}

export const supabase = (isPlaceholder 
  ? (new MockSupabaseClient() as any) 
  : createClient(supabaseUrl, supabaseAnonKey)) as SupabaseClient;

