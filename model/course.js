const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courses: { type: String},
    lecturer:{
        type:String
    },
    courseCode:{type: String},
    faculty:{type: String},
    
    department: { type: String },
    students: [
        {
            name: { type: String },
            matricNumber: { type: String }
        }
    ]
});

module.exports = mongoose.model('Course', courseSchema);
