// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('mooodle');

// Create collections with validation schemas
print('Creating collections with validation schemas...');

// Users collection with validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['email', 'password', 'firstName', 'lastName', 'birthdate'],
            properties: {
                email: {
                    bsonType: 'string',
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    description: 'must be a valid email address'
                },
                password: {
                    bsonType: 'string',
                    minLength: 6,
                    description: 'must be at least 6 characters long'
                },
                firstName: {
                    bsonType: 'string',
                    maxLength: 50,
                    description: 'must be less than 50 characters'
                },
                lastName: {
                    bsonType: 'string',
                    maxLength: 50,
                    description: 'must be less than 50 characters'
                },
                birthdate: {
                    bsonType: 'date',
                    description: 'must be a valid date'
                },
                roles: {
                    bsonType: 'array',
                    items: {
                        enum: ['student', 'teacher', 'admin']
                    },
                    minItems: 1,
                    description: 'must contain at least one valid role'
                },
                department: {
                    enum: ['COMMON_CORE', 'COMPUTER_SCIENCE', 'ENERGY', 'EDIM', 'IMSI', 'GMC'],
                    description: 'must be a valid department'
                },
                isActive: {
                    bsonType: 'bool',
                    description: 'must be a boolean'
                },
                isEmailVerified: {
                    bsonType: 'bool',
                    description: 'must be a boolean'
                },
                isPhoneVerified: {
                    bsonType: 'bool',
                    description: 'must be a boolean'
                }
            }
        }
    }
});

// CourseUnits collection with validation
db.createCollection('courseunits', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['slug', 'capacity', 'name', 'code', 'type'],
            properties: {
                slug: {
                    bsonType: 'string',
                    description: 'must be a unique string'
                },
                capacity: {
                    bsonType: 'int',
                    minimum: 1,
                    description: 'must be a positive integer'
                },
                name: {
                    bsonType: 'string',
                    maxLength: 50,
                    description: 'must be less than 50 characters'
                },
                code: {
                    bsonType: 'string',
                    pattern: '^[A-Z\\d]{2,5}$',
                    minLength: 4,
                    maxLength: 9,
                    description: 'must be 2-5 uppercase letters or digits'
                },
                type: {
                    enum: ['CS', 'TM', 'EC', 'QC', 'OM'],
                    description: 'must be a valid course type'
                }
            }
        }
    }
});

// CourseGroups collection with validation
db.createCollection('coursegroups', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['slug', 'name', 'kind', 'day', 'from', 'to', 'semester', 'courseUnit'],
            properties: {
                slug: {
                    bsonType: 'string',
                    description: 'must be a unique string'
                },
                name: {
                    bsonType: 'string',
                    maxLength: 100,
                    description: 'must be less than 100 characters'
                },
                kind: {
                    enum: ['theoretical', 'practical', 'laboratory', 'other'],
                    description: 'must be a valid group kind'
                },
                day: {
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    description: 'must be a valid day'
                },
                from: {
                    bsonType: 'string',
                    pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
                    description: 'must be valid time format HH:mm'
                },
                to: {
                    bsonType: 'string',
                    pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
                    description: 'must be valid time format HH:mm'
                },
                semester: {
                    bsonType: 'int',
                    enum: [1, 2],
                    description: 'must be 1 or 2'
                }
            }
        }
    }
});

// CourseActivities collection with validation
db.createCollection('courseactivities', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['activityType', 'courseUnit'],
            properties: {
                activityType: {
                    enum: ['message', 'file', 'file-depository'],
                    description: 'must be a valid activity type'
                },
                isPinned: {
                    bsonType: 'bool',
                    description: 'must be a boolean'
                }
            }
        }
    }
});

// DepositedFiles collection with validation
db.createCollection('depositedfiles', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['activity', 'user', 'courseUnit', 'courseActivity', 'files'],
            properties: {
                files: {
                    bsonType: 'array',
                    minItems: 1,
                    description: 'must contain at least one file'
                }
            }
        }
    }
});

// BlacklistedTokens collection with validation
db.createCollection('blacklistedtokens', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['token', 'userId', 'expiresAt'],
            properties: {
                token: {
                    bsonType: 'string',
                    description: 'must be a string'
                },
                expiresAt: {
                    bsonType: 'date',
                    description: 'must be a valid date'
                }
            }
        }
    }
});

