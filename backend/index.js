// index.js
// Main entry point for WeIntern AI Mock Interview Platform Backend

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for local development and production
app.use(cors({
  origin: '*', // Adjust this to specific domains in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logger middleware
app.use(morgan('dev'));

// JSON body parser
app.use(express.json());

// Initialize clients safely (graceful fallback to Demo/Mock Mode if keys are invalid or missing)
const fs = require('fs');
const path = require('path');
const MOCK_DB_PATH = path.join(__dirname, 'mock_db.json');

// Helper to read local mock DB
function readMockDb() {
  try {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify({ users: [], sessions: [], session_answers: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading mock DB:', err);
    return { users: [], sessions: [], session_answers: [] };
  }
}

// Helper to write local mock DB
function writeMockDb(data) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing mock DB:', err);
  }
}

// Standard Mock Questions Database
const MOCK_QUESTIONS = {
  'Software Engineering': {
    'Beginner': [
      { id: 1, question: "Explain the difference between a stack and a queue data structure, and give a real-world example of each.", type: "Technical" },
      { id: 2, question: "Tell me about a time when you had to work in a team to solve a coding problem. What was your role and how did you collaborate?", type: "Behavioral" },
      { id: 3, question: "You are tasked with fixing a bug in a legacy codebase that has no documentation. How do you approach understanding the code?", type: "Situational" },
      { id: 4, question: "What is the difference between synchronous and asynchronous programming, and when would you use each?", type: "Technical" },
      { id: 5, question: "Describe a time when you received constructive feedback on your code. How did you handle it?", type: "Behavioral" }
    ],
    'Intermediate': [
      { id: 1, question: "How does HTTPS establish a secure connection? Explain the role of SSL/TLS certificates and asymmetric encryption.", type: "Technical" },
      { id: 2, question: "Tell me about a technical challenge you faced in a recent project. How did you identify the root cause, and how did you resolve it?", type: "Behavioral" },
      { id: 3, question: "Your application is experiencing sudden high latency in production, but CPU usage is normal. Describe your debugging steps.", type: "Situational" },
      { id: 4, question: "Explain the concept of RESTful web services and contrast it with GraphQL. When would you choose one over the other?", type: "Technical" },
      { id: 5, question: "Describe a scenario where you disagreed with a senior engineer's architectural decision. How did you resolve the conflict?", type: "Behavioral" }
    ],
    'Advanced': [
      { id: 1, question: "Design a high-throughput, fault-tolerant distributed chat application. How would you handle real-time delivery, presence indicator, and message ordering?", type: "Technical" },
      { id: 2, question: "Describe a time when you had to make a significant architectural compromise due to business constraints. What were the trade-offs and outcome?", type: "Behavioral" },
      { id: 3, question: "A critical database migration failed midway in production, leaving the system in an inconsistent state. How do you handle rollback and recovery under pressure?", type: "Situational" },
      { id: 4, question: "Explain how memory management and garbage collection work in Node.js (V8 engine). How do you diagnose and fix memory leaks?", type: "Technical" },
      { id: 5, question: "How do you establish engineering standards and mentor junior developers while keeping up with your own deliverable targets?", type: "Behavioral" }
    ]
  },
  'Data Science': {
    'Beginner': [
      { id: 1, question: "What is the difference between supervised and unsupervised learning, and can you give examples of algorithms for each?", type: "Technical" },
      { id: 2, question: "Describe a time when you worked with a messy dataset. What steps did you take to clean and prepare the data?", type: "Behavioral" },
      { id: 3, question: "A stakeholder wants to use a complex machine learning model for a simple tabular prediction task. How do you explain the trade-off of model interpretability?", type: "Situational" },
      { id: 4, question: "Explain the concept of overfitting and underfitting. What are some common techniques to prevent overfitting?", type: "Technical" },
      { id: 5, question: "Talk about a project where you had to explain data analysis findings to someone without a technical background.", type: "Behavioral" }
    ],
    'Intermediate': [
      { id: 1, question: "Explain the mathematical difference between L1 (Lasso) and L2 (Ridge) regularization, and how they affect feature weights.", type: "Technical" },
      { id: 2, question: "Tell me about a time when your model did not perform as expected in validation. How did you debug the model or features?", type: "Behavioral" },
      { id: 3, question: "Your team has built a churn prediction model that has high accuracy, but when deployed, the business is still losing users. How do you troubleshoot?", type: "Situational" },
      { id: 4, question: "What is a confusion matrix? Explain Precision, Recall, and F1-score, and discuss which metric you would prioritize for medical diagnostic screening.", type: "Technical" },
      { id: 5, question: "How do you decide between building a complex deep learning model versus using a simple ensemble model like XGBoost?", type: "Behavioral" }
    ],
    'Advanced': [
      { id: 1, question: "How do you handle covariate shift (data drift) in a deployed recommendation engine? Describe the monitoring and automated retraining strategy.", type: "Technical" },
      { id: 2, question: "Describe a data initiative you led that directly resulted in measurable business revenue or cost savings. What was your approach?", type: "Behavioral" },
      { id: 3, question: "Your executive team wants to implement an LLM-based customer support agent, but has strict constraints against hallucinations and data leakage. How do you design it?", type: "Situational" },
      { id: 4, question: "Explain the self-attention mechanism in Transformers. How does it improve upon recurrent architectures for sequence modeling?", type: "Technical" },
      { id: 5, question: "How do you establish statistical guidelines for A/B testing when sample sizes are small or variance is extremely high?", type: "Behavioral" }
    ]
  },
  'Marketing': {
    'Beginner': [
      { id: 1, question: "What is the difference between SEO (Search Engine Optimization) and SEM (Search Engine Marketing), and how do they work together?", type: "Technical" },
      { id: 2, question: "Tell me about a marketing campaign (your own or someone else's) that you found creative. What made it successful?", type: "Behavioral" },
      { id: 3, question: "You are given a very limited budget of $500 for a local product launch. How would you allocate this budget to maximize engagement?", type: "Situational" },
      { id: 4, question: "What are the primary metrics you look at when measuring the success of an email marketing campaign?", type: "Technical" },
      { id: 5, question: "Describe a time when you had to manage multiple marketing tasks with tight deadlines. How did you prioritize them?", type: "Behavioral" }
    ],
    'Intermediate': [
      { id: 1, question: "Explain how you would calculate Customer Acquisition Cost (CAC) and Customer Lifetime Value (LTV). What is a healthy ratio for a SaaS company?", type: "Technical" },
      { id: 2, question: "Tell me about a campaign you launched that failed to meet its target KPI. What did you learn and how did you iterate?", type: "Behavioral" },
      { id: 3, question: "A competitor launches a aggressive pricing discount campaign that is eating into your market share. How do you adjust your messaging strategy?", type: "Situational" },
      { id: 4, question: "How do you design and execute an effective A/B split test for a landing page? Explain landing page conversion optimization best practices.", type: "Technical" },
      { id: 5, question: "How do you align your marketing goals with the product and sales teams to ensure unified messaging?", type: "Behavioral" }
    ],
    'Advanced': [
      { id: 1, question: "Describe your framework for building a comprehensive go-to-market (GTM) strategy for a new B2B enterprise software product in a saturated market.", type: "Technical" },
      { id: 2, question: "Tell me about a time you had to pivot an entire brand positioning strategy due to a major public relations crisis or market disruption.", type: "Behavioral" },
      { id: 3, question: "Your marketing attribution model is showing conflicting results between first-touch and last-touch attribution. How do you design a multi-touch attribution model?", type: "Situational" },
      { id: 4, question: "Explain how you leverage predictive analytics and machine learning tools to segment audiences and personalize dynamic creative messaging.", type: "Technical" },
      { id: 5, question: "How do you scale high-performing marketing teams across international boundaries with differing local regulations and cultural nuances?", type: "Behavioral" }
    ]
  },
  'Finance': {
    'Beginner': [
      { id: 1, question: "What are the three main financial statements, and how do they link together?", type: "Technical" },
      { id: 2, question: "Describe a time when you had to perform financial data entry or analysis under tight deadlines. How did you ensure accuracy?", type: "Behavioral" },
      { id: 3, question: "You find an error in a financial report that has already been shared internally. What are your immediate actions?", type: "Situational" },
      { id: 4, question: "What is working capital, and why is it important for a company's day-to-day operations?", type: "Technical" },
      { id: 5, question: "Tell me about a project where you had to work with a partner who had different analytical views from yours.", type: "Behavioral" }
    ],
    'Intermediate': [
      { id: 1, question: "Explain how you would calculate the Weighted Average Cost of Capital (WACC), and discuss how it is used in investment decisions.", type: "Technical" },
      { id: 2, question: "Tell me about a complex financial analysis or valuation model you built. How did you determine your growth and discount rate assumptions?", type: "Behavioral" },
      { id: 3, question: "A company's sales are projected to grow by 20% next year, but its cash flow is projected to be negative. How do you analyze this situation?", type: "Situational" },
      { id: 4, question: "Describe the differences between NPV (Net Present Value) and IRR (Internal Rate of Return). In what scenarios might they lead to conflicting decisions?", type: "Technical" },
      { id: 5, question: "How do you effectively present complex financial risks to a board of directors or executive team who are non-finance professionals?", type: "Behavioral" }
    ],
    'Advanced': [
      { id: 1, question: "Walk me through your methodology for structuring a leveraged buyout (LBO) model, and what key levers drive the equity returns.", type: "Technical" },
      { id: 2, question: "Describe the most challenging corporate transaction (e.g., M&A, debt refinancing, restructuring) you worked on. What obstacles did you overcome?", type: "Behavioral" },
      { id: 3, question: "A portfolio company is experiencing severe covenant breaches on its senior debt. How do you negotiate a waiver or restructuring agreement?", type: "Situational" },
      { id: 4, question: "How do you evaluate and hedge interest rate risk and foreign exchange risk in a multinational corporation's balance sheet?", type: "Technical" },
      { id: 5, question: "How do you instill a culture of financial discipline across product-focused teams that prioritize growth over unit economics?", type: "Behavioral" }
    ]
  },
  'HR/Management': {
    'Beginner': [
      { id: 1, question: "What are the key steps in a standard employee recruitment and onboarding process?", type: "Technical" },
      { id: 2, question: "Tell me about a conflict you witnessed in a team setting. How did you help or what did you learn from how it was handled?", type: "Behavioral" },
      { id: 3, question: "An employee complains about another colleague's communication style. How do you initiate a conversation to resolve this?", type: "Situational" },
      { id: 4, question: "What is the role of performance reviews, and what are the key elements of constructive feedback?", type: "Technical" },
      { id: 5, question: "Describe a time when you had to manage confidential information. How did you ensure it remained secure?", type: "Behavioral" }
    ],
    'Intermediate': [
      { id: 1, question: "Explain how you design a competitive compensation and benefits structure while staying aligned with the company's financial budget.", type: "Technical" },
      { id: 2, question: "Tell me about a time when you had to deliver difficult feedback or manage a low-performing employee. How did you approach the conversation?", type: "Behavioral" },
      { id: 3, question: "Your department is undergoing restructuring, and employee morale is dropping rapidly. How do you manage change communications?", type: "Situational" },
      { id: 4, question: "How do you structure an effective training and development program to address skills gaps in a rapidly scaling engineering department?", type: "Technical" },
      { id: 5, question: "Describe how you evaluate workplace culture and employee engagement using qualitative and quantitative metrics.", type: "Behavioral" }
    ],
    'Advanced': [
      { id: 1, question: "Outline your global talent strategy for a remote-first organization, focusing on compliance, remote equity, and cross-border recruiting.", type: "Technical" },
      { id: 2, question: "Describe a high-stakes union negotiation or employee relations investigation you led. What was your strategic resolution process?", type: "Behavioral" },
      { id: 3, question: "The board requests an immediate succession plan for the C-level suite, but there are deep political divisions in the executive team. How do you manage this process?", type: "Situational" },
      { id: 4, question: "How do you utilize people analytics and predictive modeling to address voluntary attrition trends before they affect key business lines?", type: "Technical" },
      { id: 5, question: "How do you build a sustainable Diversity, Equity, and Inclusion (DEI) initiative that has clear accountability and links to business performance?", type: "Behavioral" }
    ]
  }
};

// Round 2: Extra Advanced Technical Questions (unlocked after completing Round 1)
const ROUND2_QUESTIONS = {
  'Software Engineering': [
    { id: 6,  question: "Explain the CAP theorem and describe how you would design a distributed key-value store that prioritizes availability over consistency. What trade-offs arise?", type: "Technical" },
    { id: 7,  question: "Walk me through how you would optimize a slow SQL query that scans 10 million rows. What indexes, query plans, and architectural changes would you consider?", type: "Technical" },
    { id: 8,  question: "Describe the difference between horizontal and vertical scaling. For a social media feed service with 50 million daily active users, which would you choose and why?", type: "Technical" },
    { id: 9,  question: "Explain how React's virtual DOM diffing algorithm (reconciliation) works under the hood. How does React decide what to re-render efficiently?", type: "Technical" },
    { id: 10, question: "Design the URL shortener backend (like bit.ly). Cover the hashing strategy, collision handling, database schema, and how to scale it to 1 billion links.", type: "Technical" }
  ],
  'Data Science': [
    { id: 6,  question: "Explain the bias-variance trade-off in depth. How do ensemble methods like Random Forest and Gradient Boosting address each component differently?", type: "Technical" },
    { id: 7,  question: "Describe the complete pipeline to detect anomalies in real-time financial transaction data. Which algorithms would you use, and how would you handle concept drift?", type: "Technical" },
    { id: 8,  question: "Explain SHAP (SHapley Additive exPlanations) values. How do they differ from LIME for model interpretability, and when would you use each?", type: "Technical" },
    { id: 9,  question: "How would you design an offline-online learning system for a real-time recommendation engine that must update user embeddings every 30 seconds?", type: "Technical" },
    { id: 10, question: "Describe how you would set up a rigorous causal inference study (not just correlation) to measure the impact of a product feature on user retention.", type: "Technical" }
  ],
  'Marketing': [
    { id: 6,  question: "Explain the full-funnel marketing attribution challenge. Compare rule-based models (first-touch, last-touch, linear) vs. data-driven attribution (Shapley, Markov Chains).", type: "Technical" },
    { id: 7,  question: "How would you design a content marketing flywheel strategy from scratch for a B2B SaaS startup with zero brand recognition and a $10,000/month budget?", type: "Technical" },
    { id: 8,  question: "Walk me through your process for building and validating customer personas using both quantitative data (analytics) and qualitative research (interviews).", type: "Technical" },
    { id: 9,  question: "Explain how you would use cohort analysis to diagnose a sudden 30% drop in monthly recurring revenue. What would you look for in each cohort?", type: "Technical" },
    { id: 10, question: "Describe the strategy and technical setup for a successful account-based marketing (ABM) campaign targeting Fortune 500 CFOs. Which tools, signals, and channels would you use?", type: "Technical" }
  ],
  'Finance': [
    { id: 6,  question: "Walk me step-by-step through a full three-statement financial model. How do the income statement, balance sheet, and cash flow statement tie together dynamically?", type: "Technical" },
    { id: 7,  question: "Explain the Black-Scholes options pricing model intuitively. What are its key assumptions, and how do the Greeks (Delta, Gamma, Vega, Theta) relate to option pricing?", type: "Technical" },
    { id: 8,  question: "Describe the complete due diligence process for a private equity acquisition of a mid-market manufacturing company. Which red flags would be immediate deal-breakers?", type: "Technical" },
    { id: 9,  question: "How would you value a pre-revenue SaaS startup for a Series A investment round? Compare DCF, comparable company analysis, and VC method approaches.", type: "Technical" },
    { id: 10, question: "Explain Basel III capital requirements. How do Tier 1 and Tier 2 capital differ, and how does the leverage ratio protect banks from systemic risk?", type: "Technical" }
  ],
  'HR/Management': [
    { id: 6,  question: "Design a complete performance management framework for a 500-person engineering organization. How do you ensure fairness, avoid recency bias, and tie it to compensation?", type: "Technical" },
    { id: 7,  question: "Explain Organizational Network Analysis (ONA). How would you use it to identify informal influencers and knowledge silos within a company?", type: "Technical" },
    { id: 8,  question: "Walk me through the legal and HR considerations for implementing a Reduction in Force (RIF). How do you mitigate legal exposure while maintaining culture integrity?", type: "Technical" },
    { id: 9,  question: "Describe how you would architect a competency-based career framework for a technology company with 10 different job families. How do you keep it updated as roles evolve?", type: "Technical" },
    { id: 10, question: "Explain how you use people analytics to build a predictive attrition model. Which features (data signals) would you include, and how do you act on the predictions ethically?", type: "Technical" }
  ]
};


let supabase = null;
let isSupabaseConfigured = false;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isPlaceholder = !supabaseUrl || 
                        supabaseUrl.includes('your-supabase-project-url') || 
                        !supabaseUrl.startsWith('https://');

  if (isPlaceholder || !supabaseServiceKey || supabaseServiceKey.includes('your-supabase-service-role-key')) {
    console.warn('⚠️ WARNING: Supabase credentials are placeholder or invalid. Running in DEMO/MOCK database mode.');
  } else {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    isSupabaseConfigured = true;
    console.log('✅ Supabase Client initialized successfully.');
  }
} catch (error) {
  console.warn('⚠️ WARNING: Failed to initialize Supabase client:', error.message);
  console.warn('Running in DEMO/MOCK database mode.');
}

let anthropic = null;
let isAnthropicConfigured = false;

try {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const isPlaceholder = !anthropicKey || anthropicKey.includes('your-anthropic-api-key');

  if (isPlaceholder) {
    console.warn('⚠️ WARNING: Anthropic API Key is placeholder or missing. Running in DEMO/MOCK AI mode.');
  } else {
    anthropic = new Anthropic({
      apiKey: anthropicKey,
    });
    isAnthropicConfigured = true;
    console.log('✅ Anthropic Claude API initialized successfully.');
  }
} catch (error) {
  console.warn('⚠️ WARNING: Failed to initialize Anthropic client:', error.message);
  console.warn('Running in DEMO/MOCK AI mode.');
}

// Authentication middleware to verify Supabase JWT
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!isSupabaseConfigured) {
      if (token && token.startsWith('mock-jwt-token-')) {
        const payloadBase64 = token.replace('mock-jwt-token-', '');
        try {
          const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
          const decodedUser = JSON.parse(decodedJson);
          if (!decodedUser.id) {
            return res.status(401).json({ error: 'Unauthorized: Invalid mock token (no user ID)' });
          }
          req.user = {
            id: decodedUser.id,
            email: decodedUser.email || 'unknown@weintern.com',
            user_metadata: {
              full_name: decodedUser.full_name || '',
              avatar_url: decodedUser.avatar_url || '',
              gender: decodedUser.gender || ''
            }
          };
          return next();
        } catch (e) {
          console.error('Error decoding mock token:', e);
          return res.status(401).json({ error: 'Unauthorized: Malformed mock token' });
        }
      }
      // Unknown token format in mock mode — reject
      return res.status(401).json({ error: 'Unauthorized: Unrecognized token format' });
    }

    // Verify user token using official Supabase auth server
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    // Attach verified user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(401).json({ error: 'Unauthorized: Verification failed' });
  }
};

