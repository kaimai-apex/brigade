/**
 * Ask the browser password manager (e.g. Google Passwords) to store credentials
 * after a successful signup/login. No-ops when unsupported.
 */
export async function offerPasswordSave(email: string, password: string) {
  try {
    if (typeof window === "undefined") return;
    if (!("credentials" in navigator)) return;

    const PasswordCredentialCtor = (
      window as Window & {
        PasswordCredential?: new (data: {
          id: string;
          password: string;
          name?: string;
        }) => Credential;
      }
    ).PasswordCredential;

    if (!PasswordCredentialCtor) return;

    const credential = new PasswordCredentialCtor({
      id: email,
      password,
      name: email,
    });
    await navigator.credentials.store(credential);
  } catch {
    // Browser declined or unsupported — ignore.
  }
}
