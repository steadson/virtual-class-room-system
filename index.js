const express = require('express');
const http = require('http');
const mongoose = require('mongoose')
const socketIo = require('socket.io');
const { initializeApp } = require('firebase/app')
const config = require('./setup.js')
const bodyParser = require('body-parser')
const app = express();
const db = require('./model/db');
const ExamResult = require('./model/examResultSchema.js')
const CBTExam = require('./model/cbtExam.js')
const Admin = require('./model/admin.js')
const Attendance = require('./model/attendance.js')
const Student = require('./model/Student.js'); // Adjust according to your model file structure
const Course = require('./model/course');
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer');
const server = http.createServer(app);
const io = socketIo(server);
const ngrok = require('ngrok');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
// const { url } = require('inspector');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
const { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } = require("firebase/storage");
// MongoDB connection mongodb+srv://steadson1:Asiye0802.@cluster0.hrp03tt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
mongoose.connect('mongodb+srv://ekpojohn:asiye0802@cluster1.vg4ce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1')
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'asiyemiea01@gmail.com',
        pass: 'vrukzdhgugjkoxca'
    }
});

//Initialize a firebase application
initializeApp(config.firebaseConfig);
// Initialize Cloud Storage and get a reference to the service
const storage = getStorage();
// Setting up multer as a middleware to grab photo uploads
const upload = multer({ storage: multer.memoryStorage() });


// Session middleware setup
app.use(session({
    secret: 'your_secret_key', // Change this to a random string
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://ekpojohn:asiye0802@cluster1.vg4ce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1'
    }),
    cookie: { maxAge: 3600000 } // Session expires in 1 hour (adjust as needed)
}));



app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});


app.get('/admin/login', async (req, res) => {
    res.render('admin-login')
})

