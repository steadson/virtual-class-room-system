const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    course: { type: String, required: true },
    department: { type: String, required: true },
    students: [
        {
            name: { type: String, required: true },
            matricNumber: { type: String, required: true }
        }
    ]
});

module.exports = mongoose.model('Course', courseSchema);
