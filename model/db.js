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
      
    }
});

const db = mongoose.model('Lectuerer', dbSchema);

module.exports = db;
