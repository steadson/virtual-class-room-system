// models/Admin.js
const mongoose = require('mongoose');

const dbSchema = new mongoose.Schema({
    fullName: {
        type: String,
      
    },
    sex: {
        type: String,
      
    },
    
   
    email: {
        type: String,
      
    },
    password: {
        type: String,
      
    },
    uploads:[
        {
            fileName: String,
            contentType: String,
            size: Number,
            uploadDate: Date,
            downloadURL: String,
            courseId : String,
            departmentId : String
        }
    ]
});

const db = mongoose.model('Lectuerer', dbSchema);

module.exports = db;
