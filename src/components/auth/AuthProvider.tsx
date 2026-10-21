"use client";
import {createContext,useContext} from "react";
import {USER} from "../../../recording/store";
export interface AppUser{id:string;name:string;email:string|null}
const C=createContext({user:USER as AppUser,isAuthed:true,ready:true,signOut:()=>{},requireAuth:(f?:()=>void)=>{f?.();return true;},openSignIn:()=>{}});
export const useAuth=()=>useContext(C);
export function AuthProvider({children}:{children:React.ReactNode}){return <C.Provider value={{user:USER,isAuthed:true,ready:true,signOut:()=>{},requireAuth:(f)=>{f?.();return true;},openSignIn:()=>{}}}>{children}</C.Provider>;}
