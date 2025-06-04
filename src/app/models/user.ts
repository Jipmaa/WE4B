export class User {
    constructor(
        public id: number,
        public firstName: string,
        public lastName: string,
        public birthdate: Date,
        public email: string,
        public phoneNumber: string,
        public password: string,
        public roles: string[],
        public type: string,
        public avatar: string
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.birthdate = birthdate;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.password = password;
        this.roles = roles;
        this.type = type;
        this.avatar = avatar;
    }
}