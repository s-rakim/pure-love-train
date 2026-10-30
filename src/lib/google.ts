import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

/**
 * Shows Google's account picker and returns an ID token the sync server can
 * check, or null if the person backed out.
 */
export async function googleIdToken(webClientId: string): Promise<string | null> {
  GoogleSignin.configure({ webClientId });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Start fresh each time so the account picker always shows.
    await GoogleSignin.signOut().catch(() => {});
    const result = await GoogleSignin.signIn();
    if (isCancelledResponse(result)) return null;
    if (!result.data.idToken) throw new Error('Google did not hand back a sign-in token. Try again.');
    return result.data.idToken;
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play services are needed to sign in.');
      // Google answers DEVELOPER_ERROR (10) when the app's signing key isn't registered.
      if (err.code === '10') {
        throw new Error("Google doesn't recognise this copy of the app yet. Check the Android OAuth client's package name and SHA-1.");
      }
    }
    throw err;
  }
}
