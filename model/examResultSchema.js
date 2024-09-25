const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'CBTExam', required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  answers: [{
    question: { type: String, required: true },
    studentAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  submittedAt: { type: Date, default: Date.now }
});

const ExamResult = mongoose.model('ExamResult', examResultSchema);

module.exports = ExamResult;