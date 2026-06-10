import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { API_URL } from '../api';
import type { Question, Answer } from '../types';
import {
  Mic, MicOff, AlertCircle, ArrowRight, CheckCircle2,
  Lightbulb, Star, Trophy, ChevronRight, Zap, BookOpen,
  MessageSquare, Target, TrendingUp, X
} from 'lucide-react';
import { AudioVisualizer } from '../components/AudioVisualizer';

// Per-question-type improvement tips shown after each answer
const IMPROVEMENT_TIPS: Record<string, string[]> = {
  Technical: [
    "📐 Use the \"Concept → Why → How → Trade-offs\" framework to structure technical answers.",
    "🧠 Always explain your reasoning — interviewers value your thought process as much as the final answer.",
    "⚖️ Discuss trade-offs: performance vs. readability, scalability vs. simplicity.",
    "📊 Use concrete numbers and real-world scale (e.g., '10M requests/day') to demonstrate depth.",
    "🔄 Mention alternative approaches and explain why you rejected them.",
  ],
  Behavioral: [
    "⭐ Use the STAR method: Situation → Task → Action → Result — keep each section crisp.",
    "📏 Quantify your impact: \"Reduced load time by 40%\" beats \"made it faster\".",
    "🤝 Highlight collaboration — recruiters love seeing how you work with others.",
    "🎯 Tailor the story to the role: pick examples that match the job's core competencies.",
    "💡 Always end with a lesson learned — shows self-awareness and growth mindset.",
  ],
  Situational: [
    "🗺️ Lay out your decision-making process step-by-step before jumping to the answer.",
    "⚡ Show how you prioritize under pressure — identify the most critical constraint first.",
    "👥 Consider stakeholder impact in every decision you describe.",
    "🔄 Demonstrate adaptability: \"If X changed, I would pivot by doing Y.\"",
    "📋 Use structured thinking (e.g., first principles, 2x2 matrices) to show systematic reasoning.",
  ],
};

const ROUND_TRANSITION_TIPS = [
  { icon: "🎯", title: "Be Specific & Concrete", tip: "Give precise examples with actual metrics. Vague answers score lower than specific ones, even if shorter." },
  { icon: "⏱️", title: "Pace Your Answer", tip: "Spend the first 15 seconds outlining your structure before diving deep. Interviewers appreciate organized thinkers." },
  { icon: "🧩", title: "Show System Thinking", tip: "Round 2 questions are about depth. Connect components, identify failure points, and discuss scalability from the start." },
  { icon: "📖", title: "Use Technical Vocabulary", tip: "Correct usage of domain-specific terminology signals mastery. Don't shy away from jargon — but always explain it briefly." },
  { icon: "💬", title: "Think Out Loud", tip: "In technical rounds, narrate your thinking as you go. Silence is more worrying than imperfect reasoning." },
];