app.get('/classes/login', (req, res) => {

    // Check if the user is already logged in as a student
    if (req.session && req.session.student) {

        res.redirect('/student/student-dashboard');

    } else {

        res.redirect('/student/login');
    }
});
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body)
    try {
        const admin = await Admin.findOne({ email })

        // If no lecturer found with that email
        if (!admin) {
            console.log('match not found');
            return res.status(401).json({ error: 'Invalid email or password' });

        }
        console.log('found match')
        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        req.session.admin = admin;
        res.json({ success: true })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Error logging' });
    }
});
app.get('/student/login', (req, res) => {
    res.render('student-login')
});
app.post('/student/login', async (req, res) => {
    const { fullName, password } = req.body;
    console.log(req.body)
    try {
        const student = await Student.findOne({ fullName, password });
        console.log(student)
        if (student) {
            req.session.student = student;
            console.log('session', req.session.student)
            res.json({ success: true })
        } else {

            res.json({ success: false });
            //res.status(401).send('Invalid credentials');
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Error logging in');
    }


})
app.get('/lecturer/login', (req, res) => {
    res.render('lecturer-login');
});
app.post('/lecturer/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(email, password)
    try {
        const lecturer = await db.findOne({ email });
        if (lecturer) {
            // Compare the provided password with the stored hashed password
            const isPasswordValid = bcrypt.compare(password, lecturer.password);

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            req.session.lecturer = lecturer; // Store admin data in session
            res.json({ success: true });

        } else {
            console.log('match not found');
            return res.status(401).json({ error: 'Invalid email or password' });

        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Error logging');
    }
});
app.get('/student/student-signup', (req, res) => {
    res.render('student-signup');
});
app.post('/student/student-signup', async (req, res) => {

    const { fullName, email, password, matricNumber, gender } = req.body;

    try {
        // Create a new admin object with the submitted data
        const student = new Student({
            fullName,
            matricNumber,
            gender,
            email,
            password
        });
        console.log(fullName, matricNumber, gender, email, password)
        // Save the student data to MongoDB
        await student.save();

        // Redirect to login page after successful sign-up
        res.redirect('/student/login');
    } catch (err) {
        console.log(err)
        res.status(500).send('Error signing up student');
    }
});
// Route to render the admin sign-up form
app.get('/lecturer/lecturer-signup', (req, res) => {
    res.render('lecturer-signup');
});
app.post('/lecturer/lecturer-signup', async (req, res) => {
    try {
        const {
            fullName,
            sex,
            email,
            password
        } = req.body;

        // Check if the email is already in use
        const existingLecturer = await db.findOne({ email });
        if (existingLecturer) {
            return res.status(400).json({ error: 'Email is already in use' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new lecturer
        const newLecturer = new db({
            fullName,
            sex,
            email,
            password: hashedPassword
        });

        // Save the new lecturer to the database
        await newLecturer.save();
        //res.redirect('lecturer/login')
        res.status(201).json({ success: 'Lecturer account created successfully' });
    } catch (error) {
        console.error('Error during lecturer signup:', error);
        res.status(500).json({ error: 'An error occurred during signup' });
    }
});

// Route to handle the admin sign-up form submission
app.post('/admin/admin-signup', async (req, res) => {

    const { fullName, sex, email, password } = req.body;
    // Check if the email is already in use
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        return res.status(400).json({ error: 'Email is already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        // Create a new admin object with the submitted data
        const admin = new Admin({
            fullName,
            sex,
            email,
            password: hashedPassword
        });
        console.log(fullName, sex, email, password)
        // Save the admin data to MongoDB
        await admin.save();
        console.log('admin saved')
        // Redirect to login page after successful sign-up
        res.status(201).json({ message: 'signed new Admin successfully' })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Error signing up admin' });
    }
});
app.get('/admin/admin-signup', (req, res) => {
    res.render('admin-signup');
})
app.get('/student/student-dashboard', (req, res) => {
    console.log('Session data:', req.session);
    if (req.session && req.session.student) {
        console.log('student authenticated, rendering dashboard');
        res.render('student-dashboard', { student: req.session.student });
    } else {
        console.log('Admin not authenticated, redirecting to login');
        res.redirect('/student/login');
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
app.get('/lecturer/virtual-class', (req, res) => {
    if (req.session && req.session.lecturer) {
        res.render('virtual-class', { lecturer: req.session.lecturer });
    } else {
        res.redirect('/lecturer/login');
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
app.get('/lecturer/lecturer-dashboard', (req, res) => {
    if (req.session && req.session.lecturer) {
        console.log('lecturer authenticated, rendering dashboard');
        res.render('lecturer-dashboard', { lecturer: req.session.lecturer });

    }
})

app.get('/api/courses/:course/students2', async (req, res) => {
    const { course } = req.params;
    console.log("geting", req.params)
    try {
        const courseDoc = await Course.findOne({
            course: { $regex: new RegExp('^' + course + '$', 'i') }
        }).populate('students');
        const courseDoc2 = await Course.findOne({ course: course })
        console.log(courseDoc.department)
        const department = courseDoc2.department
        console.log(department)
        if (!courseDoc) {
            console.log('error loading registered courses')
            return res.status(404).json({ error: 'Course not found' });
        }
        console.log('loading registered student', courseDoc.students)
        res.json({ students: courseDoc.students, department: courseDoc.department });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching registered students' });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        console.log(students)
        res.json({ students: students });
    } catch (err) {
        res.status(500).send('Error fetching students');
    }
});
app.get('/api/lecturers', async (req, res) => {
    try {
        const lecturers = await db.find();
        console.log('lecturer', lecturers)
        res.json({ lecturers: lecturers });
    } catch (err) {
        res.status(500).send('Error fetching lecturer');
    }
});

app.post('/api/register-student', async (req, res) => {
    const { studentId, faculty, department, degreeLevel, courses } = req.body;

    try {
        // Find the student
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Filter out courses that the student is already registered for
        const newCourses = courses.filter(course => !student.courses.includes(course));

        if (newCourses.length === 0) {
            return res.status(404).json({ success: false, message: 'Student already registered for all specified courses' });
        }

        // Update student with new courses and other details
        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            {
                // faculty,
                 department,
                 degreeLevel,
                $addToSet: { courses: { $each: newCourses } }
            },
            { new: true }
        );

        // Update Courses
        for (const course of newCourses) {
            await Course.findOneAndUpdate(
                { courses: course, department: student.department },
                {
                    $addToSet: {
                        students: {
                            name: student.fullName,
                            matricNumber: student.matricNumber
                        }
                    },
                    faculty: student.faculty,
                    department: student.department
                },
                { upsert: true }
            );
        }

        res.json({
            success: true,
            message: 'Student registered successfully',
            newCourses: newCourses,
            totalCourses: updatedStudent.courses.length
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Error registering student' });
    }
});

app.post('/api/assign-course-to-lecturer', async (req, res) => {
    console.log('Received lecturer info', req.body);
    const { name2, faculty2, department2, degreeLevel2, thecourse, courseCode2 } = req.body;
    
    try {
        const lecturer = await db.findOne({ fullName: name2 });
        if (!lecturer) {
            return res.status(404).json({ success: false, message: 'Lecturer not found' });
        }

        const existingCourse = await Course.findOne({
            courses: thecourse,
            department: department2,
            lecturer: name2
        });

        if (existingCourse) {
            // Course is already assigned to this lecturer
            return res.status(404).json({ 
                success: false, 
                message: 'Course is already assigned to this lecturer',
                noChangeMade: true
            });
        }
const existingCourseWithAnotherLecturer = await Course.findOne({
    courses:thecourse,
    department: department2
})
if(existingCourseWithAnotherLecturer){
    if(typeof(existingCourseWithAnotherLecturer.lecturer)==='string' && existingCourseWithAnotherLecturer.lecturer !== (undefined || null)){
        return res.status(404).json({ 
            success: true, 
            message: `Course is already assigned to another lecturer ,${ existingCourseWithAnotherLecturer.lecturer}`,
            noChangeMade: true
        });
    }
}
        const courseData = await Course.findOne({
            courses: thecourse, 
            department: department2
        });

        if (courseData) {
            // Update existing course
            if (courseData.lecturer !== name2) {
                courseData.lecturer = name2;
                courseData.faculty = faculty2;
                courseData.courseCode = courseCode2;
                await courseData.save();
            } else {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Course is already assigned to this lecturer',
                    noChangeMade: true
                });
            }
        } else {
            // Create new course
            const newCourse = new Course({
                courses: thecourse,
                department: department2,
                lecturer: name2,
                faculty: faculty2,
                courseCode: courseCode2
            });
            await newCourse.save();
        }

        res.json({ 
            success: true, 
            message: 'Lecturer assigned successfully',
            noChangeMade: false
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error assigning lecturer' });
    }
});
app.get('/api/getFullLecturerDetails', async (req, res) => {
    const { id } = req.query
    console.log(req.query)
    try {
        const lecturer = await db.findOne({ _id: id })
        if (!lecturer) {
            return res.status(404).json({ error: 'lecturer not found' })
        }
        console.log(lecturer)
        const { fullName, sex, email } = lecturer
        const personalInfo = { name: fullName, sex: sex, email: email }
        const Courses = await Course.find({ lecturer: fullName })
        const courseList = []
        if (Courses) {
            console.log(Courses)
            Courses.forEach(course => {
                // Ensure courseCode and other fields are defined or assign a default value
                const courseCode = course.courseCode || 'null';
                const department = course.department || 'null';
                const faculty = course.faculty || 'null';
                const students = course.students.length || '0'
                const coursez = course.courses || 'null'
                courseList.push({
                    coursez, courseCode, department, faculty, students
                })

            });
        }
        return res.status(200).json({ list: courseList, personalInfo: personalInfo })
    } catch (err) {
        console.log('error occured', err)
        return res.status(400).json({ eror: 'an error occured' })
    }
})

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
    const { classLink, startTime, courseId, courseTitle, baseUrl } = req.body;
    console.log(baseUrl)
    if (!req.session || !req.session.lecturer) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        // Find students enrolled in the specific course
        const students = await Student.find({ courses: courseTitle });
        const findCourse = await Course.findById(courseId)
        if (findCourse) {
            let department = findCourse.department
            let course = findCourse.courses
            const newAttendance = new Attendance({
                department, course, startTime
            })
            console.log(newAttendance)
            await newAttendance.save();
            console.log('saved')
        }
        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'No students found for this course' });
        }

        const startDateTime = new Date(startTime);

        // Update each student's document with the new virtual class information
        const updatePromises = students.map(async (student) => {
            // Check if a virtual class for this course and time already exists
            const existingClass = student.virtualClasses.find(vc =>
                vc.course === courseTitle && vc.startTime.getTime() === startDateTime.getTime()
            );

            if (!existingClass) {
                // Only add the new virtual class if it doesn't already exist
                await Student.findByIdAndUpdate(
                    student._id,
                    {
                        $addToSet: { // Use $addToSet instead of $push to avoid duplicates
                            virtualClasses: {
                                course: courseTitle,
                                link: classLink,
                                startTime: startDateTime
                            }
                        }
                    },
                    { new: true }
                );
            }

            // Send email to student
            if (student.email) {
                console.log('send email to ', student.email);
                const mailOptions = {
                    from: 'asiyemiea01@gmail.com',
                    to: student.email,
                    subject: `Virtual Class Link for ${courseTitle}`,
                    text: `Dear ${student.fullName},\n\nYour virtual class for ${courseTitle} is scheduled for ${startDateTime}.\n\nJoin using this link:<a href=${baseUrl}/classes/login>Join</a> \n\nBest regards,\nUniversity of Calabar`
                };

                await transporter.sendMail(mailOptions);
            }
        });

        await Promise.all(updatePromises);

        res.json({ success: true, message: `Virtual class link sent to ${students.length} enrolled students` });
    } catch (err) {
        console.error('Error in /api/send-link-to-students:', err);
        res.status(500).json({ success: false, message: 'Error sending link to students' });
    }
});
app.post('/api/match-virtual-class', async (req, res) => {
    const { urlIdentifier } = req.body;

    try {
        // Find a student whose virtualClasses array contains a link that ends with the given URL identifier
        const student = await Student.findOne({
            virtualClasses: {
                $elemMatch: {
                    link: { $regex: new RegExp(`${urlIdentifier}$`) } // Match the link ending with the identifier
                }
            }
        });

        if (student) {
            // Find the specific virtual class in the student's virtualClasses array
            const matchedClass = student.virtualClasses.find(vc => vc.link.endsWith(urlIdentifier));

            if (matchedClass) {
                // Send the course, startTime, and fullName back to the frontend
             const course= matchedClass.course
            const startTime= matchedClass.startTime
             const theStudent={name:req.session.student.fullName,
                matricNumber: req.session.student.matricNumber
             }  
             const department = req.session.student.department
             const startT = new Date(startTime)
             startT.setHours(startTime.getHours()+1)
             const startTimeString = startT.toISOString().slice(0, 16); // Convert to 'YYYY-MM-DDTHH:MM' format
             const updateAttendance = await Attendance.findOneAndUpdate(
                 { course: course, department: department, startTime: startTimeString },
                 { $addToSet: { students: theStudent } },
                 { new: true }
             )
             console.log(startTimeString)
             console.log('updateAttendance', updateAttendance)
                res.json({
                    success: true,
                    fullName: student.fullName,
                    course: matchedClass.course,
                    startTime: matchedClass.startTime
                });
            }
        } else {
            // No match found
            res.json({ success: false, message: 'No matching virtual class found.' });
        }
    } catch (error) {
        console.error('Error matching virtual class:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
app.post('/api/joinedVirtualClass', async (req, res) => {
    const { index } = req.body;
    console.log("virtusl class index", req.body)
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

        const vClass = student.virtualClasses[index];
        const department = student.department
        const findCourse = await Course.find({ courses: vClass.course, department: department })
        console.log("vClass:", vClass)
        const course = vClass.course
        const startTime = vClass.startTime
        const theStudent = {
            name: req.session.student.fullName,
            matricNumber: req.session.student.matricNumber
        }
        // Assuming vClass.startTime is a Date object
        const startT = new Date(vClass.startTime);
        startT.setHours(startTime.getHours() + 1); // Add 1 hour to the start time

        const startTimeString = startT.toISOString().slice(0, 16); // Convert to 'YYYY-MM-DDTHH:MM' format
        const updateAttendance = await Attendance.findOneAndUpdate(
            { course: vClass.course, department: department, startTime: startTimeString },
            { $addToSet: { students: theStudent } },
            { new: true }
        )
        console.log(startTimeString)
        console.log('updateAttendance', updateAttendance)



        res.json({ success: true, message: 'attendance taken' });
    } catch (err) {
        console.error('Error in /api/delete-virtual-class:', err);
        res.status(500).json({ success: false, message: 'Error taking attendance' });
    }
})
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
    });
})
app.delete('/api/deleteLecturer/:id', async (req, res) => {
    const lecturerId = req.params.id;

    try {
        // Find the lecturer
        const lecturer = await db.findById(lecturerId);
        if (!lecturer) {
            return res.status(404).json({ success: false, message: 'Lecturer not found' });
        }

        // Remove lecturer from all associated courses
        await Course.updateMany(
            { lecturer: lecturer.fullName },
            { $unset: { lecturer: "" } }
        );

        // Delete the lecturer
        await db.findByIdAndDelete(lecturerId);

        res.json({ success: true, message: 'Lecturer deleted successfully and removed from associated courses' });
    } catch (error) {
        console.error('Error deleting lecturer:', error);
        res.status(500).json({ success: false, message: 'Error deleting lecturer' });
    }
});

app.get('/api/getFullStudentDetails', async (req, res) => {
    const { id } = req.query;
    try {
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const { fullName, email, gender, faculty, department, degreeLevel, matricNumber } = student;
        const personalInfo = { fullName, email, gender, faculty, department, degreeLevel, matricNumber };

        const courses = await Course.find({ 'students.matricNumber': matricNumber });
        const courseList = courses.map(course => ({
            courseName: course.courses,
            courseCode: course.courseCode,
            department: course.department,
            faculty: course.faculty
        }));

        return res.status(200).json({ personalInfo, courseList, virtualClasses: student.virtualClasses });
    } catch (err) {
        console.log('Error occurred', err);
        return res.status(500).json({ error: 'An error occurred' });
    }
});
app.delete('/api/deleteStudent/:id', async (req, res) => {
    const studentId = req.params.id;

    try {
        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Remove student from all associated courses
        await Course.updateMany(
            { 'students.matricNumber': student.matricNumber },
            { $pull: { students: { matricNumber: student.matricNumber } } }
        );

        // Delete the student
        await Student.findByIdAndDelete(studentId);

        res.json({ success: true, message: 'Student deleted successfully and removed from associated courses' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ success: false, message: 'Error deleting student' });
    }
});

// GET /api/courses
app.get('/api/courses', async (req, res) => {
    try {
        console.log(req.session)
        // Assuming the logged-in lecturer's information is available in req.user
        const courses = await Course.find({ lecturer: req.session.lecturer.fullName });
        res.json({ courses });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Error fetching courses' });
    }
});

// GET /api/courses
app.get('/api/courses2', async (req, res) => {
    try {
        console.log(req.session.student.fullName)
        // Assuming the logged-in lecturer's information is available in req.user
        const courses = await Course.find({ 'students.name': req.session.student.fullName });
        console.log(courses)
        res.json({ courses });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Error fetching courses' });
    }
});

// GET /api/courses/:courseId/students
app.get('/api/courses/:courseId/students', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Fetch full student details
        const studentDetails = await Student.find({
            'courses': course.courses // Assuming 'courses' in Student schema is an array of course names
        }).select('fullName matricNumber department');

        res.json({
            students: studentDetails.map(student => ({
                name: student.fullName,
                matricNumber: student.matricNumber,
                department: student.department
            }))
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
});
app.get('/api/lecturer-courses', async (req, res) => {
    if (!req.session || !req.session.lecturer) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const courses = await Course.find({ lecturer: req.session.lecturer.fullName });
        res.json({ success: true, courses });
    } catch (err) {
        console.error('Error fetching lecturer courses:', err);
        res.status(500).json({ success: false, message: 'Error fetching courses' });
    }
});

//upload videos
app.post("/api/uploadVideosorAudio", upload.single("filename"), async (req, res) => {
    const giveCurrentDateTime = () => {
        const today = new Date();
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const dateTime = date + ' ' + time;
        return dateTime;
    }

    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }
        const { courseId, departmentId } = req.body;
        const course = await Course.findById(courseId);
        const department = await Course.findById(courseId);
        const dateTime = giveCurrentDateTime();

        const storageRef = ref(storage, `files/${req.file.originalname + "       " + dateTime}`);

        // Create file metadata including the content type
        const metadata = {
            contentType: req.file.mimetype,
        };

        // Upload the file in the bucket storage
        const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata);
        //by using uploadBytesResumable we can control the progress of uploading like pause, resume, cancel

        // Grab the public url
        const downloadURL = await getDownloadURL(snapshot.ref);


        // Prepare the upload metadata
        const uploadMetadata = {
            fileName: req.file.originalname,
            contentType: req.file.mimetype,
            size: req.file.size,
            uploadDate: new Date(),
            downloadURL: downloadURL,
            courseId: course.courses,
            departmentId: department.department
        };
        console.log(uploadMetadata)
        // Find the user and update their uploads array
        const updatedUser = await db.findOneAndUpdate(

            { fullName: req.session.lecturer.fullName },
            { $push: { uploads: uploadMetadata } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        console.log('File successfully uploaded and user document updated.');
        return res.json({
            message: 'file uploaded to firebase storage',
            name: req.file.originalname,
            type: req.file.mimetype,
            downloadURL: downloadURL
        })
    } catch (error) {
        return res.status(400).send(error.message)
    }

});
app.get('/api/uploadVideosorAudio', async (req, res) => {
    console.log('in the upload get')
    try {
        // Find the user and update their uploads array
        const lecturer = await db.findOne(

            { fullName: req.session.lecturer.fullName },

        );


        if (!lecturer) {
            return res.status(404).json({ message: 'Lecturer not found' });
        }

        // Return the uploads array from the lecturer document
        res.json({ uploads: lecturer.uploads });
    } catch (error) {
        console.error('Error fetching uploads:', error);
        res.status(500).json({ message: 'Server error while fetching uploads' });
    }
});

app.delete("/api/uploadVideosorAudio/:uploadId", async (req, res) => {
    const { uploadId } = req.params;

    try {
        const user = await db.findOne({ 'uploads._id': uploadId });

        if (!user) {
            return res.status(404).json({ error: "Upload not found." });
        }

        const upload = user.uploads.id(uploadId);
        const fileRef = ref(storage, upload.downloadURL);

        await deleteObject(fileRef);

        await db.findOneAndUpdate(
            { 'uploads._id': uploadId },
            { $pull: { uploads: { _id: uploadId } } },
            { new: true }
        );

        console.log('File successfully deleted.');
        return res.json({ message: 'File successfully deleted.' });
    } catch (error) {
        return res.status(400).send(error.message);
    }
});

// POST - Upload assignment
app.post("/api/uploadAssignment", upload.single("filename"), async (req, res) => {
    const giveCurrentDateTime = () => {
        const today = new Date();
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const dateTime = date + ' ' + time;
        return dateTime;
    }

    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }
        const { courseId, departmentId } = req.body;
        const course = await Course.findById(courseId);
        const department = await Course.findById(courseId);

        const dateTime = giveCurrentDateTime();

        const storageRef = ref(storage, `assignments/${req.file.originalname + "       " + dateTime}`);

        const metadata = {
            contentType: req.file.mimetype,
        };

        const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const assignmentMetadata = {
            fileName: req.file.originalname,
            contentType: req.file.mimetype,
            size: req.file.size,
            uploadDate: new Date(),
            downloadURL: downloadURL,
            courseId: course.courses,
            departmentId: department.department,
            studentName: req.session.student.fullName
        };
        console.log(assignmentMetadata)
        const updatedStudent = await Student.findOneAndUpdate(
            { _id: req.session.student._id },
            { $push: { submittedAssignment: assignmentMetadata } },
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ error: "Student not found" });
        }

        console.log('Assignment successfully uploaded and student document updated.');
        return res.json({
            message: 'Assignment uploaded to firebase storage',
            name: req.file.originalname,
            type: req.file.mimetype,
            downloadURL: downloadURL
        });
    } catch (error) {
        return res.status(400).send(error.message);
    }
});
// GET - Retrieve uploaded assignments
app.get('/api/getUploadedAssignments', async (req, res) => {
    try {
        const student = await Student.findById(req.session.student._id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ assignments: student.submittedAssignment });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Server error while fetching assignments' });
    }
});
// DELETE - Remove an uploaded assignment
app.delete("/api/deleteAssignment/:assignmentId", async (req, res) => {
    const { assignmentId } = req.params;

    try {
        const student = await Student.findById(req.session.student._id);

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        const assignment = student.submittedAssignment.id(assignmentId);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const fileRef = ref(storage, assignment.downloadURL);
        await deleteObject(fileRef);

        await Student.findOneAndUpdate(
            { _id: req.session.student._id },
            { $pull: { submittedAssignment: { _id: assignmentId } } },
            { new: true }
        );

        console.log('Assignment successfully deleted.');
        return res.json({ message: 'Assignment successfully deleted.' });
    } catch (error) {
        return res.status(400).send(error.message);
    }
});
app.get('/api/studentGetUploadedMedia', async (req, res) => {
    try {
        const studentId = req.session.student._id; // Adjust based on your session management
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        const studentCourses = student.courses;
        const uploads = [];

        for (const course of studentCourses) {

            const courseDoc = await Course.findOne({
                courses: course,
                //department: student.department,
                'students.matricNumber': student.matricNumber
            });

            if (courseDoc) {
                console.log('found courseDoc', courseDoc)
                const lecturer = await db.findOne({
                    fullName: courseDoc.lecturer,
                    // 'uploads.courseId': courseDoc.courses,
                    //'uploads.departmentId': student.department
                });

                if (lecturer) {
                    console.log('found lecturer', lecturer)
                    lecturer.uploads.forEach(upload => {
                        if (upload.courseId == courseDoc.courses) {
                            console.log('pushing')
                            uploads.push({
                                ...upload.toObject(),
                                lecturerName: lecturer.fullName
                            });
                        }
                    });
                } else {
                    console.log('lecturer not found')
                }
            }
        }

        res.json({ uploads });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/lecturerGetSubmittedDoc', async (req, res) => {
    try {
        const lecturerId = req.session.lecturer._id;
        const lecturer = await db.findById(lecturerId);
        if (!lecturer) {
            return res.status(404).json({ error: 'Lecturer not found.' });
        }

        const lecturerName = lecturer.fullName;
        const submissions = [];

        // Find all courses taught by this lecturer
        const courses = await Course.find({ lecturer: lecturerName });

        for (const course of courses) {
            // Find all students enrolled in this course
            const students = await Student.find({ courses: course.courses });

            for (const student of students) {
                // Filter submitted assignments for this course
                const courseSubmissions = student.submittedAssignment.filter(
                    submission => submission.courseId === course.courses
                );

                submissions.push(...courseSubmissions.map(submission => ({
                    ...submission.toObject(),
                    studentName: student.fullName,
                    studentMatricNumber: student.matricNumber,
                    courseName: course.courses,
                    courseCode: course.courseCode
                })));
            }
        }

        res.json({ submissions });
    } catch (error) {
        console.error('Error fetching submitted assignments:', error);
        res.status(500).json({ error: error.message });
    }
});
// Helper function to generate a random timetable
function generateTimetable(courses) {
    const timetable = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: []
    };

    const days = Object.keys(timetable);
    const times = [
        '8:00 AM - 9:00 AM',
        '9:00 AM - 10:00 AM',
        '10:00 AM - 11:00 AM',
        '11:00 AM - 12:00 PM',
        '12:00 PM - 1:00 PM',
        '1:00 PM - 2:00 PM',
        '2:00 PM - 3:00 PM'
    ];

    courses.forEach(course => {
        const randomDay = days[Math.floor(Math.random() * days.length)];
        const randomTime = times.splice(Math.floor(Math.random() * times.length), 1)[0];

        timetable[randomDay].push({
            course: course.courses,
            lecturer: course.lecturer,
            time: randomTime
        });

        if (times.length === 0) {
            times.push(
                '8:00 AM - 9:00 AM',
                '9:00 AM - 10:00 AM',
                '10:00 AM - 11:00 AM',
                '11:00 AM - 12:00 PM',
                '12:00 PM - 1:00 PM',
                '1:00 PM - 2:00 PM',
                '2:00 PM - 3:00 PM'
            );
        }
    });

    return timetable;
}
app.get('/api/timetable', async (req, res) => {
    try {
        const courses = await Course.find({});
        if (!courses || courses.length === 0) {
            return res.status(404).json({ error: 'No courses found' });
        }

        const timetable = generateTimetable(courses);

        res.json({ timetable });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the timetable' });
    }
});

