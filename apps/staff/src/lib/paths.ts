export const paths = {
  home: "/kyc",
  signIn: "/sign-in",
  twoStep: "/two-step",
  notStaff: "/not-staff",
} as const;

// For navigating after the user signs in, verifies a code or signs out. A full
// page load drops the router's cache, which holds pages fetched in the previous
// sign-in state.
export function reloadTo(path: string) {
  window.location.replace(path);
}
