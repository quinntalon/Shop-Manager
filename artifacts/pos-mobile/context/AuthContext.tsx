import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const DEFAULT_PIN = "1234";
const STORAGE_KEY_PIN = "@nexus_pos_pin";
const STORAGE_KEY_AUTHED = "@nexus_pos_authed";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_AUTHED).then((val) => {
      setIsAuthenticated(val === "true");
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    const storedPin = await AsyncStorage.getItem(STORAGE_KEY_PIN);
    const correctPin = storedPin ?? DEFAULT_PIN;
    if (pin === correctPin) {
      await AsyncStorage.setItem(STORAGE_KEY_AUTHED, "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY_AUTHED, "false");
    setIsAuthenticated(false);
  }, []);

  const changePin = useCallback(
    async (oldPin: string, newPin: string): Promise<boolean> => {
      const storedPin = await AsyncStorage.getItem(STORAGE_KEY_PIN);
      const correctPin = storedPin ?? DEFAULT_PIN;
      if (oldPin !== correctPin) return false;
      await AsyncStorage.setItem(STORAGE_KEY_PIN, newPin);
      return true;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, changePin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