//cbt sections

// Create a new CBT exam
app.post('/api/cbtexam/create', async (req, res) => {
    try {
        const { lecturer, startTime, examDuration, course, department, questions } = req.body;
        const newExam = new CBTExam({
            lecturer,
            startTime,
            examDuration,
            course,
            department,
            questions
        });
        console.log(newExam)
        await newExam.save();
        res.status(201).json({ message: 'CBT exam created successfully', exam: newExam });
    } catch (error) {
        res.status(500).json({ message: 'Error creating CBT exam', error: error.message });
    }
});

// Get available exams for a student
app.get('/api/student/available-exams', async (req, res) => {
    console.log("in available course")
    try {
        const student = await Student.findById(req.session.student._id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
        const availableExams = await CBTExam.find({
            course: { $in: student.courses },
            startTime: { $lte: twoHoursFromNow }
        }).select('-questions.answer');
        console.log('available exam::', availableExams)
        // Current date and time
        const noww = new Date();

        // Helper function to calculate the exam end time
        const addDurationToStartTime = (startTime, duration) => {
            const [hours, minutes] = duration.split(':').map(Number);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + hours);
            endTime.setMinutes(endTime.getMinutes() + minutes);
            return endTime;
        };

        // Function to filter exams
        const filteredExams = availableExams.filter(exam => {
            const examEndTime = addDurationToStartTime(exam.startTime, exam.examDuration);
            const hoursSinceEnd = (now - examEndTime) / (1000 * 60 * 60); // Difference in hours

            // Show if it's a future exam or if it's within the past 24 hours
            return noww < examEndTime || hoursSinceEnd <= 24;
        });

        console.log(filteredExams);

        res.status(200).json(filteredExams);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving available exams', error: error.message });
    }
});

