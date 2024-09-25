const mongoose = require('mongoose');

const cbtExamSchema = new mongoose.Schema({
  lecturer: { type: String, required: true },
  startTime: { type: Date, required: true },
  examDuration:{type:String, required:true},
  course: { type: String, required: true },
  department: { type: String, required: true },
  questions: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      answer: { type: String, required: true }
    }
  ]
});

const CBTExam = mongoose.model('CBTExam', cbtExamSchema);

module.exports = CBTExam;