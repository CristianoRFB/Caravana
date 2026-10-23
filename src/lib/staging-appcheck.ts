type Environment = Record<string, string | undefined>;
type Runtime = { hostname?: string; projectId?: string; emulators: boolean; development: boolean; debugToken?: unknown };

/** Public site key only. No debug/custom provider, production target or fallback. */
export function stagingAppCheckSiteKey(env: Environment, runtime: Runtime): string | null {
  const enabled = env.VITE_STAGING_APPCHECK_ENABLED;
  const key = env.VITE_STAGING_APPCHECK_SITE_KEY;
  if (enabled !== undefined && enabled !== "" && enabled !== "false" && enabled !== "true") {
    throw new Error("Invalid staging App Check activation flag.");
  }
  if (enabled !== "true") {
    if (key) throw new Error("Staging App Check site key requires explicit activation.");
    return null;
  }
  if (env.VITE_APP_ENV !== "staging" || runtime.projectId !== "bdall-e3585"
      || runtime.hostname !== "caravana77-staging.pages.dev" || runtime.emulators || runtime.development) {
    throw new Error("App Check preparation is restricted to the canonical isolated staging.");
  }
  if (runtime.debugToken !== undefined && runtime.debugToken !== false) {
    throw new Error("App Check debug bypass is not allowed in remote staging.");
  }
  if (typeof key !== "string" || !/^6[A-Za-z0-9_-]{19,199}$/.test(key)) {
    throw new Error("A public reCAPTCHA Enterprise site key is required.");
  }
  return key;
}

export function stagingAppCheckCspSources(enabled: boolean) {
  return enabled ? {
    script: " https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    connect: " https://firebaseappcheck.googleapis.com https://recaptchaenterprise.googleapis.com https://www.google.com/recaptcha/",
    frame: " https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  } : { script: "", connect: "", frame: "" };
}
