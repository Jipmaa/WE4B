import { User } from './user';

export class Student extends User {

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
        public department: string,
        public id_student: number
    ) {
        super(id, firstName, lastName, birthdate, email, phoneNumber, password, roles, type, avatar);
        this.department = department;
        this.id_student = id_student;
    }

}