import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export type DBId = string | number;

export interface DBPasskey {
    userId: number;
    name: string;
    lastUsed: number;

    webAuthnUserID: string; // from step 1
    id: string; // from step 2
    publicKey: string; // from step 2
    counter: number; // from step 2
    transports: AuthenticatorTransportFuture[]; // from step 2
    deviceType: string; // from step 2
    backedUp: boolean; // from step 2
}

export interface PublicPasskey {
    id: string;
    name: string;
    lastUsed: string;
    transports: string[];
}

export interface DBUser {
    id: number;
    username: string;
    password: string;
    sessions: string[];
    passkeyIds: string[];
    connectedIds: string[];
}

export interface PublicUser {
    id: number;
    username: string;
}

export interface DBApp {
    id: string;
    name: string;
    url: string;
    secret: string;
    redirectURIs: string[];
    ownerId: number;
}

export interface PublicApp {
    id: string;
    name: string;
    url: string;
}