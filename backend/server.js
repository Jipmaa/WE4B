const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express(); // crée l'application express
app.use(cors()); // active cors pour permettre à angular d'accéder à l'API
app.use(express.json()); // active le parsing JSON pour lire les données envoyées par en json

//connecte le serveur node.js à la base de données MongoDB
//mongoose.connect('mongodb://localhost:27017/we4b_project', {
//}).then(() => console.log('MongoDB connecté'));
mongoose.connect('mongodb+srv://we4buser:we4bpassword@we4b-project.ra47djv.mongodb.net/we4b-project?retryWrites=true&w=majority&appName=we4b-project')
    .then(() => console.log('MongoDB connecté'))
    .catch(err => console.error('Erreur de connexion MongoDB:', err));

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
    avatar: String,
    department: String // facultatif, sera undefined si non fourni
}, options);

const User = mongoose.model('User', userSchema);

// Ajouter un utilisateur
app.post('/users', async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.json(user);
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
        type: user.type,
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

app.listen(3000, () => console.log('Serveur backend sur http://localhost:3000'));