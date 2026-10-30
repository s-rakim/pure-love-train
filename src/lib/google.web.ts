/** Google sign-in runs through the Android app; the browser preview can't do it. */
export async function googleIdToken(_webClientId: string): Promise<string | null> {
  throw new Error('Google sign-in works in the phone app.');
}
