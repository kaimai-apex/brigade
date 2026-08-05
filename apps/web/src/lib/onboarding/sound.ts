/**
 * The sound onboarding makes.
 *
 * Every cue is synthesised here rather than loaded as a file. Six audio assets
 * would be six requests on the slowest screen a new member ever sees, and a
 * kitchen phone on hotel wifi is exactly the case where a 40KB "ding" arrives
 * after the tap that asked for it. An oscillator is instant and weighs nothing.
 *
 * The cues are one instrument, not six noises: every note is drawn from one
 * A-major pentatonic set, so answering, going back and finishing sound like
 * parts of the same thing no matter what order they happen in. Nothing here is
 * louder than a keyboard.
 *
 * Sound is on by default and the toggle sits in the onboarding header, because
 * a mute control nobody can find is the same as no mute control. The preference
 * survives a reload; someone who turns it off once has turned it off.
 */

export const SOUND_STORAGE_KEY = "brigade:onboarding-sound";

/** A-major pentatonic. Any two of these together are consonant, which is why
 *  cues can overlap when someone answers quickly without turning to mush. */
const A4 = 440;
const CS5 = 554.37;
const E5 = 659.25;
const FS5 = 739.99;
const A5 = 880;
const CS6 = 1108.73;

interface Note {
  /** Hz. */
  frequency: number;
  /** Seconds from the start of the cue. */
  at: number;
  /** Seconds. Short is the point — these are punctuation, not music. */
  duration: number;
  /** Relative to the master gain, which is already quiet. */
  gain: number;
  type?: OscillatorType;
}

export type CueName =
  /** An option was chosen. */
  | "select"
  /** A chosen option was un-chosen. */
  | "deselect"
  /** Moved forward a step. */
  | "advance"
  /** Moved back a step. */
  | "back"
  /** Finished a section of the flow. */
  | "milestone"
  /** Finished the whole thing. */
  | "complete"
  /** The action was refused — a selection cap, usually. */
  | "blocked";

/**
 * The cues, as data.
 *
 * Rising means forward and falling means back, consistently, so the sound is
 * information rather than decoration — someone answering with the screen at
 * arm's length still knows which way they just went.
 */
const CUES: Record<CueName, Note[]> = {
  select: [{ frequency: E5, at: 0, duration: 0.08, gain: 0.5 }],
  deselect: [{ frequency: A4, at: 0, duration: 0.07, gain: 0.32 }],
  advance: [
    { frequency: E5, at: 0, duration: 0.07, gain: 0.42 },
    { frequency: A5, at: 0.055, duration: 0.12, gain: 0.5 },
  ],
  back: [
    { frequency: E5, at: 0, duration: 0.06, gain: 0.3 },
    { frequency: A4, at: 0.05, duration: 0.1, gain: 0.34 },
  ],
  milestone: [
    { frequency: A4, at: 0, duration: 0.1, gain: 0.42 },
    { frequency: CS5, at: 0.07, duration: 0.1, gain: 0.44 },
    { frequency: E5, at: 0.14, duration: 0.14, gain: 0.46 },
    { frequency: A5, at: 0.21, duration: 0.26, gain: 0.5 },
  ],
  complete: [
    { frequency: A4, at: 0, duration: 0.12, gain: 0.42 },
    { frequency: CS5, at: 0.08, duration: 0.12, gain: 0.44 },
    { frequency: E5, at: 0.16, duration: 0.14, gain: 0.46 },
    { frequency: FS5, at: 0.24, duration: 0.16, gain: 0.46 },
    { frequency: A5, at: 0.32, duration: 0.5, gain: 0.52 },
    { frequency: CS6, at: 0.34, duration: 0.5, gain: 0.24, type: "sine" },
  ],
  // Deliberately not a buzzer. Being told "that is the tenth of eight" should
  // not feel like being told off.
  blocked: [
    { frequency: A4, at: 0, duration: 0.05, gain: 0.26, type: "sine" },
    { frequency: A4, at: 0.09, duration: 0.05, gain: 0.22, type: "sine" },
  ],
};

/** The notes a cue plays. Exported so the shape can be asserted without audio. */
export function cueNotes(name: CueName): readonly Note[] {
  return CUES[name];
}

let context: AudioContext | null = null;
let master: GainNode | null = null;

/**
 * The audio graph, built on the first cue rather than on import.
 *
 * Browsers refuse to start an AudioContext outside a user gesture, and every
 * cue here is caused by one, so building it lazily means it is always allowed.
 * Constructing one at module load would leave a permanently suspended context
 * on every page that imports this.
 */
function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;

  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
    master = context.createGain();
    // The ceiling for everything. Cue gains are relative to this.
    master.gain.value = 0.09;
    master.connect(context.destination);
  }

  if (!context || !master) return null;
  // Safari suspends the context when the tab is backgrounded and does not
  // resume it on its own.
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master };
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === "off";
  } catch {
    // Private mode, or storage blocked. Sound still works, it just will not
    // be remembered — which is better than throwing on a tap.
    return false;
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, muted ? "off" : "on");
  } catch {
    // See above.
  }
}

/**
 * Play a cue. Silently does nothing when muted, unsupported, or server-side —
 * callers should never have to ask whether sound is available.
 */
export function playCue(name: CueName): void {
  if (isMuted()) return;
  const graph = audio();
  if (!graph) return;

  const { ctx, out } = graph;
  const start = ctx.currentTime;

  for (const note of CUES[name]) {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = note.type ?? "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, start + note.at);

    // An attack of a few milliseconds instead of an instant one: a square edge
    // on a gain node is an audible click, and a click on every tap is the
    // thing that makes people mute an app.
    const attack = 0.008;
    const at = start + note.at;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(note.gain, at + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);

    oscillator.connect(envelope);
    envelope.connect(out);
    oscillator.start(at);
    oscillator.stop(at + note.duration + 0.02);
    // Nodes are single-use; letting them go keeps a long flow from accumulating
    // hundreds of dead oscillators.
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
}
