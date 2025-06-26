// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('mooodle');

// Create a user for the application
db.createUser({
    user: 'appuser',
    pwd: 'apppassword',
    roles: [
        {
            role: 'readWrite',
            db: 'mooodle'
        }
    ]
});

// Create collections with validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['email', 'password', 'birthdate', 'roles'],
            properties: {
                email: {
                    bsonType: 'string',
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    description: 'must be a valid email address and is required'
                },
                password: {
                    bsonType: 'string',
                    minLength: 6,
                    description: 'must be a string with at least 6 characters and is required'
                },
                birthdate: {
                    bsonType: 'date',
                    description: 'must be a date and is required'
                },
                firstName: {
                    bsonType: 'string',
                    maxLength: 50,
                    description: 'must be a string with max 50 characters'
                },
                lastName: {
                    bsonType: 'string',
                    maxLength: 50,
                    description: 'must be a string with max 50 characters'
                },
                department: {
                    bsonType: 'string',
                    maxLength: 100,
                    description: 'must be a string with max 100 characters'
                },
                roles: {
                    bsonType: 'array',
                    minItems: 1,
                    items: {
                        bsonType: 'string',
                        enum: ['student', 'teacher', 'admin']
                    },
                    description: 'must be an array with at least one role from: student, teacher, admin'
                },
                isActive: {
                    bsonType: 'bool',
                    description: 'must be a boolean'
                },
                isEmailVerified: {
                    bsonType: 'bool',
                    description: 'must be a boolean'
                }
            }
        }
    }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ roles: 1 });
db.users.createIndex({ department: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: -1 });

// Insert a default admin user for testing
db.users.insertOne({
    email: 'admin@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiSXKlQyDvAG', // password: admin123
    birthdate: new Date('1990-01-01'),
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin'],
    department: 'IT',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');
print('Default admin user created: admin@example.com / admin123');