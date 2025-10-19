import { useAuth } from "react-oidc-context";

export async function saveRoleAndProceed(auth, role) {
  // TODO: Write to Cognito (custom attribute) via backend or Amplify
  // Example: await Auth.updateUserAttributes(await Auth.currentAuthenticatedUser(), { "custom:appRole": role });
  // After update, refresh tokens so new claim/attribute is in ID token
  await auth.removeUser();
  await auth.signinRedirect();
}
