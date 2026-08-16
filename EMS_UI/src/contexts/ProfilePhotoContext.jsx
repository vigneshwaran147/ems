// ems_frontend/src/contexts/ProfilePhotoContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { userAPI } from '../api/userAPI'
import { profilePhotoUpdated } from '../store/slices/userSlice'

/** Mirrors LocalProfilePhotoStorageService — rejected here so the user is told
 *  before a 5 MB upload travels to the server only to bounce. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

const ProfilePhotoContext = createContext(null)

/**
 * One fetch of the signed-in user's photo, shared by every avatar on screen.
 *
 * The photo endpoint is Bearer-authenticated, so it cannot be used as a bare
 * `<img src>` — a browser sends no Authorization header and the request comes
 * back 401, which is why the sidebar and app-bar avatars silently fell back to
 * initials. The bytes are fetched once here and handed round as an object URL.
 */
export const ProfilePhotoProvider = ({ children }) => {
  const dispatch = useDispatch()
  const profile = useSelector((state) => state.user.profile)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  // `profilePhotoUrl` is a fixed path rather than a per-image address, so
  // replacing a photo leaves it byte-identical. This counter is what tells the
  // effect to go back for the new bytes.
  const [version, setVersion] = useState(0)

  const hasPhoto = Boolean(profile?.profilePhotoUrl)
  const objectUrlRef = useRef(null)

  // Revoking the old URL only once the new one is in hand: revoking up front
  // would blank every avatar for the length of the round trip.
  const applyObjectUrl = useCallback((next) => {
    if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = next
    setPhotoUrl(next)
  }, [])

  useEffect(() => {
    if (!hasPhoto) {
      applyObjectUrl(null)
      return undefined
    }

    let cancelled = false
    userAPI.getProfilePhoto()
      .then((res) => {
        if (!cancelled) applyObjectUrl(window.URL.createObjectURL(res.data))
      })
      .catch((err) => console.error('Failed to load profile photo:', err))

    return () => {
      cancelled = true
    }
  }, [hasPhoto, version, applyObjectUrl])

  useEffect(
    () => () => {
      if (objectUrlRef.current) window.URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  const uploadPhoto = useCallback(
    async (file) => {
      if (!file) return false

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Choose a JPG, PNG or WebP image.')
        return false
      }
      if (file.size > MAX_BYTES) {
        setError('That image is larger than 5 MB. Choose a smaller one.')
        return false
      }

      setUploading(true)
      setError('')
      try {
        const res = await userAPI.uploadProfilePhoto(file)
        // Replaces the cached profile without raising the form's "profile
        // updated" banner — the photo saves on its own.
        dispatch(profilePhotoUpdated(res.data.data))
        setVersion((current) => current + 1)
        return true
      } catch (err) {
        console.error('Failed to upload profile photo:', err)
        setError(err?.response?.data?.message || 'Could not upload that photo. Please try again.')
        return false
      } finally {
        setUploading(false)
      }
    },
    [dispatch]
  )

  const value = useMemo(
    () => ({ photoUrl, uploading, error, uploadPhoto, clearError: () => setError('') }),
    [photoUrl, uploading, error, uploadPhoto]
  )

  return <ProfilePhotoContext.Provider value={value}>{children}</ProfilePhotoContext.Provider>
}

ProfilePhotoProvider.propTypes = {
  children: PropTypes.node,
}

export const useProfilePhoto = () => {
  const context = useContext(ProfilePhotoContext)
  if (!context) {
    throw new Error('useProfilePhoto must be used inside a ProfilePhotoProvider')
  }
  return context
}
