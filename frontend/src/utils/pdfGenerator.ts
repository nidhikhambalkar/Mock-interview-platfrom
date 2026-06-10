import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFAnswer {
  question: string;
  question_type: string;
  user_answer: string;
}

export interface PDFData {
  studentName: string;
  domain: string;
  difficulty: string;
  date: string;
  overallScore: number;
  grade: string;
  communication: number;
  technical: number;
  confidence: number;
  strength: string;
  improvement: string;
  answers: PDFAnswer[];
}

export const generatePDF = (data: PDFData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Professional Color Palette
  const darkColor: [number, number, number] = [17, 24, 39];      // #111827 (dark gray / slate-900)
  const primaryColor: [number, number, number] = [245, 158, 11];  // #f59e0b (amber-50)
  const textColor: [number, number, number] = [55, 65, 81];       // #374151 (slate-700)
  const secondaryColor: [number, number, number] = [249, 115, 22]; // #f97316 (orange-500)

  // 1. HEADER BANNER
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Title inside Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('WeIntern AI Mock Assessment Report', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(253, 230, 138); // Amber-200
  doc.text('Real-time Mock Evaluation Powered by Claude 3.5 Sonnet Assessment Engine', 15, 28);

  // Decorative header line
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 38, 210, 2, 'F');

  // 2. METADATA SECTION
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Candidate Assessment Metadata', 15, 52);

  // Render Metadata Table
  autoTable(doc, {
    startY: 56,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: textColor },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, textColor: secondaryColor } },
    body: [
      ['Candidate Name', `: ${data.studentName}`],
      ['Career Domain Track', `: ${data.domain}`],
      ['Difficulty Tier Level', `: ${data.difficulty}`],
      ['Evaluation Date', `: ${data.date}`],
    ],
  });

  const metadataEndY = (doc as any).lastAutoTable.finalY + 10;

  // 3. PERFORMANCE SCORES GRID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Competency Performance Evaluation', 15, metadataEndY);

  autoTable(doc, {
    startY: metadataEndY + 4,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5, halign: 'center' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    head: [['Assessment Metric Category', 'Score (0 - 10 Ratio)', 'Percentile Equivalency']],
    body: [
      ['Communication Clarity & Articulation', `${data.communication} / 10`, `${data.communication * 10}%`],
      ['Technical Accuracy & Rationale', `${data.technical} / 10`, `${data.technical * 10}%`],
      ['Confidence & Tone Control', `${data.confidence} / 10`, `${data.confidence * 10}%`],
      ['Overall Aggregated Score', `${data.overallScore} / 100`, data.grade],
    ],
  });

  const scoresEndY = (doc as any).lastAutoTable.finalY + 10;

  // 4. DETAILED COACH FEEDBACK
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('AI Interview Coach Critique', 15, scoresEndY);

  autoTable(doc, {
    startY: scoresEndY + 4,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: secondaryColor } },
    body: [
      ['Core Performance Strengths', data.strength],
      ['Identified Areas for Growth', data.improvement]
    ],
  });

  let nextSectionY = (doc as any).lastAutoTable.finalY + 12;

  // 5. TRANSCRIPT LOG SECTION
  if (nextSectionY > 215) {
    doc.addPage();
    nextSectionY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Interview Q&A Response Log Transcript', 15, nextSectionY);

  const transcriptRows = data.answers.map((ans, idx) => [
    `Q${idx + 1} (${ans.question_type})`,
    `Question Prompt: ${ans.question}\n\nCandidate Answer Response:\n${ans.user_answer}`
  ]);

  autoTable(doc, {
    startY: nextSectionY + 4,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4.5, overflow: 'linebreak' },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 32, textColor: primaryColor },
      1: { textColor: darkColor }
    },
    body: transcriptRows,
  });

  // Footer label indicating page count (A4 sizes)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, 180, 287);
    doc.text('WeIntern AI Mock Interview Platform. Confidential Performance Report.', 15, 287);
  }

  // Trigger Save Dialogue
  const cleanName = data.studentName.trim().replace(/\s+/g, '_');
  const cleanTrack = data.domain.trim().replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`WeIntern_${cleanTrack}_Report_${cleanName}.pdf`);
};
