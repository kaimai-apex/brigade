"use client";

import { useEffect, useState } from "react";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { isMuted, playCue, setMuted } from "@/lib/onboarding/sound";

/**
 * The mute switch, in the header of every onboarding screen.
 *
 * Sound is on by default, which is only defensible if turning it off takes one
 * tap and that tap is somewhere obvious. Buried in settings it would be the
 * same as no control at all, and an app that makes noise you cannot stop is an
 * app people close.
 *
 * It renders muted until the effect runs, rather than guessing. The stored
 * preference lives in localStorage and the server has no idea what it says, so
 * assuming "on" during hydration would flash the wrong icon at exactly the
 * people who already told us no.
 */
export function SoundToggle() {
  const [muted, setLocal] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocal(isMuted());
    setReady(true);
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setLocal(next);
    // Turning it on plays the sound it turned on — the only honest way to
    // answer "what does this do?". Turning it off is silent, obviously.
    if (!next) playCue("select");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      // Named for the setting, not the icon: a screen reader saying "volume
      // image" tells nobody what pressing it does.
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      className="flex size-11 items-center justify-center rounded-full text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
    >
      {/* Until the preference is read, neither icon is known to be right, so
          neither is drawn — the button keeps its space and does not flicker. */}
      {ready &&
        (muted ? (
          <VolumeXIcon className="size-[18px]" aria-hidden />
        ) : (
          <Volume2Icon className="size-[18px]" aria-hidden />
        ))}
    </button>
  );
}
