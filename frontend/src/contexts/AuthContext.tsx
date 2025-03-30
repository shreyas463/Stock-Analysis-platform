'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase/firebase-setup';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface User {
  username: string;
  email: string;
  uid: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: userData.email || firebaseUser.email || '',
              username: userData.username || ''
            });
            setIsAuthenticated(true);
            
            // Generate a JWT token for backend API calls
            try {
              const idToken = await firebaseUser.getIdToken();
              localStorage.setItem('jwt_token', idToken);
            } catch (error) {
              console.error("Error getting ID token:", error);
            }
          } else {
            // If user document doesn't exist but auth does, create it
            if (firebaseUser.email) {
              const newUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                username: firebaseUser.email.split('@')[0],
                created_at: serverTimestamp(),
                balance: 10000 // Default starting balance
              };
              
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                username: newUser.username
              });
              setIsAuthenticated(true);
              
              // Generate a JWT token for backend API calls
              try {
                const idToken = await firebaseUser.getIdToken();
                localStorage.setItem('jwt_token', idToken);
              } catch (error) {
                console.error("Error getting ID token:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('jwt_token');
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('jwt_token');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log(`Attempting to register user: ${email}`);
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log(`User registered successfully with UID: ${firebaseUser.uid}`);
      
      // Create user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        username,
        email,
        created_at: serverTimestamp(),
        balance: 10000 // Default starting balance
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      console.log(`User document created in Firestore`);
      
      setUser({
        uid: firebaseUser.uid,
        email,
        username
      });
      setIsAuthenticated(true);
      
      // Generate a JWT token for backend API calls
      try {
        const idToken = await firebaseUser.getIdToken();
        localStorage.setItem('jwt_token', idToken);
      } catch (error) {
        console.error("Error getting ID token:", error);
      }
    } catch (error: any) {
      console.error("Registration error:", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log(`Attempting to log in user: ${email}`);
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log(`User logged in successfully with UID: ${firebaseUser.uid}`);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          uid: firebaseUser.uid,
          email: userData.email,
          username: userData.username
        });
      } else {
        // If user document doesn't exist, create it
        const username = email.split('@')[0];
        const userData = {
          uid: firebaseUser.uid,
          username,
          email,
          created_at: serverTimestamp(),
          balance: 10000 // Default starting balance
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        console.log(`User document created in Firestore during login`);
        
        setUser({
          uid: firebaseUser.uid,
          email,
          username
        });
      }
      
      setIsAuthenticated(true);
      
      // Generate a JWT token for backend API calls
      try {
        const idToken = await firebaseUser.getIdToken();
        localStorage.setItem('jwt_token', idToken);
        console.log("JWT token stored in localStorage");
      } catch (error) {
        console.error("Error getting ID token:", error);
      }
    } catch (error: any) {
      console.error("Login error:", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('jwt_token');
      console.log("User logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 