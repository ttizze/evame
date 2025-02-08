"use client";

import type { SanitizedUser } from "@/app/types";
import { type PropsWithChildren, createContext, useContext } from "react";

interface UserContextType {
	currentUser: SanitizedUser | undefined;
}

export const UserContext = createContext<UserContextType>({
	currentUser: undefined,
});

interface UserProviderProps extends PropsWithChildren {
	currentUser: SanitizedUser | undefined;
}

export function UserProvider({ children, currentUser }: UserProviderProps) {
	return (
		<UserContext.Provider value={{ currentUser }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	return useContext(UserContext);
}
