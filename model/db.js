// models/Admin.js
const mongoose = require('mongoose');

const dbSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    sex: {
        type: String,
        required: true
    },
    faculty: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    courseTitle: {
        type: String,
        required: true
    },
    courseNumber: {
        type: String,
        required: true
    },
    courseUnit: {
        type: String,
        required: true
    },
    degreeLevel: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const db = mongoose.model('Lectuerer', dbSchema);

module.exports = db;
