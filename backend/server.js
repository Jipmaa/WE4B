const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express(); // crée l'application express
app.use(cors()); // active cors pour permettre à angular d'accéder à l'API
app.use(express.json()); // active le parsing JSON pour lire les données envoyées par en json

const multer = require('multer');
const path = require('path');

//Pour configurer le stockage des fichiers uploadés
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // dossier où seront stockés les fichiers
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // nom unique : date et heure + extension du fichier
    }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

//connecte le serveur node.js à la base de données MongoDB
//mongoose.connect('mongodb://localhost:27017/we4b_project', {
//}).then(() => console.log('MongoDB connecté'));
mongoose.connect('mongodb+srv://we4buser:we4bpassword@we4b-project.ra47djv.mongodb.net/we4b-project?retryWrites=true&w=majority&appName=we4b-project')
    .then(() => console.log('MongoDB connecté'))
    .catch(err => console.error('Erreur de connexion MongoDB:', err));

//définit un modèle User
const userSchema = new mongoose.Schema({
    id: Number,
    firstName: String,
    lastName: String,
    birthdate: String,
    email: String,
    phoneNumber: String,
    password: String,
    roles: [String], // Ceci est la bonne syntaxe Mongoose pour un tableau de chaînes de caractères
    avatar: String,
    department: String // facultatif, sera undefined si non fourni
});

const User = mongoose.model('User', userSchema);

//définit un modèle Ue
const ueSchema = new mongoose.Schema({
    id: Number,
    capacity: Number,
    name: String,
    code: String,
    img_path: String
});

const Ue = mongoose.model('Ue', ueSchema);

// AJOUTER UN UTILISATEUR
app.post('/users', upload.single('avatar'), async (req, res) => {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    try {
        const { firstName, lastName, birthdate, email, phoneNumber, password, department } = req.body;
        const roles = req.body['roles'] || [];
        const avatar = req.file ? '/uploads/' + req.file.filename : '';

        console.log('roles reçu:', roles, typeof roles);
        // Crée l'utilisateur avec l'avatar et les rôles
        const user = new User({
            firstName,
            lastName,
            birthdate,
            email,
            phoneNumber,
            password,
            roles: Array.isArray(roles) ? roles : [roles],
            department: req.body.department || '', // facultatif, peut être vide
            avatar
        });

        await user.save();
        res.status(201).json({ message: "Utilisateur créé avec succès.", user });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur lors de la création de l'utilisateur." });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Tentative de connexion:', email, password);
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
        avatar: user.avatar,
        department: user.department
    });
});

// crée une route get pour récupérer tous les utilisateurs
app.get('/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

// Mettre à jour un utilisateur
app.put('/users/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
});

// Supprimer un utilisateur
app.delete('/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé' });
});

// AJOUTER UNE UE
app.post('/ues', upload.single('img_path'), async (req, res) => {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    try {
        const { name, code, type, capacity} = req.body;
        const img_path = req.file ? '/uploads/' + req.file.filename : '';

        // Crée l'ue 
        const ue = new Ue({
            name,
            code,            
            type,
            capacity,
            img_path
        });

        await ue.save();
        res.status(201).json({ message: "Ue créé avec succès.", ue });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur lors de la création de l'ue." });
    }
});

// crée une route get pour récupérer toutes les ues
app.get('/ues', async (req, res) => {
    const ues = await Ue.find();
    res.json(ues);
});

// Mettre à jour une ue
app.put('/ues/:id', async (req, res) => {
    const ue = await Ue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ue);
});

// Supprimer une ue
app.delete('/ues/:id', async (req, res) => {
    await Ue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ue supprimée' });
});

app.listen(3000, () => console.log('Serveur backend sur http://localhost:3000'));