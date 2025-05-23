export class Ue {
    constructor(
        public id : number,
        public capacity : number,
        public name :  string,
        public type  : string,
        public code :  string,
        public img_path : string
    ) {
        this.id = id
        this.capacity = capacity
        this.name = name
        this.type = type
        this.code = code
        this.img_path = img_path
    }
}