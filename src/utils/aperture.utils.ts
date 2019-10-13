import { sign } from 'jsonwebtoken'

export const signApertureToken = (portalId: string) => sign({ id: portalId }, process.env.APERTURE_WS_KEY, { expiresIn: '1m' })