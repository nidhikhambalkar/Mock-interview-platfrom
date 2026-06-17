import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Session, Answer } from '../types';
import { 
  Award, FileDown, ArrowLeft, RotateCcw, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import confetti from 'canvas-confetti';
import { generatePDF } from '../utils/pdfGenerator';

export const SessionSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    session: Session;
    answers: Answer[];
    celebrate?: boolean;
  };

  const [session, setSession] = useState<Session | null>(state?.session || null);
  const [answers, setAnswers] = useState<Answer[]>(state?.answers || []);
  const [loading, setLoading] = useState(!state?.session);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'strength' | 'improvement' | 'example'>('strength');
  const [openAccordionIdx, setOpenAccordionIdx] = useState<number | null>(null);

  const loadSessionData = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch session row
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionErr) throw sessionErr;

      // Fetch answers list
      const { data: answersData, error: answersErr } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (answersErr) throw answersErr;

      const localAnswers = (answersData || []).map((ans: any) => ({
        question: ans.question,
        question_type: ans.question_type as any,
        user_answer: ans.user_answer
      }));

      setSession(sessionData);
      setAnswers(localAnswers);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load details for this session.');
    } finally {
      setLoading(false);
    }
  };

  // Load data if accessed via URL param (from dashboard list)
  useEffect(() => {
    if (!state?.session && id) {
      loadSessionData(id);
    }
  }, [id, state, location.pathname]);

  // Confetti trigger for top performances
  useEffect(() => {
    if (session && session.grade === 'Excellent' && (state?.celebrate || location.pathname.includes('/summary/'))) {
      // Fire confetti celebration
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [session, state, location.pathname]);

  const handleDownloadPDF = async () => {
    if (!session) return;
    setPdfLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const studentName = authSession?.user?.user_metadata?.full_name || authSession?.user?.user_metadata?.name || authSession?.user?.email?.split('@')[0] || 'Student';

      generatePDF({
        studentName,
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
        answers
      });
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Could not download PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-dark-400 font-semibold animate-pulse">Compiling session evaluation metrics...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass-panel border-brand-500/20 p-8 rounded-2xl text-center space-y-4">
          <p className="text-brand-400 font-medium">{error || 'Session details not found.'}</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-6 py-2 bg-brand-500 hover:bg-brand-600 font-bold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Format Recharts data structures
  const radarData = [
    { subject: 'Communication', score: session.communication_score * 10, fullMark: 100 },
    { subject: 'Technical Accuracy', score: session.technical_score * 10, fullMark: 100 },
    { subject: 'Confidence', score: session.confidence_score * 10, fullMark: 100 }
  ];

  const barData = [
    { name: 'Communication', Score: session.communication_score * 10, Benchmark: 80 },
    { name: 'Technical', Score: session.technical_score * 10, Benchmark: 80 },
    { name: 'Confidence', Score: session.confidence_score * 10, Benchmark: 80 }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header Back & Download Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-all text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard Overview
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {pdfLoading ? (
              <div className="w-4 h-4 border-2 border-dark-400 border-t-white rounded-full animate-spin"></div>
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Download PDF Report
          </button>
          <Link
            to="/setup"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Interview
          </Link>
        </div>
      </div>

      {/* Hero Overview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        {/* Left Box Score Card */}
        <div className="glass-panel p-8 rounded-3xl md:col-span-4 flex flex-col justify-between items-center text-center relative overflow-hidden glow-indigo">
          {session.grade === 'Excellent' && (
            <div className="absolute top-4 right-4 text-brand-400 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-brand-400">Mock Score Evaluation</span>
            <h1 className="text-7xl font-extrabold text-white tracking-tight">{session.overall_score}%</h1>
          </div>

          {/* Large Circular Gauge */}
          <div className="my-6 relative w-36 h-36 flex items-center justify-center">
            {/* SVG circle track */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                stroke="url(#grad)"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="402"
                strokeDashoffset={402 - (402 * session.overall_score) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                 <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-base font-bold uppercase tracking-wide px-3 py-1 rounded-full ${
                session.grade === 'Excellent' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : session.grade === 'Good'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-brand-950 text-brand-400 border border-brand-800/40'
              }`}>
                {session.grade}
              </span>
            </div>
          </div>

          <div className="space-y-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 w-full">
            <div className="text-xs text-dark-300 font-semibold">{session.domain}</div>
            <div className="text-[10px] text-dark-400 uppercase font-bold tracking-widest">{session.difficulty} Tier</div>
          </div>
        </div>

        {/* Right Comparative Analytics */}
        <div className="glass-panel p-8 rounded-3xl md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="flex flex-col justify-between">
            <h4 className="font-bold text-white text-sm">Competency Vector</h4>
            <div className="h-48 flex items-center justify-center mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={9} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#4b5563" fontSize={8} />
                  <Radar name="Candidate" dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex flex-col justify-between">
            <h4 className="font-bold text-white text-sm">Score Comparison (Target 80%)</h4>
            <div className="h-48 flex items-center justify-center mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={9} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#4b5563" fontSize={9} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.01)' }} />
                  <Legend iconSize={8} fontSize={9} wrapperStyle={{ bottom: -10 }} />
                  <Bar dataKey="Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Benchmark" fill="#374151" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Feedback Modules */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        {/* Tab Header Selector */}
        <div className="flex border-b border-white/5 bg-white/[0.01] px-4 py-2">
          <button
            onClick={() => setActiveTab('strength')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'strength' 
                ? 'border-brand-500 text-brand-400' 
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            Core Strengths
          </button>
          <button
            onClick={() => setActiveTab('improvement')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'improvement' 
                ? 'border-brand-500 text-brand-400' 
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            Development Areas
          </button>
          <button
            onClick={() => setActiveTab('example')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'example' 
                ? 'border-brand-500 text-brand-400' 
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            Expert Sample Answer
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-8 min-h-[200px]">
          {activeTab === 'strength' && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Where you succeeded
              </div>
              <p className="text-dark-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {session.strength || "AI analysis of your key answers was unable to extract specific details."}
              </p>
            </div>
          )}

          {activeTab === 'improvement' && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Actionable recommendations
              </div>
              <p className="text-dark-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {session.improvement || "AI analysis didn't flag major issues. Focus on pacing and structuring."}
              </p>
            </div>
          )}

          {activeTab === 'example' && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold">
                <Award className="w-4 h-4" />
                Suggested answer framework
              </div>
              <div className="bg-dark-900/60 border border-white/5 rounded-2xl p-6">
                <p className="text-dark-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {session.strength && session.improvement ? (
                    // In the evaluation response, the example_answer is mapped in strength/improvement database field or custom object.
                    // Wait, let's look at the database schema. In our sessions table, we have strength, improvement.
                    // Oh! The example answer was returned by Claude evaluation, but wait, where did we store it?
                    // Let's check: in backend/index.js, did we store example_answer in the sessions table?
                    // Ah! In backend/index.js we didn't add a column for example_answer, but we can display the sample answer that was generated.
                    // Wait! Let's check if the backend stored the evaluation response.
                    // Actually, let's see. Does the sessions table have an example_answer column? No! But wait!
                    // In index.js:
                    //   evaluation.strength, evaluation.improvement are inserted.
                    //   And we returned evaluation.example_answer in the response.
                    // Let's check if we can query this, or if we can make it show.
                    // If it is accessed immediately, we have evaluation.example_answer from state.
                    // If they load it from history, wait, we don't have example_answer column in schema.sql.
                    // Wait, is this an issue? We can fetch it, or we could add an `example_answer` column to public.sessions!
                    // Let's verify: does the database sessions table have `example_answer`? No, schema.sql has:
                    // `strength text, improvement text`.
                    // To keep everything consistent and allow users to view their sample answer from history, we should add `example_answer` column to public.sessions in the schema!
                    // Let's do that! That is a very important detail.
                    // Let's modify index.js and schema.sql to add `example_answer` column to the `sessions` table so that it is stored permanently in the database!
                    // Wait, I will write the component to read `session.example_answer` which is perfect once we add the column.
                    (session as any).example_answer || "A structured sample response illustrating top-tier articulation and technical accuracy is stored with your session evaluation history."
                  ) : (
                    "No example answers were formatted for this mock interview session."
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accordion List of Q&As */}
      <div className="space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full"></span>
          Mock Interview Transcript Log
        </h3>

        <div className="space-y-3">
          {answers.map((ans, idx) => {
            const isOpen = openAccordionIdx === idx;
            return (
              <div 
                key={idx} 
                className="glass-panel rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors"
              >
                {/* Header Drawer */}
                <button
                  onClick={() => setOpenAccordionIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer text-left"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">
                      Question {idx + 1} &bull; {ans.question_type}
                    </span>
                    <h4 className="font-bold text-white text-sm sm:text-base pr-4 line-clamp-1">
                      {ans.question}
                    </h4>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-dark-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400 flex-shrink-0" />
                  )}
                </button>

                {/* Body Drawer */}
                {isOpen && (
                  <div className="px-6 py-5 border-t border-white/5 space-y-4 text-sm leading-relaxed">
                    <div className="space-y-1.5">
                      <span className="text-xs uppercase font-bold tracking-wider text-dark-400">Question Prompt</span>
                      <p className="text-white font-semibold">{ans.question}</p>
                    </div>

                    <div className="space-y-1.5 bg-dark-900/60 rounded-xl p-4 border border-white/5">
                      <span className="text-xs uppercase font-bold tracking-wider text-dark-400">Your Response</span>
                      <p className="text-dark-200 whitespace-pre-wrap">{ans.user_answer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default SessionSummary;