// Helper function to extract and parse JSON from Claude's response safely
function parseClaudeJson(text) {
  try {
    // Attempt standard JSON parsing
    return JSON.parse(text);
  } catch (e) {
    // Extract JSON block if surrounded by markdown code fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (innerError) {
        throw new Error('Failed to parse JSON from markdown code block: ' + innerError.message);
      }
    }
    throw new Error('JSON parsing failed: ' + e.message);
  }
}

// Routes

// 1. Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'WeIntern Backend is healthy',
    modes: {
      database: isSupabaseConfigured ? 'supabase' : 'mock',
      ai: isAnthropicConfigured ? 'claude' : 'mock'
    }
  });
});

// 2. Question Generation Endpoint
// POST /api/sessions/generate-questions
app.post('/api/sessions/generate-questions', requireAuth, async (req, res) => {
  const { domain, difficulty, count = 5 } = req.body;
  
  if (!domain || !difficulty) {
    return res.status(400).json({ error: 'Bad Request: Domain and Difficulty are required' });
  }

  try {
    if (!isAnthropicConfigured) {
      // Fetch domain list from local mock questions
      const domainQuestions = MOCK_QUESTIONS[domain]?.[difficulty] || MOCK_QUESTIONS['Software Engineering']['Beginner'];
      // Shuffle and pick count questions
      const shuffled = [...domainQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count).map((q, index) => ({
        id: index + 1,
        question: q.question,
        type: q.type
      }));
      return res.status(200).json({ questions: selected });
    }

    // Format the system prompt as explicitly specified in requirements
    const systemPrompt = `You are an expert interviewer for ${domain}. Generate ${count} realistic interview questions at ${difficulty} level. Return as JSON array of objects with fields: id, question, type.`;
    
    const userPrompt = `Generate the interview questions for a candidate in the ${domain} track at the ${difficulty} tier. 
Ensure the type field is exactly one of: 'Technical', 'Behavioral', or 'Situational'.
Do not include any greeting, explanation, introduction, markdown blocks, or surrounding text. Return ONLY the raw JSON array.`;

    const modelName = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

    const msg = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawResponse = msg.content[0].text;
    const questions = parseClaudeJson(rawResponse);

    return res.status(200).json({ questions });
  } catch (err) {
    console.error('Error generating questions with Claude:', err);
    return res.status(500).json({ error: 'Internal Server Error: Failed to generate interview questions' });
  }
});

