import { User } from './user';

export class Teacher extends User {

    constructor(
        id: number,
        firstName: string,
        lastName: string,
        birthdate: Date,
        email: string,
        phoneNumber: string,
        password: string,
        roles: string[],
        type: string,
        avatar: string,
        public id_teacher: number
    ) {
        super(id, firstName, lastName, birthdate, email, phoneNumber, password, roles, type, avatar);
        this.id_teacher = id_teacher;
    }

}