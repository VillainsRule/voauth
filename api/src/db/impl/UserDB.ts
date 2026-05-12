import LinkedDB from '../LinkedDB';

import { DBUser } from '../../../../types';

const linkedKeys = [
    { prop: 'username', type: 'string' },
    { prop: 'sessions', type: 'string' }
] as const;

export class UserDB extends LinkedDB<DBUser, typeof linkedKeys> {
    constructor() {
        super('users.db', linkedKeys);
    }
}

const userDB = new UserDB();
export default userDB;