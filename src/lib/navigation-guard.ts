export const navigationGuard = {
  _dirty: false,
  setDirty(v: boolean) { this._dirty = v },
  isDirty() { return this._dirty },
  confirm() {
    if (!this._dirty) return true
    return window.confirm('You have unsaved changes. Leave anyway?')
  },
}