// Get exam details (when student starts the exam)
app.get('/api/student/exam/:examId', async (req, res) => {
    console.log('in exam router')
    try {
        const exam = await CBTExam.findById(req.params.examId).select('-questions.answer');
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const now = new Date(); // Get the current date and time
        const examStartTime = new Date(exam.startTime); // Ensure exam.startTime is a Date object

        // Calculate the end time (start time + 2 hours)
        const examEndTime = new Date(examStartTime);
        examEndTime.setHours(examEndTime.getHours() + 2); // Add 2 hours to the exam start time

        // Check if the current time is within the allowed time frame

        if (now < examStartTime) {
            return res.status(403).json({ message: `cannot start exam now, exam start at ${examStartTime}` })
        }
        else if (now > examEndTime) {
            return res.status(403).json({ message: `The exam is no longer available.` })
        }
        res.status(200).json({
            _id: exam._id,
            course: exam.course,
            department: exam.department,
            startTime: exam.startTime,
            examDuration: exam.examDuration,
            questions: exam.questions.map(q => ({
                question: q.question,
                options: q.options
            }))
        })
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving exam details', error: error.message });
    }
});

// Submit exam answers
app.post('/api/student/submit-exam', async (req, res) => {
    try {
        const { examId, answers } = req.body;
        const studentId = req.session.student._id
        const exam = await CBTExam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        let score = 0;
        const gradedAnswers = exam.questions.map((question, index) => {
            const isCorrect = question.answer === answers[index];
            if (isCorrect) score++;
            return {
                question: question.question,
                studentAnswer: answers[index],
                correctAnswer: question.answer,
                isCorrect
            };
        });

        const examResult = new ExamResult({
            student: studentId,
            exam: examId,
            score,
            totalQuestions: exam.questions.length,
            answers: gradedAnswers
        });

        await examResult.save();

        res.status(201).json({
            message: 'Exam submitted successfully',
            score,
            totalQuestions: exam.questions.length,
            answers: gradedAnswers
        });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting exam', error: error.message });
    }
});

