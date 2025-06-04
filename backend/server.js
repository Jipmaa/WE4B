const express = require('express'); 
const mongoose = require('mongoose'); 
const cors = require('cors'); 

const app = express(); // crée l'application express
app.use(cors()); // active cors pour permettre à angular d'accéder à l'API
app.use(express.json()); // active le parsing JSON pour lire les données envoyées par en json

//connecte le serveur node.js à la base de données MongoDB
mongoose.connect('mongodb://localhost:27017/we4b_project', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'));

const options = { discriminatorKey: 'type' };

//définit un modèle User
const userSchema = new mongoose.Schema({
    id: Number,
    firstName: String,
    lastName: String,
    birthdate: Date,
    email: String,
    phoneNumber: String,
    password: String,
    roles: [String], // Ceci est la bonne syntaxe Mongoose pour un tableau de chaînes de caractères
    type: String,
    avatar: String
}, options);

const User = mongoose.model('User', userSchema);

const studentSchema = new mongoose.Schema({
    department: String,
    id_student: Number
});

const teacherSchema = new mongoose.Schema({
    id_teacher: Number
});

const Student = User.discriminator('Student', studentSchema);
const Teacher = User.discriminator('Teacher', teacherSchema);

// Ajouter un étudiant
app.post('/students', async (req, res) => {
    const student = new Student(req.body);
    await student.save();
    res.json(student);
});

// Ajouter un enseignant
app.post('/teachers', async (req, res) => {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.json(teacher);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // Cherche l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
    }
    // Vérifie le mot de passe (en clair ici, à sécuriser plus tard)
    if (user.password !== password) {
        return res.status(401).json({ message: "Mot de passe incorrect" });
    }
    // Connexion réussie : renvoie les infos utiles (évite de renvoyer le mot de passe)
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        birthdate: user.birthdate,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roles: user.roles,
        type: user.type,
        avatar: user.avatar
    });
});

// crée une route get pour récupérer tous les étudiants
app.get('/students', async (req, res) => {
    const students = await Student.find();
    res.json(students);
});

// Récupérer tous les enseignants
app.get('/teachers', async (req, res) => {
    const teachers = await Teacher.find();
    res.json(teachers);
});

// Mettre à jour un étudiant
app.put('/students/:id', async (req, res) => {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
});

// Supprimer un étudiant
app.delete('/students/:id', async (req, res) => {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Étudiant supprimé' });
});

app.listen(3000, () => console.log('Serveur backend sur http://localhost:3000'));