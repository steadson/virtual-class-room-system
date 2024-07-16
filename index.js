const express = require('express');
const http = require('http');
const mongoose= require('mongoose')
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser')
const app = express();
const db = require('./model/db');
const Admin = require('./model/admin.js')
const Student = require('./model/Student.js'); // Adjust according to your model file structure
const Course = require('./model/Course');
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer');
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

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'asiyemiea01@gmail.com',
          pass: 'vrukzdhgugjkoxca'
        }
      });

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
app.get('/admin/login',async(req,res)=>{
    res.render('admin-login')
})
app.post('/admin/login', async (req, res) => {
   const {email, password} = req.body;
   console.log(req.body)
   try{
    const admin = await Admin.findOne({email})
    
    // If no lecturer found with that email
    if (!admin) {
        console.log('match not found');
        return res.status(401).json({ error: 'Invalid email or password' });
  
    }
    console.log('found match')
     // Compare the provided password with the stored hashed password
     const isPasswordValid = await bcrypt.compare(password, admin.password);

     if (!isPasswordValid) {
         return res.status(401).json({error: 'Invalid email or password' });
     }
     req.session.admin =admin;
     res.json({success:true})
   }catch(err){
    console.log(err)
    res.status(500).json({error:'Error logging'});
   }
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
app.get('/lecturer/login', (req, res) => {
    res.render('lecturer-login');
});
app.post('/lecturer/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(email, password)
    try {
        const lecturer = await db.findOne({ email});
        if (lecturer) {
            // Compare the provided password with the stored hashed password
     const isPasswordValid =  bcrypt.compare(password, lecturer.password);

     if (!isPasswordValid) {
         return res.status(401).json({error: 'Invalid email or password' });
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
    
    const { fullName, email, password, matricNumber, gender} = req.body;
   
    try {
        // Create a new admin object with the submitted data
        const student = new Student({
            fullName,
         matricNumber,
            gender,
            email,
            password
        });
        console.log( fullName, matricNumber,gender, email, password )
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
    
    const { fullName, sex,email, password } = req.body;
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
            password:hashedPassword
        });
        console.log( fullName, sex, email, password )
        // Save the admin data to MongoDB
        await admin.save();
console.log('admin saved')
        // Redirect to login page after successful sign-up
        res.status(201).json({message:'signed new Admin successfully'})
    } catch (err) {
        console.log(err)
        res.status(500).json({error:'Error signing up admin'});
    }
});
app.get('/admin/admin-signup', (req,res)=>{
    res.render('admin-signup');
})
app.get('/student/student-dashboard', (req, res)=>{
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
app.get('/lecturer/lecturer-dashboard', (req, res)=>{
    if(req.session && req.session.lecturer){
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
app.get('/api/lecturers', async (req, res) => {
    try {
        const lecturers = await db.find();
        console.log('lecturer',lecturers)
        res.json({lecturers:lecturers});
    } catch (err) {
        res.status(500).send('Error fetching lecturer');
    }
});

app.post('/api/register-student', async (req, res) => {
    const { studentId, faculty, department, degreeLevel, courses } = req.body;

    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
        // Update Student
        const student = await Student.findByIdAndUpdate(
            studentId,
            { 
                faculty, 
                department, 
                degreeLevel, 
                $addToSet: { courses: { $each: courses } }
            },
            { new: true}
        );

        if (!student) {
            throw new Error('Student not found');
        }

        // Update Courses
        for (const course of courses) {
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
                { upsert: true}
            );
        }

        // await session.commitTransaction();
        res.json({ success: true, message: 'Student registered successfully' });
    } catch (error) {
        // await session.abortTransaction();
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Error registering student' });
    } finally {
        // session.endSession();
    }
});

app.post('/api/assign-course-to-lecturer', async(req, res)=>{
    console.log('Received lecturer info', req.body);
    const { name2, faculty2, department2, degreeLevel2, course2, courseCode2 } = req.body;
    try {
        const Lectuerer= await db.findOne({ fullName: name2});
        if (!Lectuerer) {
            return res.status(404).json({ success: false, message: 'lecturer not found' });
        }
            const courseData = await Course.findOne({
                courses: course2, department:department2
            })

            if (courseData) {
                 // Update existing course
                 courseData.lecturer = name2
                 courseData.faculty =faculty2
                 courseData.courseCode = courseCode2
                // courseData.courses = course2
            }  else {
                const newCourse = new Course({
                    
                    courses:course2,
                    department:department2,
                    lecturer:name2,
                    faculty:faculty2,
                    courseCode:courseCode2 
                });
                await newCourse.save();
            }
            res.json({ success: true, message: 'lecturer assigning successfully' });
        }
     catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error assigning lecturer' });
    }
})
app.get('/api/getFullLecturerDetails', async(req,res)=>{
    const {id} = req.query
    console.log(req.query)
    try{
        const lecturer = await db.findOne({_id:id})
        if(!lecturer){
            return res.status(404).json({error:'lecturer not found'})
        }
        console.log(lecturer)
        const {fullName, sex, email}= lecturer
        const personalInfo ={name:fullName, sex:sex, email:email}
        const Courses = await Course.find({lecturer:fullName})
        const courseList = []
        if(Courses){
            console.log(Courses)
            Courses.forEach(course => {
                // Ensure courseCode and other fields are defined or assign a default value
                const courseCode = course.courseCode || 'null';
                const department = course.department || 'null';
                const faculty = course.faculty || 'null';
                const students =course.students.length || '0'
                const coursez = course.courses || 'null'
                courseList.push({
                    coursez, courseCode, department, faculty, students
                })
               
            });
        }
        return res.status(200).json({list:courseList, personalInfo:personalInfo})
    }catch(err){
        console.log('error occured', err)
        return res.status(400).json({eror:'an error occured'})
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
    const { classLink, startTime, courseId, courseTitle } = req.body;
    
    if (!req.session || !req.session.lecturer) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        // Find students enrolled in the specific course
        const students = await Student.find({ courses: courseTitle });

        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'No students found for this course' });
        }

        const startDateTime = new Date(startTime);

        // Update each student's document with the new virtual class information
        const updatePromises = students.map(async (student) => {
            await Student.findByIdAndUpdate(
                student._id,
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
             // Send email to student
             if (student.email) {
            console.log('send email to ', student.email)
                const mailOptions = {
                    from: 'asiyemiea01@gmail.com',
                    to: student.email,
                    subject: `Virtual Class Link for ${courseTitle}`,
                    text: `Dear ${student.fullName},\n\nYour virtual class for ${courseTitle} is scheduled for ${startDateTime}.\n\nJoin using this link: ${classLink}\n\nBest regards,\nUniversity of Calabar`
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