app.get('/api/lecturer/exam-results/', async (req, res) => {
    try {
        const lecturerId = req.session.lecturer._id;

        // Find all exams created by this lecturer
        const exams = await CBTExam.find({ lecturer: req.session.lecturer.fullName });
        const examIds = exams.map(exam => exam._id);

        // Find all results for these exams
        const results = await ExamResult.find({ exam: { $in: examIds } })
            .populate('student', 'fullName department')
            .populate('exam', 'course startTime examDuration');


        // Format the results
        const formattedResults = await Promise.all(results.map(async result => {
            const exam = await CBTExam.findById(result.exam._id);
            //const startTime = new Date(exam.startTime)
            const options = {
                year: 'numeric',
                month: 'long', // Use 'numeric' for month as a number (1-12)
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true // Use 12-hour clock (AM/PM)
            };
            const formattedDate = exam.startTime.toLocaleString('en-US', options);
            console.log(formattedDate)
            return {
                studentName: result.student.fullName,
                department: result.student.department,
                course: result.exam.course,
                score: result.score,
                totalQuestions: exam.questions.length,
                startTime: formattedDate,
                examDuration: exam.examDuration
            };
        }));
        console.log("formatted Result", formattedResults)
        res.status(200).json(formattedResults);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error retrieving exam results', error: error.message });
    }
});

app.get('/api/lecturer-attendance/', async (req, res) => {
    try {
        const lecturer = req.session.lecturer.fullName

        // Find all courses taught by the lecturer
        const courses = await Course.find({ lecturer: lecturer });

        // Get course names
        const courseNames = courses.map(course => course.courses);

        // Find attendance documents for these courses
        const attendanceDocuments = await Attendance.find({ course: { $in: courseNames } });
        console.log(attendanceDocuments)
        // Format the response to include all required information
        const formattedAttendance = attendanceDocuments.map(doc => ({
            course: doc.course,
            department: doc.department,
            startTime: doc.startTime,
            numberOfAttendees: doc.students.length,
            students: doc.students
        }));

        res.json(formattedAttendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Error fetching attendance data' });
    }
});

async function startServer() {
    const PORT = process.env.PORT || 3000;

    server.listen(PORT, async () => {
        console.log(`Server is running on port ${PORT}`);

        // Start ngrok and retrieve the URL
        try {
            // const url = await ngrok.connect(PORT);
            // console.log(`ngrok URL: ${url}`);

        } catch (error) {
            console.error('Error starting ngrok:', error);
        }
    });
}

// Start the server
startServer();
