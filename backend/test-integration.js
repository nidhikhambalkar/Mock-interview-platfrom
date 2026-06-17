const p = {
  id: 'user-integration-test',
  email: 'integration@weintern.com',
  full_name: 'Integration Test User',
  avatar_url: '',
  gender: ''
};
const token = 'Bearer mock-jwt-token-' + Buffer.from(JSON.stringify(p)).toString('base64');

console.log('\n=== Testing Question Generation ===');
fetch('http://127.0.0.1:5000/api/sessions/generate-questions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token
  },
  body: JSON.stringify({ domain: 'Data Science', difficulty: 'Beginner', count: 3 })
})
  .then(r => r.json())
  .then(d => {
    console.log('Questions Generated:', d.questions.length);
    d.questions.forEach((q, i) => console.log('  ' + (i + 1) + '. ' + q.question.substring(0, 70)));
  })
  .catch(e => console.error(e));

setTimeout(() => {
  console.log('\n=== Testing Dashboard Stats ===');
  fetch('http://127.0.0.1:5000/api/dashboard/stats', {
    headers: { 'Authorization': token }
  })
    .then(r => r.json())
    .then(d => {
      console.log('Total Sessions:', d.totalSessions);
      console.log('Average Score:', d.averageScore);
      console.log('Last Grade:', d.lastGrade);
      if (d.sessions.length > 0) {
        console.log('Sessions:', d.sessions.map(s => s.domain + ' (' + s.grade + ')').join(', '));
      }
    })
    .catch(e => console.error(e));
  process.exit(0);
}, 2000);