// Discussions collection with validation  
db.createCollection('discussions', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['title', 'author', 'messages'],
            properties: {
                title: {
                    bsonType: 'string',
                    description: 'must be a string'
                },
                messages: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        required: ['author', 'content', 'createdAt'],
                        properties: {
                            content: {
                                bsonType: 'string',
                                description: 'must be a string'
                            },
                            createdAt: {
                                bsonType: 'date',
                                description: 'must be a valid date'
                            }
                        }
                    }
                }
            }
        }
    }
});

print('Collections created successfully!');

// Create indexes for better performance
print('Creating database indexes...');

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ roles: 1 });
db.users.createIndex({ department: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ memberOfGroups: 1 });

// CourseUnits indexes
db.courseunits.createIndex({ slug: 1 }, { unique: true });
db.courseunits.createIndex({ code: 1 }, { unique: true });
db.courseunits.createIndex({ type: 1 });
db.courseunits.createIndex({ groups: 1 });

// CourseGroups indexes
db.coursegroups.createIndex({ slug: 1 }, { unique: true });
db.coursegroups.createIndex({ courseUnit: 1 });
db.coursegroups.createIndex({ "users.user": 1 });
db.coursegroups.createIndex({ semester: 1 });
db.coursegroups.createIndex({ day: 1, from: 1 });

// CourseActivities indexes
db.courseactivities.createIndex({ courseUnit: 1 });
db.courseactivities.createIndex({ activityType: 1 });
db.courseactivities.createIndex({ isPinned: 1 });
db.courseactivities.createIndex({ restrictedGroups: 1 });
db.courseactivities.createIndex({ createdAt: -1 });
db.courseactivities.createIndex({ "completion.user": 1 });

// DepositedFiles indexes
db.depositedfiles.createIndex({ activity: 1, user: 1 }, { unique: true });
db.depositedfiles.createIndex({ user: 1 });
db.depositedfiles.createIndex({ courseUnit: 1 });
db.depositedfiles.createIndex({ createdAt: -1 });

// BlacklistedTokens indexes
db.blacklistedtokens.createIndex({ token: 1 }, { unique: true });
db.blacklistedtokens.createIndex({ userId: 1 });
db.blacklistedtokens.createIndex({ blacklistedAt: 1 });
db.blacklistedtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.blacklistedtokens.createIndex({ token: 1, expiresAt: 1 });

// Discussions indexes
db.discussions.createIndex({ author: 1 });
db.discussions.createIndex({ course: 1 });
db.discussions.createIndex({ createdAt: -1 });
db.discussions.createIndex({ "messages.author": 1 });

print('Indexes created successfully!');

// Insert fake data
print('Inserting fake data...');

// Current academic year
const currentYear = '2024-2025';
const currentDate = new Date();

// Generate ObjectIds for users
const adminId = new ObjectId();
const teacherIds = [
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId()
];

const studentIds = [];
for (let i = 0; i < 45; i++) {
    studentIds.push(new ObjectId());
}

// Insert Users
print('Inserting users...');

// Insert admin user
db.users.insertOne({
    _id: adminId,
    email: 'admin@example.com',
    password: '$2a$12$9xKM5MwMOBZ6a.XaNxV1wuHpfuTMkQB7smgRIFURRw3.SQQtpyTuG', // password: admin123
    birthdate: new Date('1985-05-15'),
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin'],
    department: 'COMPUTER_SCIENCE',
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: false,
    memberOfGroups: [],
    createdAt: currentDate,
    updatedAt: currentDate
});

// Insert teachers
const teacherData = [
    { firstName: 'Marie', lastName: 'Dupont', email: 'marie.dupont@example.com', department: 'COMPUTER_SCIENCE', birthdate: '1978-03-22' },
    { firstName: 'Jean', lastName: 'Martin', email: 'jean.martin@example.com', department: 'ENERGY', birthdate: '1982-07-10' },
    { firstName: 'Sophie', lastName: 'Bernard', email: 'sophie.bernard@example.com', department: 'EDIM', birthdate: '1980-11-05' },
    { firstName: 'Pierre', lastName: 'Dubois', email: 'pierre.dubois@example.com', department: 'IMSI', birthdate: '1975-01-30' },
    { firstName: 'Claire', lastName: 'Moreau', email: 'claire.moreau@example.com', department: 'GMC', birthdate: '1983-09-18' }
];

