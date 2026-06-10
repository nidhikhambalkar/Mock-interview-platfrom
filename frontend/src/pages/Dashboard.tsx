import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import type { DashboardStats, Session } from '../types';
import { 
  Play, Award, TrendingUp, History, FileDown, 
  ChevronRight, Calendar, Layers, ShieldQuestion, Star
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { generatePDF } from '../utils/pdfGenerator';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/login');
        return;
      }

      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard metrics.');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    e.preventDefault();
    setPdfLoadingId(session.id);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const { data: answers, error: fetchErr } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', session.id);

      if (fetchErr) throw fetchErr;

      generatePDF({
        studentName: authSession.user.user_metadata?.full_name || authSession.user.user_metadata?.name || authSession.user.email?.split('@')[0] || 'Student',
        domain: session.domain,
        difficulty: session.difficulty,
        date: new Date(session.created_at).toLocaleDateString(),
        overallScore: session.overall_score,
        grade: session.grade,
        communication: session.communication_score,
        technical: session.technical_score,
        confidence: session.confidence_score,
        strength: session.strength || '',
        improvement: session.improvement || '',
        answers: answers || []
      });
    } catch (err: any) {
      console.error('Failed to download PDF:', err.message);
      alert('Could not download PDF. Please try again.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100-72px)] flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-dark-400 font-semibold animate-pulse">Assembling dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass-panel border-brand-500/20 p-8 rounded-2xl text-center space-y-4">
          <p className="text-brand-400 font-medium">{error}</p>
          <button 
            onClick={fetchStats}
            className="px-6 py-2 bg-brand-500 hover:bg-brand-600 font-bold rounded-xl transition-all cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const hasSessions = stats && stats.totalSessions > 0;

  // Custom tooltips for Charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-900 border border-white/10 px-3 py-2 rounded-xl shadow-xl">
          <p className="text-xs text-dark-400 font-medium">{payload[0].payload.date}</p>
          <p className="text-sm text-brand-400 font-bold mt-0.5">{payload[0].payload.domain}</p>
          <p className="text-base text-white font-extrabold mt-1">Score: {payload[0].value}/100</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Welcome Card & Start CTA */}
      <div className="relative glass-panel rounded-3xl p-8 overflow-hidden glow-brand-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 z-10 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Unlock Your Dream Career Role</h2>
          <p className="text-dark-300 text-sm sm:text-base leading-relaxed">
            Practice mock interviews designed explicitly around corporate domain criteria. Receive actionable AI critiques under 10 seconds.
          </p>
        </div>
        <Link
          to="/setup"
          className="z-10 inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-orange hover:from-brand-600 hover:to-accent-orange text-white font-bold px-6 py-3.5 rounded-2xl transform active:scale-95 transition-all shadow-lg shadow-brand-500/20 cursor-pointer text-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Mock Interview
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Interviews Completed</span>
            <h3 className="text-3xl font-extrabold text-white">{stats?.totalSessions || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Average Score</span>
            <h3 className="text-3xl font-extrabold text-white">{stats?.averageScore || 0}%</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Recent Rating</span>
            <h3 className="text-3xl font-extrabold text-white">{stats?.lastGrade || 'N/A'}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Star className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Avg Technical</span>
            <h3 className="text-3xl font-extrabold text-white">{stats ? stats.averageTechnical * 10 : 0}%</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {hasSessions ? (
        <>
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Line Chart */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-4 space-y-6">
              <div>
                <h3 className="font-bold text-lg text-white">Performance Progress</h3>
                <p className="text-xs text-dark-400 mt-0.5">Overall score evaluation changes across historic sessions.</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.progressChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#4b5563" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                      dot={{ r: 3, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-3 space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">Competency Profile</h3>
                <p className="text-xs text-dark-400 mt-0.5">Mock evaluation averages across communication, accuracy, and confidence.</p>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarChart}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" fontSize={9} />
                    <Radar name="Averages" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Previous Sessions */}
          <div className="glass-panel rounded-2xl overflow-hidden space-y-4">
            <div className="px-6 py-5 border-b border-white/5">
              <h3 className="font-bold text-lg text-white">Interview Practice History</h3>
              <p className="text-xs text-dark-400 mt-0.5">Explore answers and AI coach feedback for previous interviews.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-dark-400 uppercase font-semibold">
                    <th className="px-6 py-4">Domain / Specialty</th>
                    <th className="px-6 py-4">Difficulty</th>
                    <th className="px-6 py-4">Date Completed</th>
                    <th className="px-6 py-4">Overall Score</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {stats.sessions.map((session) => (
                    <tr 
                      key={session.id} 
                      onClick={() => navigate(`/summary/${session.id}`)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center text-brand-400">
                            <Layers className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-white group-hover:text-brand-400 transition-colors">
                            {session.domain}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-dark-300 font-medium">{session.difficulty}</span>
                      </td>
                      <td className="px-6 py-4 text-dark-400 flex items-center gap-1.5 mt-2 border-0">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {session.overall_score}%
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          session.grade === 'Excellent' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : session.grade === 'Good'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-brand-950 text-brand-400 border border-brand-800/40'
                        }`}>
                          {session.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={(e) => handleDownloadPDF(e, session)}
                            disabled={pdfLoadingId === session.id}
                            className="p-2 text-dark-400 hover:text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
                            title="Download Report"
                          >
                            {pdfLoadingId === session.id ? (
                              <div className="w-4 h-4 border-2 border-dark-400 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </button>
                          <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-dark-300 transition-colors" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="glass-panel p-12 text-center rounded-3xl space-y-6">
          <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/25 rounded-2xl flex items-center justify-center text-brand-400 mx-auto glow-indigo animate-float">
            <ShieldQuestion className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white">No Mock Interviews Completed</h3>
            <p className="text-dark-400 text-sm leading-relaxed">
              You haven't attempted any sessions yet. Build confidence and refine your answers by scheduling your first mock interview now.
            </p>
          </div>
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            Start Your First Practice
          </Link>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
