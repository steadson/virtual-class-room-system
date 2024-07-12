const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: {type: String, required: true},
    email: {type: String, required: true},
    faculty: {type: String, required: true},
    department: {type: String, required: true},
    degreeLevel: {type: String, required: true},
    matricNumber: {type: String, required: true},
    password: {type: String, required: true},
    virtualClasses: [{
        course: {type: String, required: true},
        link: {type: String, required: true},
        startTime: {type: Date, required: true}
    }]
});

module.exports = mongoose.model('Student', studentSchema);