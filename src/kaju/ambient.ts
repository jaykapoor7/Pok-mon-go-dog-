"use client";

/* The visitor's choice to keep Kaju still. Stored on this device only. */
import { useEffect, useState } from "react";

const KEY = "kaju.ambient";
const EVT = "kaju-ambient";

export function useKajuAmbient(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const read = () => { try { setOn(localStorage.getItem(KEY) !== "off"); } catch { /* storage blocked */ } };
    read();
    window.addEventListener(EVT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(EVT, read); window.removeEventListener("storage", read); };
  }, []);
  const set = (v: boolean) => { try { localStorage.setItem(KEY, v ? "on" : "off"); } catch { /* fine */ } setOn(v); window.dispatchEvent(new Event(EVT)); };
  return [on, set];
}