// 3. Bonus Round 2 Questions Endpoint
// POST /api/sessions/generate-bonus-questions
app.post('/api/sessions/generate-bonus-questions', requireAuth, async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Bad Request: Domain is required' });
  }

  try {
    if (!isAnthropicConfigured) {
      // Return hardcoded Round 2 questions
      const bonusQuestions = ROUND2_QUESTIONS[domain] || ROUND2_QUESTIONS['Software Engineering'];
      return res.status(200).json({ questions: bonusQuestions });
    }

    const systemPrompt = `You are an expert senior interviewer. Generate 5 advanced, deep-dive TECHNICAL interview questions for the ${domain} domain. These are Round 2 questions for a candidate who already passed a basic round.`;
    const userPrompt = `Generate 5 advanced technical questions for ${domain}. They must be intellectually rigorous, system-design or concept-depth level.
Return ONLY a raw JSON array with objects: { id, question, type } where type is always "Technical" and id starts at 6.`;

    const modelName = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    const msg = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const questions = parseClaudeJson(msg.content[0].text);
    return res.status(200).json({ questions });
  } catch (err) {
    console.error('Error generating bonus questions:', err);
    // Fallback to mock on error
    const bonusQuestions = ROUND2_QUESTIONS[domain] || ROUND2_QUESTIONS['Software Engineering'];
    return res.status(200).json({ questions: bonusQuestions });
  }
});

