const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: {type: String, required: true},
    email: {type: String, required: true},
    gender:{type:String, required:true},
   faculty: {type: String},
   department: {type: String},
   degreeLevel: {type: String},
    matricNumber: {type: String},
    password: {type: String},
    courses:[{type:String}],
    virtualClasses: [{
        course: {type: String},
        link: {type: String},
        startTime: {type: Date}
    }]
});

module.exports = mongoose.model('Student', studentSchema);