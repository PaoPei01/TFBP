export const appVersion = import.meta.env.VITE_APP_VERSION || '0.1.0';
export const gitCommitSha = import.meta.env.VITE_GIT_COMMIT_SHA || 'local';
export const shortGitCommitSha = gitCommitSha === 'local' ? 'local' : gitCommitSha.slice(0, 7);
export const buildTime = import.meta.env.VITE_BUILD_TIME || 'local-dev';

export const buildLabel = `Build: ${shortGitCommitSha} · ${buildTime}`;
