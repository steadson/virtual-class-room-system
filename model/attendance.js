
const mongoose = require('mongoose');
const course = require('./course');

const attendanceSchema = new mongoose.Schema({
    course: { type: String },
    startTime: { type: String },
    department: { type: String },
    students: [
        {
            name: {type: String},
            matricNumber: {type: String}
        }
    ]

});
module.exports = mongoose.model('Attendance', attendanceSchema);

