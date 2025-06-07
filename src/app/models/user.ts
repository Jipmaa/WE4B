export class User {
    constructor(
        public id: number,
        public firstName: string,
        public lastName: string,
        public birthdate: String,
        public email: string,
        public phoneNumber: string,
        public password: string,
        public roles: string[],
        public avatar?: string,
        public department?: string, // optionnel, seulement pour les students
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.birthdate = birthdate;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.password = password;
        this.roles = roles;
        this.avatar = avatar || ''; // définit une valeur par défaut si avatar n'est pas fourni
        this.department = department || ''; // définit une valeur par défaut si department n'est pas fourni
    }
}