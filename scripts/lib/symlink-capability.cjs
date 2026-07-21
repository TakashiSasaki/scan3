const ALLOWED_SYMLINK_ERRORS = Object.freeze(new Set(['EPERM', 'ENOSYS', 'EINVAL', 'EACCES']));

function isCapabilityLimitedSymlinkError(error) {
  return Boolean(error && error.code && ALLOWED_SYMLINK_ERRORS.has(error.code));
}

module.exports = {
  ALLOWED_SYMLINK_ERRORS,
  isCapabilityLimitedSymlinkError
};
