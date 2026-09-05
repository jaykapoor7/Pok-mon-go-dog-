"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LogOut, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { myProfile, type Profile } from "@/lib/programme";
import { readVolunteer, clearVolunteer, type VolunteerSession } from "@/lib/volunteer";
import { ROLE_META, type Role } from "@/lib/roles";

/* ════════════════════════════════════════════════════════════════════
   Who you are, at the foot of the console's side nav.

   Three states, because StrayPaw has three kinds of person and they
   arrive by different doors:

     signed in with a code   their name, their organisation, a way to add
                             people, and a way to leave
     reporting for an org    the volunteer who typed a code on this phone
                             but has no account and needs none
     nobody yet              a way in, and the code box for someone
                             holding six characters

   It replaces a line that said "Network, Pan-India", which was true and
   told nobody anything they could act on.
   ════════════════════════════════════════════════════════════════════ */

export function ProfilePanel({
  role,
  onNavigate,
}: {
  role: Role | null;
  onNavigate?: () => void;
}) {
  const { user, isAuthed, signOut, openSignIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);

  useEffect(() => {
    setVolunteer(readVolunteer());
  }, []);

  useEffect(() => {
    let live = true;
    if (!isAuthed) {
      setProfile(null);
      return;
    }
    myProfile()
      .then((p) => live && setProfile(p))
      .catch(() => live && setProfile(null));
    return () => {
      live = false;
    };
  }, [isAuthed]);

  const displayName =
    profile?.name?.trim() || user?.name?.trim() || user?.email || "Your account";

  const resetRole = () => {
    try {
      window.localStorage.removeItem("straypaw.role");
      window.localStorage.removeItem("straypaw.tour.v1");
    } catch {
      /* nothing stored to clear */
    }
    window.location.reload();
  };

  if (isAuthed) {
    return (
      <div className="spa-profile">
        <div className="spa-profile-who">
          <span className="spa-profile-avatar" aria-hidden>
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="spa-profile-names">
            <b>{displayName}</b>
            <small>
              {profile?.org_name
                ? profile.org_name
                : user?.email ?? "No organisation yet"}
            </small>
          </span>
        </div>

        {profile?.org_name && (
          <span className="spa-profile-role">
            {profile.is_lead ? "Team lead" : "Team member"}
          </span>
        )}

        <div className="spa-profile-links">
          {profile?.org_name && (
            <Link href="/partner/team" onClick={onNavigate}>
              <Users size={13} /> Team and codes
            </Link>
          )}
          {!profile?.org_name && (
            <Link href="/join" onClick={onNavigate}>
              <KeyRound size={13} /> Enter an organisation code
            </Link>
          )}
          <button type="button" onClick={signOut}>
            <LogOut size={13} /> Sign out
          </button>
        </div>

        {role && (
          <button type="button" className="spa-role-chip" onClick={resetRole}>
            {ROLE_META[role].short}
          </button>
        )}
      </div>
    );
  }

  if (volunteer) {
    return (
      <div className="spa-profile">
        <div className="spa-profile-who">
          <span className="spa-profile-avatar" aria-hidden>
            {(volunteer.name || "V").slice(0, 1).toUpperCase()}
          </span>
          <span className="spa-profile-names">
            <b>{volunteer.name || "Volunteer"}</b>
            <small>Reporting for {volunteer.orgName}</small>
          </span>
        </div>
        <div className="spa-profile-links">
          <button
            type="button"
            onClick={() => {
              clearVolunteer();
              setVolunteer(null);
            }}
          >
            <LogOut size={13} /> Stop reporting for them
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spa-profile">
      <div className="spa-profile-links out">
        <button type="button" onClick={openSignIn}>
          Sign in
        </button>
        <Link href="/join" onClick={onNavigate}>
          <KeyRound size={13} /> I have a code
        </Link>
      </div>
      {role && (
        <button type="button" className="spa-role-chip" onClick={resetRole}>
          {ROLE_META[role].short}
        </button>
      )}
    </div>
  );
}
