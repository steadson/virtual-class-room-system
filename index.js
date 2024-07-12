const express = require('express');
const http = require('http');
const mongoose= require('mongoose')
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser')
const app = express();
const db = require('./model/db');
const Student = require('./model/Student.js'); // Adjust according to your model file structure
const Course = require('./model/Course');

const server = http.createServer(app);
const io = socketIo(server);
const session = require('express-session');
const MongoStore = require('connect-mongo');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
// MongoDB connection
mongoose.connect('mongodb+srv://steadson1:Asiye0802.@cluster0.hrp03tt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

    // Session middleware setup
    app.use(session({
        secret: 'your_secret_key', // Change this to a random string
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ 
            mongoUrl: 'mongodb+srv://steadson1:Asiye0802.@cluster0.hrp03tt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' 
        }),
        cookie: { maxAge: 3600000 } // Session expires in 1 hour (adjust as needed)
    }));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/admin', (req, res) => {
    res.render('admin');
});
app.get('/student/login', (req, res)=>{
    res.render('student-login')
});
app.post('/student/login', async(req,res)=>{
    const{fullName, password} = req.body;
    console.log(req.body)
    try{
        const student = await Student.findOne({fullName, password});
        console.log(student)
        if(student){
            req.session.student = student;
            console.log('session',req.session.student)
            res.json({success:true})
        }else {
        
            res.json({ success: false });
           //res.status(401).send('Invalid credentials');
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Error logging in');
    }
        
    
})
app.get('/admin/login', (req, res) => {
    res.render('admin-login');
});
app.post('/admin/login', async (req, res) => {
    const { fullName, courseNumber, password } = req.body;
    console.log(fullName, courseNumber, password)
    try {
        const admin = await db.findOne({ fullName, courseNumber, password });
        if (admin) {
            req.session.admin = admin; // Store admin data in session
            res.json({ success: true });

            // res.redirect('/admin/dashboard');
           
        } else {
        
            res.json({ success: false });
           //res.status(401).send('Invalid credentials');
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Error logging in');
    }
});
app.get('/student/student-signup', (req, res) => {
    res.render('student-signup');
});
app.post('/student/student-signup', async (req, res) => {
    
    const { fullName,faculty, department, degreeLevel, email, password, matricNumber } = req.body;
   
    try {
        // Create a new admin object with the submitted data
        const student = new Student({
            fullName,
         matricNumber,
            faculty,
            department,
            degreeLevel,
            email,
            password
        });
        console.log( fullName, faculty, department, degreeLevel, email, password )
        // Save the admin data to MongoDB
        await student.save();

        // Redirect to login page after successful sign-up
        res.redirect('/student/login');
    } catch (err) {
        console.log(err)
        res.status(500).send('Error signing up student');
    }
});
// Route to render the admin sign-up form
app.get('/admin/admin-signup', (req, res) => {
    res.render('admin-signup');
});

// Route to handle the admin sign-up form submission
app.post('/admin/admin-signup', async (req, res) => {
    
    const { fullName, sex, faculty, department, courseTitle, courseNumber, courseUnit, degreeLevel, email, password } = req.body;
   
    try {
        // Create a new admin object with the submitted data
        const admin = new db({
            fullName,
            sex,
            faculty,
            department,
            courseTitle,
            courseNumber,
            courseUnit,
            degreeLevel,
            email,
            password
        });
        console.log( fullName, sex, faculty, department, courseTitle, courseNumber, courseUnit, degreeLevel, email, password )
        // Save the admin data to MongoDB
        await admin.save();

        // Redirect to login page after successful sign-up
        res.redirect('/admin/login');
    } catch (err) {
        console.log(err)
        res.status(500).send('Error signing up admin');
    }
});
app.get('/student/student-dashboard', (req, res)=>{
    console.log('Session data:', req.session);
    if (req.session && req.session.student) {
        console.log('student authenticated, rendering dashboard');
        res.render('student-dashboard', { student: req.session.student });
    } else {
        console.log('Admin not authenticated, redirecting to login');
        res.redirect('/admin/login');
    }
})
app.get('/api/refresh-virtual-classes', async (req, res) => {
    if (!req.session || !req.session.student) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const student = await Student.findById(req.session.student._id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
console.log('virtualClasses', student.viirtualClasses)
        res.json({ success: true, virtualClasses: student.virtualClasses });
    } catch (err) {
        console.error('Error in /api/refresh-virtual-classes:', err);
        res.status(500).json({ success: false, message: 'Error refreshing virtual classes' });
    }
});
app.get('/admin/virtual-class', (req, res) => {
    if (req.session && req.session.admin) {
        res.render('virtual-class', { admin: req.session.admin });
    } else {
        res.redirect('/admin/login');
    }
});
app.get('/admin/admin-dashboard', (req, res) => {
    console.log('Session data:', req.session);
    if (req.session && req.session.admin) {
        console.log('Admin authenticated, rendering dashboard');
        res.render('admin-dashboard', { admin: req.session.admin });
    } else {
        console.log('Admin not authenticated, redirecting to login');
        res.redirect('/admin/login');
    }
});

app.get('/api/courses/:course/students', async (req, res) => {
    const { course } = req.params;
console.log("geting", req.params)
    try {
        const courseDoc = await Course.findOne({course:course}).populate('students');
        const courseDoc2 = await Course.findOne({course:course})
        const department = courseDoc2.department
        console.log(department)
        if (!courseDoc) {
            console.log('error loading registered courses')
            return res.status(404).json({ error: 'Course not found' });
        }
        console.log('loading registered student',courseDoc.students)
        res.json({students:courseDoc.students, department:department});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching registered students' });
    }
});


app.get('/api/courses/:course/students2', async (req, res) => {
    const { course } = req.params;
console.log("geting", req.params)
    try {
        const courseDoc = await Course.findOne({
            course: { $regex: new RegExp('^' + course + '$', 'i') }
        }).populate('students');
        const courseDoc2 = await Course.findOne({course:course})
        console.log(courseDoc.department)
        const department = courseDoc2.department
        console.log(department)
        if (!courseDoc) {
            console.log('error loading registered courses')
            return res.status(404).json({ error: 'Course not found' });
        }
        console.log('loading registered student',courseDoc.students)
        res.json({students:courseDoc.students, department:courseDoc.department});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching registered students' });
    }
});


app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        console.log(students)
        res.json({students:students});
    } catch (err) {
        res.status(500).send('Error fetching students');
    }
});
app.post('/api/register-student-to-course', async (req, res) => {
    console.log('Received registration request:', req.body);
    const { student, department, course } = req.body;
    try {
        const studentData = await Student.findById(student);
        if (!studentData) {
            return res.json({ success: false, message: 'Student not found' });
        }

        const courseData = await Course.findOne({course: { $regex: new RegExp('^' + course + '$', 'i') }, department });
        if (courseData) {
            courseData.students.push({
                name: studentData.fullName,
                matricNumber: studentData.matricNumber
            });
            await courseData.save();
        } else {
            const newCourse = new Course({
                course,
                department,
                students: [{
                    name: studentData.fullName,
                    matricNumber: studentData.matricNumber
                }]
            });
            await newCourse.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error registering student to course');
    }
});


app.post('/api/remove-student-from-course', async (req, res) => {
    const { matricNumber, course } = req.body;
    console.log("removing", matricNumber, course);

    try {
        // Remove student from course
        const courseDoc = await Course.findOne({ course: course });
        if (!courseDoc) {
            return res.status(404).json({ error: 'Course not found' });
        }

        courseDoc.students = courseDoc.students.filter((student) => student.matricNumber !== matricNumber);
        await courseDoc.save();

        // Remove virtual class from student
        const student = await Student.findOne({ matricNumber: matricNumber });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        student.virtualClasses = student.virtualClasses.filter((vc) => vc.course !== course);
        await student.save();

        res.json({ success: true, message: 'Student removed from course and virtual class removed from student' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error removing student from course and virtual class' });
    }
});
app.get('/admin/virtual-class', (req, res) => {
    if (req.session && req.session.admin) {
        res.render('virtual-class', { admin: req.session.admin });
    } else {
        res.redirect('/admin/login');
    }
});
app.get('/virtual-class', (req, res) => {
    if (!req.session || (!req.session.admin && !req.session.student)) {
        return res.redirect('/login');
    }

    const user = req.session.admin || req.session.student;
    res.render('virtual-class', { user });
});
app.post('/api/send-link-to-students', async (req, res) => {
    const { classLink, startTime, courseTitle } = req.body;
    
    if (!req.session || !req.session.admin) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const courseDoc = await Course.findOne({ course: courseTitle });

        if (!courseDoc) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const startDateTime = new Date(startTime);

        // Update each student's document with the new virtual class information
        const updatePromises = courseDoc.students.map(async (student) => {
            return Student.findOneAndUpdate(
                { matricNumber: student.matricNumber },
                {
                    $push: {
                        virtualClasses: {
                            course: courseTitle,
                            link: classLink,
                            startTime: startDateTime
                        }
                    }
                },
                { new: true }
            );
        });

        await Promise.all(updatePromises);

        res.json({ success: true, message: 'Virtual class link sent to all enrolled students' });
    } catch (err) {
        console.error('Error in /api/send-link-to-students:', err);
        res.status(500).json({ success: false, message: 'Error sending link to students' });
    }
});

app.post('/api/delete-virtual-class', async (req, res) => {
    const { index } = req.body;
    
    if (!req.session || !req.session.student) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const student = await Student.findById(req.session.student._id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        if (index < 0 || index >= student.virtualClasses.length) {
            return res.status(400).json({ success: false, message: 'Invalid virtual class index' });
        }

        student.virtualClasses.splice(index, 1);
        await student.save();

        res.json({ success: true, message: 'Virtual class deleted successfully' });
    } catch (err) {
        console.error('Error in /api/delete-virtual-class:', err);
        res.status(500).json({ success: false, message: 'Error deleting virtual class' });
    }
});
app.get('/student/join-virtual-class/:course/:classID', (req, res) => {
    const { course, classID } = req.params;
    console.log(course, classID)
    if (!req.session || !req.session.student) {
        return res.redirect('/student/login');
    }

    // Construct the virtual class URL
    const virtualClassURL = `${req.protocol}://${req.get('host')}/virtual-class?classID=${classID}`;

    // Redirect to the virtual class page
    res.redirect(virtualClassURL);
});
app.get('/virtual-class/:roomID', (req, res) => {
    const { roomID } = req.params;
    const user = req.session.admin || req.session.student;
    
    if (!user) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }

    res.render('join-virtual-class', { roomID, user });
});

// Logout route for both admin and student
app.post('/api/logout', (req, res) => {
    // Clear the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Error logging out' });
        }
        
        // Clear any cookies
        res.clearCookie('connect.sid'); // Adjust cookie name if you're using a different one

        // Send response
        res.json({ success: true, message: 'Logged out successfully' });
    });})
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
