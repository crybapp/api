import { sign, SignOptions, verify } from 'jsonwebtoken'

import intformat from 'biguint-format'
import FlakeId from 'flake-idgen'

const flake = new FlakeId({
	epoch: new Date(2019, 7, 31)
})

export const generateFlake = () => intformat(flake.next(), 'dec')

export const signToken = (data: any, headers: SignOptions = { }) => new Promise<string>((resolve, reject) => {
	try {
		const token = sign(data, process.env.JWT_KEY, headers)

		resolve(token)
	} catch (error) {
		console.error(error)

		reject(error)
	}
})

export const verifyToken = (token: string) => new Promise<any>((resolve, reject) => {
	try {
		const data = verify(token, process.env.JWT_KEY)

		resolve(data)
	} catch (error) {
		console.error(error)

		reject(error)
	}
})