// 4. Interview Evaluation Endpoint
// POST /api/sessions/evaluate
app.post('/api/sessions/evaluate', requireAuth, async (req, res) => {
  const { domain, difficulty, answers } = req.body;

  if (!domain || !difficulty || !answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Bad Request: Domain, Difficulty, and valid Answers array are required' });
  }

  try {
    let evaluation;
    
    if (!isAnthropicConfigured) {
      // Compute mock scores based on candidate response length
      const totalWords = answers.reduce((sum, ans) => sum + (ans.user_answer ? ans.user_answer.trim().split(/\s+/).length : 0), 0);
      const avgWords = Math.round(totalWords / answers.length);
      
      const commScore = Math.min(10, Math.max(5, Math.round(5 + (avgWords - 50) / 12)));
      const techScore = Math.min(10, Math.max(4, Math.round(6 + Math.random() * 3)));
      const confScore = Math.min(10, Math.max(5, Math.round(7 + Math.random() * 2)));

      evaluation = {
        communication: commScore,
        technical: techScore,
        confidence: confScore,
        strength: `Demonstrated excellent structure in your responses. You introduced your concepts clearly, provided high-quality context, and averaged a strong ${avgWords} words per response, which exceeds the threshold and shows depth.`,
        improvement: `Try expanding on the quantitative outcomes of your examples. For instance, rather than just stating that you solved the problem, mention the final performance metrics or user feedback where appropriate.`,
        example_answer: `For your first question ("${answers[0].question}"), a model response could be: "A comprehensive answer details both key concepts and practical, real-world examples. For instance, explaining technical parameters clearly, structuring with the STAR method for behavioral questions, and outlining design trade-offs for situational problems."`
      };
    } else {
      // 1. Build the transcript for evaluation
      const transcript = answers.map((ans, idx) => {
        return `[Question ${idx + 1}] Type: ${ans.question_type}\nQuestion: ${ans.question}\nCandidate Answer: ${ans.user_answer}`;
      }).join('\n\n---\n\n');

      // 2. Create the evaluation system prompt as requested
      const systemPrompt = `You are a professional interview coach. Evaluate this answer for a ${domain} interview. Score on: Communication Clarity (0-10), Technical Accuracy (0-10), Confidence & Tone (0-10). Return JSON: {communication, technical, confidence, strength, improvement, example_answer}.`;

      const userPrompt = `Here is the interview transcript containing questions and the candidate's answers from a ${difficulty}-level interview:

${transcript}

Evaluate the candidate's overall performance. Return ONLY a single JSON object.
Do not include any conversational greeting, markdown blocks, preambles, or explanations. Just return the raw JSON object.`;

      const modelName = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

      const msg = await anthropic.messages.create({
        model: modelName,
        max_tokens: 2500,
        temperature: 0.5,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const rawResponse = msg.content[0].text;
      evaluation = parseClaudeJson(rawResponse);
    }

    // Calculate overall score (weighted average scaled to 0-100)
    const comm = parseFloat(evaluation.communication) || 0;
    const tech = parseFloat(evaluation.technical) || 0;
    const conf = parseFloat(evaluation.confidence) || 0;
    const overallScore = Math.round(((comm + tech + conf) / 3) * 10);

    // Determine Grade: Excellent (85+), Good (70-84), Needs Practice (<70)
    let grade = 'Needs Practice';
    if (overallScore >= 85) {
      grade = 'Excellent';
    } else if (overallScore >= 70) {
      grade = 'Good';
    }

    let sessionData;
    let answersToInsert = answers.map((ans) => ({
      question: ans.question,
      question_type: ans.question_type,
      user_answer: ans.user_answer
    }));

    if (!isSupabaseConfigured) {
      // Save session in local mock_db.json file
      const db = readMockDb();
      
      // Ensure user exists
      let profile = db.users.find(u => u.id === req.user.id);
      if (!profile) {
        profile = {
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || '',
          avatar_url: req.user.user_metadata?.avatar_url || ''
        };
        db.users.push(profile);
      }

      sessionData = {
        id: `mock-session-${Math.random().toString(36).substr(2, 9)}`,
        user_id: req.user.id,
        domain,
        difficulty,
        communication_score: Math.round(comm),
        technical_score: Math.round(tech),
        confidence_score: Math.round(conf),
        overall_score: overallScore,
        grade,
        strength: evaluation.strength,
        improvement: evaluation.improvement,
        example_answer: evaluation.example_answer,
        created_at: new Date().toISOString()
      };
      db.sessions.push(sessionData);

      const richAnswers = answersToInsert.map((ans, idx) => ({
        id: `mock-ans-${Math.random().toString(36).substr(2, 9)}`,
        session_id: sessionData.id,
        created_at: new Date(Date.now() + idx * 1000).toISOString(),
        ...ans
      }));
      db.session_answers.push(...richAnswers);
      
      writeMockDb(db);
      answersToInsert = richAnswers;
    } else {
      // 3. Save session to Supabase
      const { data: userProfile, error: profileErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', req.user.id)
        .single();

      if (profileErr || !userProfile) {
        await supabase.from('users').insert({
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || '',
          avatar_url: req.user.user_metadata?.avatar_url || ''
        });
      }

      const { data: sData, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          user_id: req.user.id,
          domain,
          difficulty,
          communication_score: Math.round(comm),
          technical_score: Math.round(tech),
          confidence_score: Math.round(conf),
          overall_score: overallScore,
          grade,
          strength: evaluation.strength,
          improvement: evaluation.improvement,
          example_answer: evaluation.example_answer
        })
        .select()
        .single();

      if (sessionErr) {
        throw new Error(`Database error saving session: ${sessionErr.message}`);
      }
      
      sessionData = sData;

      const itemsToInsert = answersToInsert.map((ans) => ({
        session_id: sessionData.id,
        question: ans.question,
        question_type: ans.question_type,
        user_answer: ans.user_answer
      }));

      const { data: aData, error: answersErr } = await supabase
        .from('session_answers')
        .insert(itemsToInsert)
        .select();

      if (answersErr) {
        console.error('Failed to save answers to DB, but session was saved:', answersErr);
      } else if (aData) {
        answersToInsert = aData;
      }
    }

    // Return results to client
    return res.status(200).json({
      session: sessionData,
      answers: answersToInsert,
      evaluation: {
        ...evaluation,
        overall_score: overallScore,
        grade
      }
    });

  } catch (err) {
    console.error('Error in session evaluation:', err);
    return res.status(500).json({ error: 'Internal Server Error: Evaluation failed.' });
  }
});

// 4. Dashboard Stats Endpoint
// GET /api/dashboard/stats
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    let sessions = [];
    
    if (!isSupabaseConfigured) {
      const db = readMockDb();
      sessions = db.sessions.filter(s => s.user_id === req.user.id);
      sessions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      // Get all sessions for this user from Supabase
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }
      sessions = data || [];
    }

    // If no sessions, return empty stats schema
    if (!sessions || sessions.length === 0) {
      return res.status(200).json({
        totalSessions: 0,
        averageScore: 0,
        averageCommunication: 0,
        averageTechnical: 0,
        averageConfidence: 0,
        lastGrade: 'N/A',
        sessions: [],
        progressChart: [],
        radarChart: []
      });
    }

    const totalSessions = sessions.length;
    const sumScores = sessions.reduce((acc, s) => acc + s.overall_score, 0);
    const averageScore = Math.round(sumScores / totalSessions);
    
    const sumComm = sessions.reduce((acc, s) => acc + s.communication_score, 0);
    const sumTech = sessions.reduce((acc, s) => acc + s.technical_score, 0);
    const sumConf = sessions.reduce((acc, s) => acc + s.confidence_score, 0);

    const averageCommunication = Number((sumComm / totalSessions).toFixed(1));
    const averageTechnical = Number((sumTech / totalSessions).toFixed(1));
    const averageConfidence = Number((sumConf / totalSessions).toFixed(1));
    const lastGrade = sessions[sessions.length - 1].grade;

    // Progress chart formatting (e.g. { name: 'Session 1', score: 82 })
    const progressChart = sessions.map((s, index) => ({
      name: `Session ${index + 1}`,
      date: new Date(s.created_at).toLocaleDateString(),
      score: s.overall_score,
      domain: s.domain
    }));

    // Radar chart formatting: aggregated score by metric (0 to 100 scale)
    const radarChart = [
      { subject: 'Communication', A: averageCommunication * 10, fullMark: 100 },
      { subject: 'Technical Accuracy', A: averageTechnical * 10, fullMark: 100 },
      { subject: 'Confidence', A: averageConfidence * 10, fullMark: 100 }
    ];

    return res.status(200).json({
      totalSessions,
      averageScore,
      averageCommunication,
      averageTechnical,
      averageConfidence,
      lastGrade,
      sessions: [...sessions].reverse(), // latest first for display lists
      progressChart,
      radarChart
    });

  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ error: 'Internal Server Error: Failed to retrieve stats.' });
  }
});

