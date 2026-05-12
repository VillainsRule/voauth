import LinkedDB from '../LinkedDB';

import { DBApp } from '../../../../types';

const linkedKeys = [
    { prop: 'ownerId', type: 'array' }
] as const;

export class AppDB extends LinkedDB<DBApp, typeof linkedKeys> {
    constructor() {
        super('app.db', linkedKeys);
    }
}

const appDB = new AppDB();
export default appDB;