teacherData.forEach((teacher, index) => {
    db.users.insertOne({
        _id: teacherIds[index],
        email: teacher.email,
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiSXKlQyDvAG', // password: admin123
        birthdate: new Date(teacher.birthdate),
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        roles: ['teacher'],
        department: teacher.department,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: false,
        memberOfGroups: [],
        createdAt: currentDate,
        updatedAt: currentDate
    });
});

// Insert students
const departments = ['COMMON_CORE', 'COMPUTER_SCIENCE', 'ENERGY', 'EDIM', 'IMSI', 'GMC'];
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia'];
const lastNames = ['Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Garcia', 'Harris', 'Johnson', 'King', 'Lewis', 'Miller', 'Nelson', 'Parker', 'Quinn'];

studentIds.forEach((studentId, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const department = departments[index % departments.length];
    
    db.users.insertOne({
        _id: studentId,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@student.example.com`,
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiSXKlQyDvAG', // password: admin123
        birthdate: new Date(2000 + (index % 5), (index % 12) + 1, (index % 28) + 1),
        firstName: firstName,
        lastName: lastName + (Math.floor(index / firstNames.length) + 1),
        roles: ['student'],
        department: department,
        isActive: true,
        isEmailVerified: index % 3 === 0,
        isPhoneVerified: index % 5 === 0,
        memberOfGroups: [],
        createdAt: new Date(currentDate.getTime() - (index * 86400000)), // Spread over time
        updatedAt: new Date(currentDate.getTime() - (index * 86400000))
    });
});

print(`${50} users inserted successfully!`);

// Generate ObjectIds for course units
const courseUnitIds = [];
for (let i = 0; i < 12; i++) {
    courseUnitIds.push(new ObjectId());
}

// Insert Course Units
print('Inserting course units...');

const courseUnitsData = [
    { slug: 'web-engineering-4b', name: 'Web Engineering 4B', code: 'WE4B', type: 'CS', capacity: 30 },
    { slug: 'database-systems', name: 'Database Systems', code: 'DBS3', type: 'CS', capacity: 35 },
    { slug: 'software-engineering', name: 'Software Engineering', code: 'SE2A', type: 'CS', capacity: 40 },
    { slug: 'network-security', name: 'Network Security', code: 'NS5B', type: 'CS', capacity: 25 },
    { slug: 'renewable-energy', name: 'Renewable Energy Systems', code: 'RE3A', type: 'TM', capacity: 30 },
    { slug: 'thermodynamics', name: 'Applied Thermodynamics', code: 'TDY2', type: 'TM', capacity: 35 },
    { slug: 'project-management', name: 'Project Management', code: 'PM4A', type: 'EC', capacity: 50 },
    { slug: 'business-ethics', name: 'Business Ethics', code: 'BE2B', type: 'EC', capacity: 60 },
    { slug: 'quality-control', name: 'Quality Control Methods', code: 'QC3B', type: 'QC', capacity: 20 },
    { slug: 'statistical-analysis', name: 'Statistical Analysis', code: 'SA4A', type: 'QC', capacity: 25 },
    { slug: 'operations-research', name: 'Operations Research', code: 'OR5A', type: 'OM', capacity: 30 },
    { slug: 'supply-chain', name: 'Supply Chain Management', code: 'SCM3', type: 'OM', capacity: 35 }
];

courseUnitsData.forEach((course, index) => {
    const activities = [];
    
    // Add 2-4 activity categories per course
    const numCategories = 2 + (index % 3);
    const categoryNames = ['Lectures', 'Tutorials', 'Projects', 'Assessments', 'Resources'];
    
    for (let i = 0; i < numCategories; i++) {
        activities.push({
            _id: new ObjectId(),
            name: categoryNames[i],
            description: `${categoryNames[i]} for ${course.name}`,
            activities: []
        });
    }
    
    db.courseunits.insertOne({
        _id: courseUnitIds[index],
        slug: course.slug,
        capacity: course.capacity,
        name: course.name,
        code: course.code,
        type: course.type,
        activities: activities,
        groups: [],
        createdAt: currentDate,
        updatedAt: currentDate
    });
});

print(`${courseUnitsData.length} course units inserted successfully!`);

// Calculate total number of groups needed
let totalGroups = 0;
courseUnitIds.forEach((courseUnitId, courseIndex) => {
    totalGroups += 2 + (courseIndex % 3); // 2-4 groups per course
});

// Generate ObjectIds for course groups
const courseGroupIds = [];
for (let i = 0; i < totalGroups; i++) {
    courseGroupIds.push(new ObjectId());
}

// Insert Course Groups
print('Inserting course groups...');

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const groupKinds = ['theoretical', 'practical', 'laboratory'];
const times = [
    { from: '08:00', to: '10:00' },
    { from: '10:15', to: '12:15' },
    { from: '13:30', to: '15:30' },
    { from: '15:45', to: '17:45' }
];

let groupIndex = 0;
courseUnitIds.forEach((courseUnitId, courseIndex) => {
    const numGroups = 2 + (courseIndex % 3); // 2-4 groups per course
    
    for (let i = 0; i < numGroups; i++) {
        const day = days[groupIndex % days.length];
        const time = times[groupIndex % times.length];
        const kind = groupKinds[i % groupKinds.length];
        const semester = (groupIndex % 2) + 1;
        
        // Assign students to groups (5-8 students per group)
        const numStudentsInGroup = 5 + (groupIndex % 4);
        const groupStudents = [];
        const availableStudents = studentIds.slice(groupIndex * 3, (groupIndex * 3) + numStudentsInGroup);
        
        availableStudents.forEach(studentId => {
            groupStudents.push({
                user: studentId,
                role: 'student',
                semester: semester,
                year: currentYear
            });
        });
        
        // Assign a teacher to the group
        const teacherId = teacherIds[courseIndex % teacherIds.length];
        groupStudents.push({
            user: teacherId,
            role: 'teacher',
            semester: semester,
            year: currentYear
        });
        
        db.coursegroups.insertOne({
            _id: courseGroupIds[groupIndex],
            slug: `${courseUnitsData[courseIndex].slug}-group-${i + 1}`,
            name: `${courseUnitsData[courseIndex].name} - Group ${i + 1}`,
            kind: kind,
            day: day,
            from: time.from,
            to: time.to,
            semester: semester,
            courseUnit: courseUnitId,
            users: groupStudents,
            createdAt: currentDate,
            updatedAt: currentDate
        });
        
        groupIndex++;
    }
});

print(`${groupIndex} course groups inserted successfully!`);

// Update course units with group references
courseUnitIds.forEach((courseUnitId, courseIndex) => {
    const relatedGroups = db.coursegroups.find({ courseUnit: courseUnitId }).toArray();
    const groupIds = relatedGroups.map(group => group._id);
    
    db.courseunits.updateOne(
        { _id: courseUnitId },
        { $set: { groups: groupIds } }
    );
});

// Update users with group memberships
db.coursegroups.find({}).forEach(group => {
    group.users.forEach(userInGroup => {
        if (userInGroup.role === 'student') {
            db.users.updateOne(
                { _id: userInGroup.user },
                { $addToSet: { memberOfGroups: group._id } }
            );
        }
    });
});

print('Course units and users updated with group references!');

// Insert Course Activities (Messages only)
print('Inserting course activities...');

const messageLevels = ['normal', 'important', 'urgent'];
const activityTitles = [
    'Welcome to the Course',
    'Assignment Instructions',
    'Exam Schedule Update',
    'Important Announcement',
    'Class Cancellation Notice',
    'Additional Resources Available',
    'Project Guidelines',
    'Lab Safety Instructions',
    'Deadline Reminder',
    'Course Feedback Request'
];

const activityContents = [
    'Welcome to this course! Please review the syllabus and course materials.',
    'The assignment instructions have been updated. Please check the new requirements.',
    'The exam schedule has been modified. Please note the new dates and times.',
    'This is an important announcement regarding the upcoming project.',
    'Due to unforeseen circumstances, today\'s class has been cancelled.',
    'Additional learning resources are now available in the course materials section.',
    'Please review the project guidelines carefully before starting your work.',
    'Important safety instructions for laboratory sessions. Please read carefully.',
    'Reminder: Assignment deadline is approaching. Please submit your work on time.',
    'We would appreciate your feedback on the course content and delivery.'
];

let activityIndex = 0;
courseUnitIds.forEach(courseUnitId => {
    const numActivities = 3 + (activityIndex % 5); // 3-7 activities per course
    
    for (let i = 0; i < numActivities; i++) {
        const isPinned = (activityIndex % 8) === 0; // Some activities are pinned
        const level = messageLevels[activityIndex % messageLevels.length];
        const title = activityTitles[activityIndex % activityTitles.length];
        const content = activityContents[activityIndex % activityContents.length];
        
        // Some activities are restricted to specific groups
        let restrictedGroups = null;
        if ((activityIndex % 5) === 0) {
            const courseGroups = db.coursegroups.find({ courseUnit: courseUnitId }).toArray();
            if (courseGroups.length > 1) {
                restrictedGroups = [courseGroups[0]._id];
            }
        }
        
        // Add some completion data
        const completion = [];
        if ((activityIndex % 3) === 0) {
            // Add random student completions
            const courseGroups = db.coursegroups.find({ courseUnit: courseUnitId }).toArray();
            courseGroups.forEach(group => {
                group.users.forEach(userInGroup => {
                    if (userInGroup.role === 'student' && Math.random() > 0.6) {
                        completion.push({
                            user: userInGroup.user,
                            completedAt: new Date(currentDate.getTime() - Math.random() * 30 * 86400000)
                        });
                    }
                });
            });
        }
        
        const activity = {
            activityType: 'message',
            courseUnit: courseUnitId,
            isPinned: isPinned,
            completion: completion,
            title: title,
            content: content,
            level: level,
            createdAt: new Date(currentDate.getTime() - (activityIndex * 86400000)),
            updatedAt: new Date(currentDate.getTime() - (activityIndex * 86400000))
        };
        
        if (restrictedGroups) {
            activity.restrictedGroups = restrictedGroups;
        }
        
        db.courseactivities.insertOne(activity);
        
        activityIndex++;
    }
});

print(`${activityIndex} course activities inserted successfully!`);

// Insert Discussions
print('Inserting discussions...');

const discussionTopics = [
    'General Course Discussion',
    'Assignment Help',
    'Exam Preparation',
    'Project Collaboration',
    'Technical Questions',
    'Study Group Formation',
    'Course Feedback',
    'Lab Session Questions'
];

const messageContents = [
    'Hello everyone! Looking forward to this course.',
    'Can someone help me with the first assignment?',
    'When is the next exam scheduled?',
    'Anyone interested in forming a study group?',
    'I have a question about the lecture material.',
    'Great explanation in today\'s class!',
    'The assignment deadline should be extended.',
    'Where can I find the lab manual?',
    'Thanks for the help with the project!',
    'This topic is quite challenging, any tips?'
];

courseUnitIds.forEach((courseUnitId, courseIndex) => {
    const numDiscussions = 2 + (courseIndex % 4); // 2-5 discussions per course
    
    for (let i = 0; i < numDiscussions; i++) {
        const title = discussionTopics[i % discussionTopics.length];
        const authorId = (i % 2 === 0) ? teacherIds[courseIndex % teacherIds.length] : studentIds[courseIndex * 3 + i];
        
        // Create messages for the discussion
        const messages = [];
        const numMessages = 2 + (i % 6); // 2-7 messages per discussion
        
        for (let j = 0; j < numMessages; j++) {
            const messageAuthorId = (j === 0) ? authorId : 
                (j % 2 === 0) ? teacherIds[(courseIndex + j) % teacherIds.length] : 
                studentIds[(courseIndex * 3 + i + j) % studentIds.length];
            
            messages.push({
                author: messageAuthorId,
                content: messageContents[j % messageContents.length],
                createdAt: new Date(currentDate.getTime() - ((numMessages - j) * 3600000)) // Messages spread over hours
            });
        }
        
        db.discussions.insertOne({
            title: title,
            author: authorId,
            course: courseUnitId,
            messages: messages,
            createdAt: new Date(currentDate.getTime() - (i * 86400000)),
            updatedAt: new Date(currentDate.getTime() - (i * 3600000))
        });
    }
});

print('Discussions inserted successfully!');

print('=== MongoDB initialization completed successfully! ===');
print('');
print('Summary of inserted data:');
print('- 1 Admin user');
print('- 5 Teacher users');
print('- 45 Student users');
print(`- ${courseUnitsData.length} Course units`);
print(`- ${groupIndex} Course groups`);
print(`- ${activityIndex} Course activities (messages only)`);
print('- Multiple discussions with nested messages');
print('');
print('Default admin user: admin@example.com / admin123');
print('All other users also use password: admin123');
print('');
print('Note: File-related activities and deposited files are not included');
print('as they require actual file uploads which are not available during initialization.');