export const InterviewRoom: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    domain: string;
    difficulty: string;
    questions: Question[];
  };

  useEffect(() => {
    if (!state || !state.questions || state.questions.length === 0) {
      navigate('/setup');
    }
  }, [state, navigate]);

  const { domain, difficulty, questions: round1Questions = [] } = state || {};

  // ─── Core state ───────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [sessionAnswers, setSessionAnswers] = useState<Answer[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── Round management ──────────────────────────────────────
  const [round, setRound] = useState<1 | 2>(1);
  const [round2Questions, setRound2Questions] = useState<Question[]>([]);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [loadingRound2, setLoadingRound2] = useState(false);

  // ─── Tip panel ────────────────────────────────────────────
  const [showTip, setShowTip] = useState(false);
  const [currentTip, setCurrentTip] = useState('');

  const recognitionRef = useRef<any>(null);

  const questions = round === 1 ? round1Questions : round2Questions;

  // ─── Speech Recognition ───────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        const lastResultIndex = event.resultIndex;
        const textResult = event.results[lastResultIndex][0].transcript;
        if (textResult) {
          setAnswer((prev) => {
            const space = prev.length === 0 || prev.endsWith(' ') ? '' : ' ';
            return prev + space + textResult;
          });
        }
      };
      rec.onerror = (e: any) => { console.error('Speech error:', e.error); setIsListening(false); };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Your browser does not support Web Speech Recognition. Please try Google Chrome or MS Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const getWordCount = (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).length;
  };

  const wordCount = getWordCount(answer);
  const isValidWordCount = wordCount >= 50;

  // ─── Show a random tip for the current question type ─────
  const showTipForQuestion = (q: Question) => {
    const tips = IMPROVEMENT_TIPS[q.type] || IMPROVEMENT_TIPS.Technical;
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setCurrentTip(randomTip);
    setShowTip(true);
    setTimeout(() => setShowTip(false), 7000);
  };

  // ─── Fetch Round 2 questions ───────────────────────────────
  const fetchRound2Questions = async () => {
    setLoadingRound2(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/sessions/generate-bonus-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token || 'mock'}`
        },
        body: JSON.stringify({ domain })
      });
      if (!response.ok) throw new Error('Failed to fetch bonus questions');
      const data = await response.json();
      setRound2Questions(data.questions || []);
    } catch (err) {
      console.error('Error fetching round 2 questions:', err);
      // Fallback questions on error
      setRound2Questions([
        { id: 6, question: "Explain the CAP theorem and describe a system design that prioritizes availability over consistency. What trade-offs arise?", type: "Technical" },
        { id: 7, question: "Walk me through how you would optimize a query scanning 10 million rows. What indexes and architectural changes would you make?", type: "Technical" },
        { id: 8, question: "Describe horizontal vs vertical scaling. For a service with 50M daily users, which approach would you choose and why?", type: "Technical" },
        { id: 9, question: "Explain how the virtual DOM diffing algorithm works under the hood. How does the framework decide what to re-render?", type: "Technical" },
        { id: 10, question: "Design a URL shortener backend. Cover hashing strategy, collision handling, database schema, and how to scale to 1 billion links.", type: "Technical" },
      ]);
    } finally {
      setLoadingRound2(false);
    }
  };

  // ─── Next Question (within a round) ───────────────────────
  const handleNextQuestion = () => {
    if (!isValidWordCount) return;
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }

    const currentQuestion = questions[currentIdx];
    const newAnswerRecord: Answer = {
      question: currentQuestion.question,
      question_type: currentQuestion.type,
      user_answer: answer.trim()
    };

    setSessionAnswers(prev => [...prev, newAnswerRecord]);
    setAnswer('');

    // Show improvement tip
    showTipForQuestion(currentQuestion);

    const nextIdx = currentIdx + 1;

    // Check if we just finished Round 1 (question 5 of 5)
    if (round === 1 && nextIdx >= round1Questions.length) {
      // Trigger round transition
      fetchRound2Questions();
      setShowRoundTransition(true);
      setCurrentIdx(0);
    } else {
      setCurrentIdx(nextIdx);
    }
  };

  // ─── Start Round 2 ────────────────────────────────────────
  const handleStartRound2 = () => {
    setShowRoundTransition(false);
    setRound(2);
    setCurrentIdx(0);
  };

  // ─── Final submission (end of Round 2) ────────────────────
  const handleSubmitInterview = async () => {
    if (!isValidWordCount) return;
    setSubmitting(true);
    setSubmitError(null);
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }

    const currentQuestion = questions[currentIdx];
    const finalAnswerRecord: Answer = {
      question: currentQuestion.question,
      question_type: currentQuestion.type,
      user_answer: answer.trim()
    };

    const finalAnswersList = [...sessionAnswers, finalAnswerRecord];

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { navigate('/login'); return; }

      const response = await fetch(`${API_URL}/api/sessions/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({ domain, difficulty, answers: finalAnswersList })
      });

      if (!response.ok) throw new Error('Failed to evaluate mock session answers. Server error.');

      const data = await response.json();

      if ((supabase as any).isMock) {
        const sessions = JSON.parse(localStorage.getItem('mock_db_sessions') || '[]');
        const filteredSessions = sessions.filter((s: any) => s.id !== data.session.id);
        filteredSessions.push(data.session);
        localStorage.setItem('mock_db_sessions', JSON.stringify(filteredSessions));

        const answers = JSON.parse(localStorage.getItem('mock_db_session_answers') || '[]');
        const filteredAnswers = answers.filter((ans: any) => ans.session_id !== data.session.id);
        filteredAnswers.push(...data.answers);
        localStorage.setItem('mock_db_session_answers', JSON.stringify(filteredAnswers));
      }

      navigate(`/summary/${data.session.id}`, {
        state: { session: data.session, answers: data.answers, evaluation: data.evaluation, celebrate: true }
      });
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Error occurred while saving answers.');
      setSubmitting(false);
    }
  };

  // ─── Guards ───────────────────────────────────────────────
  if (round1Questions.length === 0) return null;

  const currentQuestion = questions[currentIdx];
  const totalQuestionsInRound = questions.length;
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestionsInRound) * 100);
  const isLastQuestion = round === 2 && currentIdx === round2Questions.length - 1;

  // ─── Submitting overlay ───────────────────────────────────
  if (submitting) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-white">Evaluating Full Performance</h3>
            <p className="text-dark-400 text-sm leading-relaxed">
              Analyzing all 10 of your answers across both rounds for communication, technical depth, and confidence metrics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Round 2 Transition screen ────────────────────────────
  if (showRoundTransition) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-dark-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8 animate-scale-in">

          {/* Trophy Banner */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/40 rounded-3xl flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Star className="w-3.5 h-3.5" />
                Round 1 Complete!
              </div>
              <h2 className="text-3xl font-extrabold text-white">You've Cleared Round 1 🎉</h2>
              <p className="text-dark-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
                Excellent work! You've answered all 5 initial questions. Now gear up for <span className="text-brand-400 font-bold">Round 2 — 5 Advanced Technical Questions</span> designed to test your depth.
              </p>
            </div>
          </div>

          {/* Tips Grid */}
          <div className="glass-panel rounded-2xl border border-white/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
              <Lightbulb className="w-4 h-4 text-accent-orange" />
              Tips to Ace Round 2
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROUND_TRANSITION_TIPS.map((t, i) => (
                <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-1 hover:border-brand-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-xs font-bold text-white">{t.title}</span>
                  </div>
                  <p className="text-dark-400 text-[11px] leading-relaxed pl-7">{t.tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            {loadingRound2 ? (
              <div className="flex items-center gap-3 text-dark-400 text-sm">
                <div className="w-5 h-5 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                Generating advanced questions...
              </div>
            ) : (
              <button
                onClick={handleStartRound2}
                disabled={round2Questions.length === 0}
                className="flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-brand-500 to-accent-orange hover:from-brand-600 hover:to-brand-500 text-white font-extrabold rounded-2xl transition-all transform active:scale-95 text-sm shadow-xl shadow-brand-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-5 h-5" />
                Enter Round 2 — Advanced Technical
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <p className="text-dark-600 text-xs">5 more questions · All Technical depth</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Interview UI ────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

      {/* Floating Tip */}
      {showTip && (
        <div className="fixed top-24 right-6 z-50 max-w-xs bg-dark-900 border border-brand-500/30 rounded-2xl p-4 shadow-2xl shadow-brand-500/10 animate-slide-up">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-accent-orange flex-shrink-0" />
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wide">Improvement Tip</span>
            </div>
            <button onClick={() => setShowTip(false)} className="text-dark-500 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-dark-300 text-xs leading-relaxed">{currentTip}</p>
        </div>
      )}

      {/* Session Header */}
      <div className="flex justify-between items-center bg-white/5 border border-white/5 px-5 py-3 rounded-2xl">
        <div className="text-xs font-semibold text-dark-300">
          Domain: <span className="text-white font-bold">{domain}</span>
          <span className="mx-2 text-dark-600">|</span>
          Tier: <span className="text-white font-bold">{difficulty}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Round Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            round === 2
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
          }`}>
            {round === 2 ? <Zap className="w-3 h-3" /> : <Target className="w-3 h-3" />}
            Round {round}
          </div>
          <div className="text-xs font-semibold text-brand-400">
            Q {currentIdx + 1} / {totalQuestionsInRound}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] text-dark-500 uppercase tracking-wide">
          <span>Round {round} Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              round === 2
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : 'bg-gradient-to-r from-brand-500 to-accent-orange'
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        {/* Overall 10-Q tracker */}
        <div className="flex items-center gap-1 pt-1">
          {[...Array(10)].map((_, i) => {
            const answered = i < sessionAnswers.length;
            const isCurrent = i === sessionAnswers.length;
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  answered ? 'bg-emerald-500' :
                  isCurrent ? 'bg-brand-400' :
                  'bg-white/5'
                }`}
              />
            );
          })}
        </div>
        <div className="text-[10px] text-dark-600 text-right">{sessionAnswers.length}/10 answered overall</div>
      </div>

      {/* Question Card */}
      <div key={`${round}-${currentIdx}`} className="glass-panel p-8 rounded-3xl space-y-6 relative overflow-hidden animate-scale-in border border-white/5 hover:border-brand-500/15 transition-all">
        {/* Question Type badge */}
        <div className="absolute top-0 right-0 px-4 py-1 bg-white/5 rounded-bl-2xl text-[10px] uppercase font-bold tracking-widest text-dark-400 border-l border-b border-white/5 flex items-center gap-1.5">
          {currentQuestion?.type === 'Technical' && <BookOpen className="w-3 h-3 text-brand-400" />}
          {currentQuestion?.type === 'Behavioral' && <MessageSquare className="w-3 h-3 text-amber-400" />}
          {currentQuestion?.type === 'Situational' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
          {currentQuestion?.type} Question
        </div>

        <div className="space-y-4 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
            {round === 2 ? '🔥 Round 2 — Advanced Technical' : 'Question Prompt'}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
            {currentQuestion?.question}
          </h2>
        </div>

        {/* Tip for this question type */}
        <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Lightbulb className="w-3.5 h-3.5 text-accent-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs text-dark-400 leading-relaxed">
            <span className="font-semibold text-dark-300">Tip: </span>
            {IMPROVEMENT_TIPS[currentQuestion?.type || 'Technical'][currentIdx % 5]}
          </p>
        </div>

        <hr className="border-white/5" />

        {/* Answer Textarea */}
        <div className="space-y-3 relative">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-dark-300">Your Response (50 words minimum)</label>
            <span className={`text-xs font-bold ${isValidWordCount ? 'text-emerald-400' : 'text-dark-400'}`}>
              Words: {wordCount} {isValidWordCount ? '✓' : ''}
            </span>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitting}
            placeholder="Structure your answer clearly. Discuss context, solutions, and operational outcomes..."
            className="w-full h-52 bg-dark-900/60 border border-white/5 rounded-2xl p-5 text-sm sm:text-base text-dark-100 placeholder-dark-500 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/40 transition-all resize-none"
          />
          {/* Voice button */}
          <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-dark-950/80 border border-white/5 rounded-full px-4 py-2 backdrop-blur-md">
            {isListening && <AudioVisualizer />}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-full cursor-pointer transition-all ${isListening
                ? 'bg-brand-500 text-white animate-pulse'
                : 'bg-white/5 text-dark-300 hover:text-white hover:bg-white/10'}`}
              title={isListening ? "Pause Dictation" : "Dictate Response"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Warnings */}
        {!isValidWordCount && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-400 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Please formulate a longer response. Min 50 words required (current: {wordCount}).</span>
          </div>
        )}
        {submitError && (
          <div className="bg-brand-950 border border-brand-800/40 p-3.5 rounded-xl flex items-start gap-2.5 text-brand-400 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end pt-2">
          {isLastQuestion ? (
            <button
              onClick={handleSubmitInterview}
              disabled={!isValidWordCount || submitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-all cursor-pointer transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-emerald-500/10"
            >
              <CheckCircle2 className="w-4 h-4" />
              Submit Full Interview for Review
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              disabled={!isValidWordCount}
              className={`flex items-center gap-2 font-bold px-8 py-3.5 rounded-2xl transition-all cursor-pointer transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                round === 1 && currentIdx === round1Questions.length - 1
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              {round === 1 && currentIdx === round1Questions.length - 1 ? (
                <>
                  <Trophy className="w-4 h-4" />
                  Complete Round 1
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default InterviewRoom;
