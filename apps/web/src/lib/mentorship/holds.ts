/**
 * How long a slot is held while somebody pays for it.
 *
 * Its own module because both the server (which enforces the windows) and the
 * booking panel (which promises the mentee a number of minutes) need these, and
 * the server module cannot be imported from a client component — it pulls in a
 * database driver.
 */

/**
 * How long a Stripe Checkout Session stays payable. Stripe's own minimum is 30
 * minutes, so this cannot go lower.
 */
export const CHECKOUT_WINDOW_MINUTES = 30;

/**
 * How long Brigade holds the slot. Deliberately LONGER than the checkout
 * window.
 *
 * If these were equal, a payment completing in the last second of the window
 * could race the reaper: the mentee is charged, the reaper cancels the hold a
 * moment later, and the webhook then finds nothing in `pending_payment` to
 * confirm. The gap means Stripe has always given up on a session well before
 * Brigade releases its slot.
 */
export const HOLD_WINDOW_MINUTES = 45;