// 5. Session Answers Endpoint (For Dashboard/History PDF Generation fallback)
// GET /api/sessions/:sessionId/answers
app.get('/api/sessions/:sessionId/answers', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!isSupabaseConfigured) {
      const db = readMockDb();
      const answers = db.session_answers.filter(ans => ans.session_id === sessionId);
      return res.status(200).json({ answers });
    } else {
      const { data: answers, error } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return res.status(200).json({ answers });
    }
  } catch (err) {
    console.error('Error fetching session answers:', err);
    return res.status(500).json({ error: 'Internal Server Error: Failed to retrieve answers.' });
  }
});

// 6. User Profile Endpoints
// GET /api/users/profile
app.get('/api/users/profile', requireAuth, (req, res) => {
  if (!isSupabaseConfigured) {
    const db = readMockDb();
    const profile = db.users.find(u => u.id === req.user.id);
    if (profile) {
      return res.status(200).json({ profile });
    }
  }
  return res.status(200).json({ 
    profile: {
      full_name: req.user.user_metadata?.full_name || '',
      email: req.user.email,
      phone: req.user.user_metadata?.phone || '',
      bio: req.user.user_metadata?.bio || '',
      location: req.user.user_metadata?.location || '',
      job_title: req.user.user_metadata?.job_title || '',
      company: req.user.user_metadata?.company || '',
      education: req.user.user_metadata?.education || '',
      years_experience: req.user.user_metadata?.years_experience || '',
      linkedin_url: req.user.user_metadata?.linkedin_url || '',
      github_url: req.user.user_metadata?.github_url || '',
      portfolio_url: req.user.user_metadata?.portfolio_url || '',
      skills: req.user.user_metadata?.skills || '',
      target_roles: req.user.user_metadata?.target_roles || '',
      target_domains: req.user.user_metadata?.target_domains || '',
      avatar_url: req.user.user_metadata?.avatar_url || '',
      gender: req.user.user_metadata?.gender || ''
    }
  });
});

