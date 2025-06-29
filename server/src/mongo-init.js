// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('mooodle');

// Create collections with validation
// TODO

// Create indexes for better performance
// TODO

// Insert a default admin user for testing
db.users.insertOne({
    email: 'admin@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiSXKlQyDvAG', // password: admin123  // TODO: fix
    birthdate: new Date('1990-01-01'),
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin'],
    department: 'IT',  // TODO: fix
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');
print('Default admin user created: admin@example.com / admin123');