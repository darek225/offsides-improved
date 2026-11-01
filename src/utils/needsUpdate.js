import semver from 'semver';
import { version as currentVersion } from '../../package.json';
/**
 * Finds out if the user is running the latest version of Offsides+.
 * Checks the latest GitHub release of the Offsides+ repo
 * (darek225/offsides-improved). The original Offsides update feed
 * pointed at upstream builds, which would have "updated" fork users
 * back to the unmaintained app.
 * @returns {Boolean|Object} false when up to date, otherwise
 * { latestVersion, changelog } for the newer release.
 */
export default async function needsUpdate() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/darek225/offsides-improved/releases/latest`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!res.ok) return false;
    const json = await res.json();
    const latest = (json.tag_name || '').replace(/^v/, '');
    if (latest && semver.gt(latest, currentVersion)) {
      return {
        latestVersion: latest,
        changelog: json.body ? String(json.body).slice(0, 600) : null,
      };
    }
    return false;
  } catch {
    return false;
  }
}