// PUT /api/users/profile
app.put('/api/users/profile', requireAuth, async (req, res) => {
  if (!isSupabaseConfigured) {
    const db = readMockDb();
    let profile = db.users.find(u => u.id === req.user.id);
    if (!profile) {
      profile = { id: req.user.id };
      db.users.push(profile);
    }

    // Merge all fields from the request body, overwriting existing values
    const fields = [
      'full_name', 'phone', 'bio', 'location', 'job_title', 'company',
      'education', 'years_experience', 'linkedin_url', 'github_url',
      'portfolio_url', 'skills', 'target_roles', 'target_domains',
      'avatar_url', 'gender'
    ];
    profile.email = req.user.email;
    fields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        profile[field] = req.body[field];
      }
    });

    writeMockDb(db);
    return res.status(200).json({ status: 'OK', profile });
  }

  try {
    const metadataPayload = {};
    const metadataKeys = [
      'phone', 'bio', 'location', 'job_title', 'company', 'education',
      'years_experience', 'linkedin_url', 'github_url', 'portfolio_url',
      'skills', 'target_roles', 'target_domains', 'avatar_url', 'gender'
    ];

    metadataKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        metadataPayload[key] = req.body[key];
      }
    });

    const updatePayload = {
      user_metadata: {
        ...(req.user.user_metadata || {}),
        ...metadataPayload
      }
    };

    if (req.body.full_name) {
      updatePayload.user_metadata.full_name = req.body.full_name;
    }

    const { data: updatedUser, error: updateErr } = await supabase.auth.admin.updateUserById(req.user.id, updatePayload);
    if (updateErr) {
      console.error('Failed to update Supabase auth user metadata:', updateErr);
      return res.status(500).json({ error: 'Failed to update profile metadata.' });
    }

    const dbUpdate = {};
    if (req.body.full_name) dbUpdate.full_name = req.body.full_name;
    if (req.body.avatar_url) dbUpdate.avatar_url = req.body.avatar_url;

    if (Object.keys(dbUpdate).length > 0) {
      await supabase.from('users').upsert({ id: req.user.id, email: req.user.email, ...dbUpdate });
    }

    return res.status(200).json({ status: 'OK', profile: {
      full_name: updatedUser.user_metadata?.full_name || updatedUser.email,
      email: updatedUser.email,
      phone: updatedUser.user_metadata?.phone || '',
      bio: updatedUser.user_metadata?.bio || '',
      location: updatedUser.user_metadata?.location || '',
      job_title: updatedUser.user_metadata?.job_title || '',
      company: updatedUser.user_metadata?.company || '',
      education: updatedUser.user_metadata?.education || '',
      years_experience: updatedUser.user_metadata?.years_experience || '',
      linkedin_url: updatedUser.user_metadata?.linkedin_url || '',
      github_url: updatedUser.user_metadata?.github_url || '',
      portfolio_url: updatedUser.user_metadata?.portfolio_url || '',
      skills: updatedUser.user_metadata?.skills || '',
      target_roles: updatedUser.user_metadata?.target_roles || '',
      target_domains: updatedUser.user_metadata?.target_domains || '',
      avatar_url: updatedUser.user_metadata?.avatar_url || '',
      gender: updatedUser.user_metadata?.gender || ''
    }});
  } catch (err) {
    console.error('Error updating Supabase profile:', err);
    return res.status(500).json({ error: 'Internal Server Error: Failed to update profile.' });
  }
});

// Start Express App
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 WeIntern Backend Server running on port ${PORT}`);
  console.log(`📝 Mode: ${isSupabaseConfigured ? 'REAL DATABASE' : 'DEMO/MOCK DATABASE'}`);
  console.log(`🤖 AI Engine: ${isAnthropicConfigured ? 'CLAUDE API' : 'MOCK AI RESPONSES'}`);
  console.log(`====================================================`);
});

