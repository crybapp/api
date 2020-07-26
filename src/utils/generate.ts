import { sign, SignOptions, verify } from 'jsonwebtoken'

import intformat from 'biguint-format'
import FlakeId from 'flake-idgen'

const flake = new FlakeId({ epoch: new Date(2019, 7, 31) })

export const generateFlake = () => intformat(flake.next(), 'dec')

export const signToken = (data: any, headers: SignOptions = {}) => sign(data, process.env.JWT_KEY, headers)

export const verifyToken = (token: string) => verify(token, process.env.JWT_KEY)
