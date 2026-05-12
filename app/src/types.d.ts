declare global {
    interface Window {
        props: {
            instance: {
                allowPasskeys: boolean;
            }

            user: {
                id: number;
                username: string;
            }

            oauth: {
                error?: string;

                app?: {
                    id: string;
                    name: string;
                    url: string;
                    owner: string;
                };

                loginLink: string;
                redirectHost: string;
            }
        };
    }
}

export { }